# Verify Entra configuration before Rayfin deployment

**Date**: 2026-09-28 | **Context**: Fabric data agent chat deployment

## What happened
Rayfin deployed the frontend successfully, but the chat failed because `VITE_ENTRA_CLIENT_ID` was empty in the Vite build.

## Why it was wrong
`rayfin up status` verifies infrastructure, not whether required client-side configuration was embedded in the bundle.

## What to do instead
Before deployment, check required Vite variables and the Entra SPA registration's redirect URI. After deploying, verify the built bundle includes the configured client ID and check the Fabric item status.
