import { describe, expect, it } from 'vitest';

import { isMsalCallback } from '../services/isMsalCallback';

describe('isMsalCallback', () => {
  it.each([
    'https://app.example.com/#code=abc&state=xyz',
    'https://app.example.com/#error=access_denied&state=xyz',
    'https://app.example.com/?code=abc&state=xyz',
    'https://app.example.com/?error=access_denied&state=xyz',
  ])('recognizes an Entra response at %s', (href) => {
    expect(isMsalCallback(new URL(href))).toBe(true);
  });

  it.each([
    'https://app.example.com/',
    'https://app.example.com/chat',
    'https://app.example.com/#/chat',
    'https://app.example.com/#code=abc',
    'https://app.example.com/?state=xyz',
  ])('loads the app normally at %s', (href) => {
    expect(isMsalCallback(new URL(href))).toBe(false);
  });
});
