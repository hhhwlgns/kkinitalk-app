<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# handlers

## Purpose
MSW (`msw/native`) request handlers. Currently a single placeholder handler proving the mock server intercepts requests from `../../api/client.ts`'s axios instance — there is no real handler set yet since no screen calls the API client.

## Key Files
| File | Description |
|------|-------------|
| `index.ts` | `pingHandler = http.get('*/api/v1/_ping', ...)` returning `{ ok: true, source: 'msw-native' }`; exports `handlers = [pingHandler]`, consumed by `../setup.native.ts`'s `setupServer(...handlers)` |

## For AI Agents

### Working In This Directory
- When real backend endpoints are eventually added under `../../api/endpoints/` (currently empty), add a matching handler here so `EXPO_PUBLIC_USE_MOCKS`-gated development keeps working without a live backend — keep the same `http.get`/`http.post` + `HttpResponse.json(...)` pattern as `pingHandler`.
- Handler URL patterns use a leading `*` wildcard (`*/api/v1/_ping`) so they match regardless of the configured `baseURL` in `../../api/client.ts` — keep this convention for new handlers rather than hardcoding a full origin.

### Testing Requirements
- `npm run smoke:msw` exercises this handler end-to-end via `apiClient.get('/_ping')`.

### Common Patterns
- One handler per exported `const`, all collected into a single `handlers` array — keep new handlers additive to that array rather than restructuring it.

## Dependencies

### Internal
- None yet.

### External
- `msw`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
