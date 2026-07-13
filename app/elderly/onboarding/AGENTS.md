<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# onboarding

## Purpose
First-run, voice-assistant-style health intake flow for a new elderly user. Presents `STEP_QUESTIONS` one at a time via a fake "AI is listening" UI, collects conditions/medications/swallowing-difficulty/avoided-foods/weight/appetite/high-risk-consent, then writes a `HealthProfile` and marks onboarding complete before continuing to `done.tsx`.

## Key Files
| File | Description |
|------|-------------|
| `index.tsx` | 7-step (`TOTAL_STEPS`) question flow driven by a `step` index and an `Answers` state object; "건너뛰기" (skip) jumps straight to `done`; on the final step writes a `HealthProfile` via `healthProfilesCollection.upsert`, calls `setHighRiskSharingConsent`, and sets `AsyncStorage` key from `elderlyOnboardingDoneKey(userId)` before `router.replace('/elderly/onboarding/done')` |
| `done.tsx` | Reads back the just-created `HealthProfile` (last match for `userId`) and renders a summary card, then a CTA that replaces to `/elderly/home` |

## For AI Agents

### Working In This Directory
- `index.tsx`'s per-step `canProceed` boolean and the conditional "다음"/"완료" button rendering (only shown for steps 0/1/3/4 — steps 2/5/6 auto-advance via `OptionStack` `onPress`) are easy to get wrong when adding a step; add both a `canProceed` clause and decide whether the new step auto-advances or needs the button.
- The "건너뛰기" skip path bypasses profile creation entirely — `done.tsx` must handle `profile === null` gracefully (it currently shows a "로딩 중" loading state indefinitely in that case, which is a known gap, not a bug to silently fix without checking with the user first).
- `elderlyOnboardingDoneKey(userId)` (`../../../src/domain/storageKeys.ts`) is the flag `app/index.tsx` checks to decide whether to route a returning elderly user to onboarding or straight to `home` — don't change its write timing without checking that redirect logic.

### Testing Requirements
- `npm run smoke:onboarding` covers the `HealthProfile` write/read cycle this flow produces (not the UI/step logic itself, which has no automated coverage).

### Common Patterns
- Uses the same `MultiSelect`/`toggleOption` and `OptionStack` components as `../profile.tsx` for consistency between onboarding and later profile edits.

## Dependencies

### Internal
- `../../../src/components/voice/*` (`AiQuestionBubble`, `OnboardingDots`, `OptionStack`, `VoiceListeningIndicator`)
- `../../../src/components/MultiSelect` (`MultiSelect`, `toggleOption`)
- `../../../src/mocks/db/collections` (`healthProfilesCollection`)
- `../../../src/domain/id`, `../../../src/domain/storageKeys`, `../../../src/domain/types`
- `../../../src/state/RoleContext`, `../../../src/state/ConsentContext`
- `../../../src/theme/tokens`

### External
- `expo-router`, `@react-native-async-storage/async-storage`, `react-native-svg` (`done.tsx`'s check badge)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
