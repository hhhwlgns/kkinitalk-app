<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# src

## Purpose
All non-route application code: domain types/logic, the AsyncStorage-backed mock backend, global state (React Context), design tokens, and shared UI components. Consumed exclusively by screens under `app/`.

## Key Files
None at this level — this directory only contains subdirectories.

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `api/` | Axios HTTP client placeholder for a future real backend (see `api/AGENTS.md`) |
| `components/` | Shared presentational components used across both role trees (see `components/AGENTS.md`) |
| `domain/` | Framework-agnostic domain types and pure business logic (see `domain/AGENTS.md`) |
| `mocks/` | Mock "backend": MSW handlers, AsyncStorage-backed mock DB, and mock nutrition-analysis logic (see `mocks/AGENTS.md`) |
| `state/` | Global React Context providers (role, consent) (see `state/AGENTS.md`) |
| `theme/` | Design token definitions (colors, spacing, fonts, etc.) (see `theme/AGENTS.md`) |

`src/hooks/` and `src/api/endpoints/` exist but are currently empty — skipped (no AGENTS.md) until they contain files.

## For AI Agents

### Working In This Directory
- Everything here must stay React Native / Expo compatible — no Node-only or web-only APIs (this directory is also compiled by `tsconfig.smoke.json` for smoke tests, which runs under plain Node, so avoid RN-only imports in `domain/` and `mocks/` specifically).
- Prefer adding new pure logic to `domain/` and keeping React state/UI concerns in `state/`/`components/` — this split is deliberate and used by the smoke tests (`tsconfig.smoke.json` only includes `src/mocks/**`, `src/api/**`, `src/domain/**`, not `src/components/` or `src/state/`).

### Testing Requirements
- `domain/`, `mocks/`, and `api/` are exercised by `npm run smoke:*` scripts in `scripts/`. `components/` and `state/` currently have no automated coverage — verify manually via the Expo app.

### Common Patterns
- Domain types live centrally in `domain/types.ts`; import types from there rather than redefining shapes in screens or components.
- Mock persistence always goes through the `Collection<T>` interface in `mocks/db/store.ts`, keyed by `kkinitalk:db:<name>` in AsyncStorage.

## Dependencies

### Internal
- Consumed by every screen under `../app/`

### External
- `@react-native-async-storage/async-storage`, `msw`, `axios`, `react-native-svg` — see root `AGENTS.md` for the full list

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
