<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# scripts

## Purpose
Custom smoke-test scripts that substitute for a standard test runner (no Jest/Vitest in this project). Each `smoke:<name>` npm script compiles a `.ts` entry point (or its paired `.cjs` write/read runner) via `tsconfig.smoke.json`, runs it against plain Node, then deletes the `.smoke-tmp/` build output.

## Key Files
| File | Description |
|------|-------------|
| `fakeAsyncStorage.cjs` | In-memory/file-backed fake implementation of `@react-native-async-storage/async-storage`'s API, used so `.cjs` runners can exercise the mock DB (`src/mocks/db/`) outside React Native |
| `smoke-msw.ts` | Compiles + runs directly (no paired runner): calls `enableMocking()`, hits `apiClient.get('/_ping')`, asserts `{ ok: true, source: 'msw-native' }` |
| `smoke-db.ts` / `smoke-db-runner.cjs` | Write phase seeds the mock DB and adds a check-in; read phase (separate process invocation) re-reads AsyncStorage to prove data survives a simulated app restart |
| `smoke-onboarding.ts` / `smoke-onboarding-runner.cjs` | Onboarding flow write/read smoke test |
| `smoke-checkin.ts` / `smoke-checkin-runner.cjs` | Daily check-in write/read smoke test |
| `smoke-meal.ts` / `smoke-meal-runner.cjs` | Meal recording + nutrition analysis write/read smoke test |
| `smoke-suggestion.ts` | Next-meal-suggestion logic smoke test (compiled + run directly, no `.cjs` runner) |
| `smoke-medication.ts` / `smoke-medication-runner.cjs` | Medication + medication-log write/read smoke test |
| `smoke-history.ts` / `smoke-history-runner.cjs` | History aggregation (`buildDayHistory`, calendar grid) write/read smoke test |
| `smoke-profile.ts` / `smoke-profile-runner.cjs` | Health profile persistence write/read smoke test |
| `smoke-guardian.ts` / `smoke-guardian-runner.cjs` | Guardian link + alert-candidate write/read smoke test |
| `smoke-consent.ts` / `smoke-consent-runner.cjs` | Consent record write/read smoke test |

## For AI Agents

### Working In This Directory
- The `write`/`read` split (e.g. `smoke-db-runner.cjs write` then `... read` as two separate `node` invocations in `package.json`) is deliberate — it proves AsyncStorage-backed persistence survives a process restart, not just an in-memory session. Preserve this two-phase pattern when adding a new smoke suite for anything backed by `src/mocks/db/`.
- Every `smoke:*` npm script deletes `.smoke-tmp/` both before (for the `onboarding`+ scripts) or after running — if a smoke run is interrupted, `.smoke-tmp/` may be left behind; it's safe to delete manually.
- New smoke scripts must be added to `include` in `../tsconfig.smoke.json` or they won't compile.
- `fakeAsyncStorage.cjs` intentionally reimplements only the subset of AsyncStorage's API the mock DB needs (`src/mocks/db/store.ts`) — extend it if a new store method is added, don't add a real AsyncStorage dependency here (these scripts run under plain Node, not React Native).

### Testing Requirements
- These files ARE the test suite for this project — there is no other layer. When adding a new domain/mock-DB feature, add or extend a `smoke-*.ts`/`.cjs` pair here rather than assuming manual QA is sufficient.

### Common Patterns
- `.ts` entry points import directly from `../src/mocks/...` / `../src/domain/...` / `../src/api/client` — never from `app/`, since these run outside the RN/Expo runtime.
- Each script prints a `SMOKE TEST PASSED: ...` or `SMOKE TEST FAILED: ...` line and sets `process.exitCode = 1` on failure, so CI/manual runs can check exit status.

## Dependencies

### Internal
- `../src/mocks/**`, `../src/domain/**`, `../src/api/**` (per `tsconfig.smoke.json`'s `include`)

### External
- `msw` (via `smoke-msw.ts`)
- Node.js `fs`/`process` built-ins

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
