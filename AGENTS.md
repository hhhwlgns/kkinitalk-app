<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# kkinitalk-app (끼니톡)

## Purpose
Expo/React Native app for AI-assisted meal and medication management targeting elderly users living alone and their family guardians. Elderly users speak/photograph their way through onboarding, daily check-ins, and meal logging; a mock "AI" layer analyzes photographed meals for nutrition and flags conflicts with medications/conditions; guardians get a read-only dashboard with alerts and a weekly report. See `끼니톡 prd.md` for full Korean product spec (goals, personas, risk/disclaimer language). Backend is fully mocked today (AsyncStorage + MSW) — no real API integration yet.

## Key Files
| File | Description |
|------|-------------|
| `app.json` | Expo config: app name 끼니톡, slug `kkinitalk-app`, scheme `kkinitalk`, plugins (expo-router, expo-image-picker, expo-notifications) |
| `package.json` | Dependencies (Expo ~57.0.4, React Native 0.86.0, React 19.2.3, @tanstack/react-query, msw) and `smoke:*` scripts |
| `tsconfig.json` | Extends `expo/tsconfig.base` with `strict: true` |
| `tsconfig.smoke.json` | Separate compiler config (CommonJS, `node10` resolution) used only to compile smoke-test scripts to `.smoke-tmp/` |
| `끼니톡 prd.md` | Korean-language product requirements doc — product goals, personas, scenarios, and mandatory medical-disclaimer language |
| `LICENSE` | Project license |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `app/` | Expo Router file-based routes — screens for both roles (see `app/AGENTS.md`) |
| `src/` | Application source: domain logic, mock backend, state, theme, components (see `src/AGENTS.md`) |
| `scripts/` | Custom smoke-test runners invoked via `npm run smoke:*` (see `scripts/AGENTS.md`) |
| `assets/` | Static app icons, splash image, and Pretendard font files (no AGENTS.md — static binary assets only) |

## For AI Agents

### Working In This Directory
- **Expo HAS CHANGED**: read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any Expo/Router code — do not rely on older Expo knowledge/training data, APIs have moved.
- Today's date for this project context is 2026-07-13.
- This app has two parallel route trees (`app/elderly/`, `app/guardian/`) driven by a single `Role` (`elderly` | `guardian`) stored via `RoleContext`. Always check which role a screen belongs to before copying patterns across trees.
- All persistence currently goes through the mock DB (`src/mocks/db/`), not `src/api/`. `src/api/client.ts` and `src/api/endpoints/` are placeholders for a real backend that does not exist yet — do not assume live network calls work.
- UI strings are Korean. Preserve existing tone/phrasing conventions (formal, warm, elder-friendly) when adding new user-facing text.
- This is not a medical device. Any new nutrition/medication-conflict feature must keep the "참고용" (reference only) framing and route users to 119/의료진 for real emergencies, per `DisclaimerBanner`.

### Testing Requirements
- There is no Jest/standard test runner. Verification is via `npm run smoke:<name>` scripts in `scripts/`, each compiling through `tsconfig.smoke.json` then running a `.cjs` runner against the compiled output, then deleting `.smoke-tmp/`.
- Available smoke suites: `msw`, `db`, `onboarding`, `checkin`, `meal`, `suggestion`, `medication`, `history`, `profile`, `guardian`, `consent`.
- When changing mock DB collections, domain logic (`src/domain/`), or MSW setup, run the relevant `smoke:*` script(s) before considering the change done.

### Common Patterns
- Design tokens (`src/theme/tokens.ts`) are used for all styling — never hardcode colors/spacing/fonts in screens.
- Icons are inline `react-native-svg` components defined locally per-screen or per-component, not from an icon library.
- Screens query mock DB collections directly inside `useFocusEffect`/`useCallback` `load()` functions rather than through React Query — `@tanstack/react-query`'s `QueryClientProvider` is wired at the root but not yet used by any screen.

## Dependencies

### Internal
- `app/` depends on `src/` for state, mock DB, domain helpers, theme, and shared components.

### External
- `expo` ~57.0.4 / `expo-router` ~57.0.4 — app shell and file-based routing
- `react-native` 0.86.0, `react` 19.2.3 — core framework
- `@tanstack/react-query` — configured at root, not yet consumed by screens
- `@react-native-async-storage/async-storage` — backing store for the mock DB and role/consent persistence
- `msw` (`msw/native`) — mocks the (currently unused-by-screens) `src/api/client.ts` HTTP layer
- `react-native-svg` — all inline icon graphics
- `axios` — HTTP client wrapped by `src/api/client.ts`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
