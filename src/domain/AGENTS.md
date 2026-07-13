<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# domain

## Purpose
Framework-agnostic domain types and pure business logic — no React, no React Native imports (except `medicationReminders.ts`, which is the one exception that talks to `expo-notifications`/`expo`). This is the core rules layer: alerting, medication/food conflict detection, date formatting, guardian-link matching, history aggregation, and id/invite-code generation. Everything here is directly exercised by the `scripts/smoke-*.ts` suite via `tsconfig.smoke.json`.

## Key Files
| File | Description |
|------|-------------|
| `types.ts` | Central domain types: `Role`, `Sex`, `HealthProfile`, `NutrientBreakdown`, `MealSlot`, `MealFitness`, `FoodItem`, `Meal`, `Medication`, `MedicationLog`, `ConditionLevel`, `CheckIn`, `GuardianLink`, `AlertType`, `GuardianAlert`, `ConsentRecord`, `User` |
| `alertRules.ts` | `buildAlertCandidates(...)` — derives `AlertCandidate[]` (missed meal by 2pm, caution-fitness meal, missed medication past grace period + 30min, high-risk condition + consent) for the guardian home/alerts screens |
| `conflictRules.ts` | `CONFLICT_RULES` (hardcoded 혈압약/당뇨약/자몽, 관절약/술 warnings) + `findConflicts(medications, foodNames)` — matches medication keywords and per-medication `conflictFoods` against a meal's food names |
| `date.ts` | `todayDate()`, `formatDateWithWeekday()`, `earliestTime(times)`, `formatKoreanTime(hhmm)` — Korean-locale date/time formatting shared across screens |
| `guardianLink.ts` | `findConnectedLink(links, guardianUserId)`, `findLinkByInviteCode(links, inviteCode)` — the only two lookup functions for `GuardianLink` records |
| `historyView.ts` | `collectRecordDates(...)`, `buildDayHistory(...)`, `getMonthGridDates(year, month)` — aggregation helpers backing the calendar/history screens in both role trees |
| `id.ts` | `createId(prefix)` — `${prefix}-${Date.now()}-${random}` id generator used for all mock-DB records |
| `inviteCode.ts` | `generateInviteCode()` — random 6-char code from a confusable-character-excluding alphabet |
| `medicationReminders.ts` | `scheduleMedicationReminders(medication)` — schedules daily `expo-notifications` reminders per `medication.timesOfDay`; no-ops under Expo Go (`isRunningInExpoGo()`) and if notification permission is denied |
| `storageKeys.ts` | `elderlyOnboardingDoneKey(userId)` — the one AsyncStorage key builder that lives outside `mocks/db/` (used directly by `app/index.tsx`'s redirect logic) |

## For AI Agents

### Working In This Directory
- Keep this directory framework-agnostic (no `react-native` imports) except `medicationReminders.ts` — this is what lets `tsconfig.smoke.json` compile and run this code under plain Node for smoke tests. Adding an RN import elsewhere here will break the smoke build.
- `CONFLICT_RULES` in `conflictRules.ts` is a hardcoded small ruleset (Korean medication/food keyword pairs) — when extending it, keep the same `{ medicationKeyword, foodKeyword, warning }` shape and Korean warning phrasing style, and remember this is explicitly "reference only," not medical advice (see root `AGENTS.md` disclaimer note).
- All ids for new mock-DB record types should go through `createId(prefix)` for consistency with existing records.

### Testing Requirements
- This directory is directly included in `tsconfig.smoke.json` (`src/domain/**/*.ts`). Any change here should be validated against the relevant `npm run smoke:*` script — e.g. changes to `alertRules.ts` → `smoke:guardian`/`smoke:consent`; changes to `historyView.ts` → `smoke:history`.

### Common Patterns
- Functions here are pure and take their inputs explicitly (arrays of records + optional `now`/`Date`) rather than reading global state — keep new domain functions consistent with this so they stay unit-testable by the smoke scripts.
- Date/time strings throughout the app are ISO strings sliced with `.slice(0, 10)` for date-only comparisons — follow this convention rather than introducing a date library.

## Dependencies

### Internal
- None — this is the lowest-level logic layer; other `src/` directories and `app/` depend on it, not vice versa.

### External
- `expo`, `expo-notifications` — used only by `medicationReminders.ts`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
