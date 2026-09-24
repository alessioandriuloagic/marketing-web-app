import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  askDataAgentOverMcp,
  buildMcpUrl,
  composePrompt,
  extractText,
} from '../services/dataAgentMcp';

const COORDS = { workspaceId: 'ws-1', dataAgentId: 'agent-1' };

/** Distinct per test so the module-level tool cache never leaks between cases. */
function coords(suffix: string) {
  return { workspaceId: `ws-${suffix}`, dataAgentId: `agent-${suffix}` };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

const TOOLS_RESULT = {
  result: {
    tools: [
      {
        name: 'DataAgent_da_IP',
        inputSchema: { properties: { userQuestion: { type: 'string' } } },
      },
    ],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildMcpUrl', () => {
  it('targets the published data agent MCP endpoint', () => {
    expect(buildMcpUrl(COORDS)).toBe(
      'https://api.fabric.microsoft.com/v1/mcp/workspaces/ws-1/dataagents/agent-1/agent'
    );
  });
});

describe('composePrompt', () => {
  it('sends the bare question when there is no history', () => {
    expect(composePrompt('How many emails?', [])).toBe('How many emails?');
  });

  it('inlines prior turns because the agent is stateless per call', () => {
    const prompt = composePrompt('And last month?', [
      { role: 'user', content: 'How many emails?' },
      { role: 'assistant', content: '137,361' },
    ]);
    expect(prompt).toContain('User: How many emails?');
    expect(prompt).toContain('Assistant: 137,361');
    expect(prompt).toContain('Answer this new question: And last month?');
  });
});

describe('extractText', () => {
  it('keeps only text blocks', () => {
    expect(
      extractText([
        { type: 'text', text: 'first' },
        { type: 'image', data: 'ignored' },
        { type: 'text', text: 'second' },
      ])
    ).toBe('first\nsecond');
  });

  it('tolerates a non-array payload', () => {
    expect(extractText(undefined)).toBe('');
  });
});

describe('askDataAgentOverMcp', () => {
  it('discovers the tool then calls it with the declared argument name', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOOLS_RESULT))
      .mockResolvedValueOnce(
        jsonResponse({ result: { content: [{ type: 'text', text: '137,361' }] } })
      );
    vi.stubGlobal('fetch', fetchMock);

    const reply = await askDataAgentOverMcp(coords('a'), 'token-abc', 'How many?');

    expect(reply).toEqual({ answer: '137,361', toolName: 'DataAgent_da_IP' });

    const callBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(callBody.method).toBe('tools/call');
    expect(callBody.params).toEqual({
      name: 'DataAgent_da_IP',
      arguments: { userQuestion: 'How many?' },
    });

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer token-abc');
  });

  it('surfaces a tool-reported error as a rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(TOOLS_RESULT))
        .mockResolvedValueOnce(
          jsonResponse({
            result: {
              isError: true,
              content: [{ type: 'text', text: 'Dataset unavailable' }],
            },
          })
        )
    );

    await expect(
      askDataAgentOverMcp(coords('b'), 'token', 'How many?')
    ).rejects.toThrow('Dataset unavailable');
  });

  it('surfaces a JSON-RPC error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        jsonResponse({ error: { code: -32000, message: 'Forbidden' } })
      )
    );

    await expect(
      askDataAgentOverMcp(coords('c'), 'token', 'How many?')
    ).rejects.toThrow('Forbidden');
  });

  it('surfaces a transport-level failure with the HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse({ message: 'nope' }, 403))
    );

    await expect(
      askDataAgentOverMcp(coords('d'), 'token', 'How many?')
    ).rejects.toThrow('HTTP 403');
  });

  it('fails clearly when the agent publishes no tools', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse({ result: { tools: [] } }))
    );

    await expect(
      askDataAgentOverMcp(coords('e'), 'token', 'How many?')
    ).rejects.toThrow('exposed no tools');
  });
});
