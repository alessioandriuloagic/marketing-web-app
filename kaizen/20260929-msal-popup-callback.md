# Keep the MSAL callback out of the app bootstrap

**Date**: 2026-09-29 | **Context**: Fabric Data Agent chat Entra authentication

## What happened
The configured SPA redirect returned to the app's root page, which loaded the full app in MSAL's popup and produced `block_nested_popups`.

## Why it was wrong
An OAuth popup callback must process the response, not start app authentication again. A successful Rayfin deploy does not validate interactive MSAL flows.

## What to do instead
Route Entra responses at the registered origin through MSAL's redirect bridge before loading the app. Keep normal page loads unchanged and check both popup and silent callbacks.
