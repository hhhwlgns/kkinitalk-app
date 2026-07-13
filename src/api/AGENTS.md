<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# api

## Purpose
Placeholder HTTP client layer for a future real backend. Not currently used by any screen — all app data flows through the mock DB (`../mocks/db/`) instead. Exists so MSW has something to intercept during smoke tests (`scripts/smoke-msw.ts`) and so the eventual real-backend migration has a starting point.

## Key Files
| File | Description |
|------|-------------|
| `client.ts` | `apiClient = axios.create(...)` with `baseURL` from `EXPO_PUBLIC_API_BASE_URL` (default `https://kkinitalk.local/api/v1`) and a 10s timeout |

## Subdirectories
`endpoints/` exists but is currently empty — skipped (no AGENTS.md) until it contains files.

## For AI Agents

### Working In This Directory
- Do not assume `apiClient` is wired into any screen — grep for `apiClient` usage before changing its shape; as of now only `scripts/smoke-msw.ts` calls it directly.
- When real backend integration begins, endpoints should live under `endpoints/` (empty today) as thin wrappers around `apiClient`, mirroring the shapes already defined in `../domain/types.ts`.

### Testing Requirements
- `npm run smoke:msw` verifies `apiClient` correctly round-trips through the MSW mock server (`GET /_ping`).

### Common Patterns
- Base URL is environment-driven (`EXPO_PUBLIC_*` — Expo's public env var convention) rather than hardcoded, even though only one placeholder default exists today.

## Dependencies

### Internal
- None yet — not consumed elsewhere in the app.

### External
- `axios`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
