"""Calls the Fabric Data Agent's MCP endpoint using a service-principal token.

Mirrors the flow documented at
https://learn.microsoft.com/fabric/data-science/data-agent-mcp-server#connect-from-python,
using ClientSecretCredential (client-credentials flow) instead of an
interactive AzureCliCredential since this runs unattended as a backend service.
"""

from functools import lru_cache

from azure.identity import ClientSecretCredential
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from .config import get_settings

_FABRIC_SCOPE = "https://api.fabric.microsoft.com/.default"


@lru_cache
def _get_credential() -> ClientSecretCredential:
    settings = get_settings()
    return ClientSecretCredential(
        tenant_id=settings.fabric_tenant_id,
        client_id=settings.fabric_client_id,
        client_secret=settings.fabric_client_secret,
    )


def _get_auth_headers() -> dict[str, str]:
    token = _get_credential().get_token(_FABRIC_SCOPE)
    return {"Authorization": f"Bearer {token.token}"}


async def ask_data_agent(prompt: str) -> str:
    settings = get_settings()
    headers = _get_auth_headers()

    async with streamablehttp_client(settings.mcp_url, headers=headers) as (
        read,
        write,
        _,
    ):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            if not tools.tools:
                raise RuntimeError("The Data Agent MCP server exposed no tools.")

            tool = tools.tools[0]
            properties = (tool.inputSchema or {}).get("properties", {})
            if not properties:
                raise RuntimeError(
                    f"Tool '{tool.name}' has no arguments in its input schema."
                )
            question_arg = next(iter(properties))

            result = await session.call_tool(tool.name, {question_arg: prompt})

            text_parts = [
                block.text for block in result.content if hasattr(block, "text")
            ]
            return "\n".join(text_parts).strip()
