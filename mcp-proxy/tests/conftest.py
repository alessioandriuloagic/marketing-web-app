import os

# Populate required settings before any test imports app.config, since
# get_settings() is evaluated at import time in app.main.
os.environ.setdefault("FABRIC_TENANT_ID", "test-tenant")
os.environ.setdefault("FABRIC_CLIENT_ID", "test-client")
os.environ.setdefault("FABRIC_CLIENT_SECRET", "test-secret")
os.environ.setdefault("RAYFIN_JWKS_URL", "https://example.invalid/auth/jwks")
os.environ.setdefault("ALLOWED_ORIGIN", "http://localhost:5173")
