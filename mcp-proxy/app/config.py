from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Service principal used to call the Fabric Data Agent MCP endpoint.
    fabric_tenant_id: str
    fabric_client_id: str
    fabric_client_secret: str

    # Target Data Agent, provided by AGIC for the "AGIC IP MARKETING - AGENT" workspace.
    fabric_workspace_id: str = "f67f0cf4-b2c5-410e-b733-3b5c25b83ffd"
    fabric_data_agent_id: str = "c4a26507-3d2d-4f2f-9591-c88a013a1f22"

    # Rayfin app backend used to verify the caller's session JWT.
    # Example: https://<your-app>-app.rayfin.windows.net/auth/jwks
    rayfin_jwks_url: str
    rayfin_issuer: str | None = None
    rayfin_audience: str | None = None

    # CORS: the origin the deployed Fabric App is served from.
    allowed_origin: str = "http://localhost:5173"

    @property
    def mcp_url(self) -> str:
        return (
            "https://api.fabric.microsoft.com/v1/mcp/workspaces/"
            f"{self.fabric_workspace_id}/dataagents/{self.fabric_data_agent_id}/agent"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
