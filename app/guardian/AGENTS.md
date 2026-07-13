<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# guardian

## Purpose
Screens and tab layout for the guardian (보호자) role: connecting to an elderly user via invite code, a home dashboard summarizing the connected elderly user's day, alerts, history, medications, and a weekly report. Read-mostly, dashboard-oriented (contrast with the elderly tree's input-first design).

## Key Files
| File | Description |
|------|-------------|
| `_layout.tsx` | Tabs layout. Visible tabs: home, alerts, history, medications, report. Hidden (`href: null`) route: connect |
| `connect.tsx` | 6-digit invite-code entry screen; resolves via `findLinkByInviteCode`, previews the matched elderly user's name, then `guardianLinksCollection.upsert(...)` to mark the link `connected` and redirects to `home` |
| `home.tsx` | Dashboard for the connected elderly user: today's condition/check-in status, meal/medication/sodium summary boxes, unacknowledged-alert banner, a same-day timeline (check-in + meals + medication logs merged and sorted), and a link to the weekly report. Also generates new `GuardianAlert` candidates via `buildAlertCandidates` on every focus and persists any not already stored |
| `alerts.tsx` | List/acknowledge view for `GuardianAlert` records |
| `history.tsx` | Calendar + day-detail view of the connected elderly user's meals, medications, and check-ins, mirroring `../elderly/history.tsx` but scoped via `findConnectedLink` |
| `medications.tsx` | Read view of the connected elderly user's medications and adherence |
| `report.tsx` | Weekly report: custom inline SVG bar chart (`SodiumChart`) for 7-day sodium trend plus medication adherence rate |

## For AI Agents

### Working In This Directory
- Every screen (except `connect.tsx`) must first resolve the active `GuardianLink` via `findConnectedLink(links, guardianUserId)` and `router.replace('/guardian/connect')` if none exists — follow this guard pattern for any new guardian screen so unconnected guardians are always routed back to `connect`.
- `home.tsx` both reads and writes: it derives `AlertCandidate`s from `buildAlertCandidates` (`../../src/domain/alertRules.ts`) each time the screen focuses, and upserts any not already present in `guardianAlertsCollection`. If you change alert-generation logic, update `alertRules.ts`, not this screen directly.
- Task items #22 (`home.tsx`), #23 (`alerts.tsx`), #24 (`report.tsx`) are pre-existing, separate in-progress work to match a design prototype ("isGHome"/"isGAlerts"/"isGReport") — check the task list before assuming these files are finished/stable.

### Testing Requirements
- Relevant smoke scripts: `npm run smoke:guardian`, `smoke:consent`, `smoke:history`, `smoke:medication`. Guardian alert-derivation logic is covered indirectly through `src/domain/alertRules.ts` — no guardian-specific smoke script exists yet for `home.tsx`'s alert generation; verify manually via `expo start`.

### Common Patterns
- Guardian screens resolve the elderly target as `link.elderlyUserId`, never the guardian's own id, when querying mock DB collections.
- `report.tsx`'s `SodiumChart` and other bar/line visuals are hand-drawn with `react-native-svg`, not a charting library — follow the same approach for new charts rather than adding a dependency.

## Dependencies

### Internal
- `../../src/domain/guardianLink` (`findConnectedLink`, `findLinkByInviteCode`)
- `../../src/domain/alertRules` (`buildAlertCandidates`)
- `../../src/domain/historyView`, `../../src/domain/date`
- `../../src/mocks/db/collections`, `../../src/mocks/nutritionAnalysis`
- `../../src/state/RoleContext`
- `../../src/components/BigButton`
- `../../src/theme/tokens`

### External
- `expo-router` (`router`, `useFocusEffect`)
- `react-native-safe-area-context`
- `react-native-svg`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
