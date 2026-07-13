<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# app

## Purpose
Expo Router file-based route tree. Contains the root layout/providers, the initial role-selection screen, and two parallel screen trees split by user role (`elderly/`, `guardian/`). Routing is entirely file-based — file and folder names under this directory map directly to URL paths.

## Key Files
| File | Description |
|------|-------------|
| `_layout.tsx` | Root layout: sets up `QueryClientProvider`, `SafeAreaProvider`, `RoleProvider`, `ConsentProvider`; loads Pretendard fonts; in `__DEV__` enables MSW mocking and seeds the mock DB before rendering the `Stack` |
| `index.tsx` | Role selection screen — reads existing role via `useRole()` and auto-redirects returning users (elderly → onboarding or home depending on `elderlyOnboardingDoneKey`; guardian → `/guardian/home`); otherwise lets the user pick a role and calls `setRole` |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `elderly/` | Screens and tabs for the elderly (어르신) role (see `elderly/AGENTS.md`) |
| `guardian/` | Screens and tabs for the guardian (보호자) role (see `guardian/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Read the versioned Expo Router docs (https://docs.expo.dev/versions/v57.0.0/) before adding/renaming routes — file-based routing conventions may differ from older Expo Router versions.
- `_layout.tsx` wraps every screen in the app; changes here (provider order, font loading, mock seeding) affect both role trees. Test both `elderly/` and `guardian/` flows after touching it.
- New routes must be added under `elderly/` or `guardian/`, matching the existing per-role split — do not add role-agnostic screens directly under `app/` besides `index.tsx`.

### Testing Requirements
- No route-level automated tests exist. Manually verify navigation via `expo start` and by running the relevant `npm run smoke:*` script if the route touches mock DB data or domain logic.

### Common Patterns
- Screens read the active role/user via `useRole()` from `src/state/RoleContext` and derive `userId`/`guardianUserId` with a fallback literal (`'elderly-self'` / `'guardian-self'`) when no `activeUserId` is set.
- Navigation uses `expo-router`'s `router.push`/`router.replace`, not `<Link>`.

## Dependencies

### Internal
- `../src/state/RoleContext`, `../src/state/ConsentContext` — global providers wired in `_layout.tsx`
- `../src/mocks/setup.native`, `../src/mocks/db/seed` — dev-only mocking bootstrapped in `_layout.tsx`

### External
- `expo-router` — file-based routing (`Stack`)
- `expo-font` — Pretendard font loading
- `react-native-safe-area-context` — `SafeAreaProvider`
- `@tanstack/react-query` — `QueryClient` (configured, not yet consumed by screens)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
