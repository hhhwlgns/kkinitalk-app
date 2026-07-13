<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# elderly

## Purpose
Screens and tab layout for the elderly (어르신) role: onboarding, daily check-in, meal photo capture + result, home dashboard, history, medications, and profile. Designed for large touch targets, minimal text input, and voice/photo-first interaction.

## Key Files
| File | Description |
|------|-------------|
| `_layout.tsx` | Tabs layout with a custom floating `CameraFabButton` (raised, `top: -30`) for the camera tab. Visible tabs: home, history, camera (FAB), medications, profile. Hidden (`href: null`) routes: checkin, result, onboarding |
| `home.tsx` | Dashboard: check-in prompt/status, next-medication card, camera CTA, today's nutrient summary, and a rotating next-meal recommendation (`suggestNextMeal`) |
| `checkin.tsx` | Daily condition/meal check-in flow |
| `camera.tsx` | Meal photo capture entry point → triggers mock analysis |
| `result.tsx` | Shows mock nutrition analysis result for a captured meal, fitness verdict, and conflict warnings |
| `history.tsx` | Calendar + list view of past meals, medication logs, and check-ins for the elderly user |
| `medications.tsx` | Medication list, schedule, and "먹었어요" (taken) logging |
| `profile.tsx` | Editable health profile (conditions, medications, swallowing difficulty, avoided foods, appetite), guardian invite-code generation, and high-risk-sharing consent toggle |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `onboarding/` | First-run voice-assistant-style health intake flow (see `onboarding/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- All screens resolve the active user as `activeUserId ?? 'elderly-self'` from `useRole()` — keep this fallback pattern when adding new screens so the app works before a real user id is assigned.
- Screens load data in a `load` callback wrapped by `useFocusEffect(useCallback(load, [...]))` so data refreshes every time the tab regains focus — follow this pattern rather than `useEffect` alone, since users bounce between tabs frequently.
- Keep touch targets large and text large/high-contrast (see `minTouchTarget` in `../../src/theme/tokens.ts`) — this is a core accessibility requirement for the elderly persona, not a style preference.
- `profile.tsx` is also where guardian `GuardianLink` invite codes are created (`generateInviteCode` + `guardianLinksCollection.upsert`) — changes to the link/consent model must be reflected in both this screen and the guardian side (`../guardian/connect.tsx`, `../guardian/home.tsx`).

### Testing Requirements
- Relevant smoke scripts: `npm run smoke:checkin`, `smoke:meal`, `smoke:medication`, `smoke:history`, `smoke:profile`, `smoke:onboarding`, `smoke:suggestion`, `smoke:consent`. Run the ones matching the screen/domain logic you touched.

### Common Patterns
- All icons are inline `react-native-svg` (`Svg`/`Path`/`Rect`/`Line`/`Circle`) components defined at the top of each screen file, not imported from an icon library.
- Nutrition figures come from `sumNutrients`/`assessMealFitness`/`suggestNextMeal` in `../../src/mocks/nutritionAnalysis.ts` — don't recompute nutrient math inline in screens.

## Dependencies

### Internal
- `../../src/mocks/db/collections` — all persisted reads/writes
- `../../src/domain/*` — date formatting, conflict rules, medication reminders, id/invite-code generation
- `../../src/state/RoleContext`, `../../src/state/ConsentContext`
- `../../src/components/*` — `BigButton`, `MultiSelect`, `DisclaimerBanner`
- `../../src/theme/tokens`

### External
- `expo-router` (`router`, `useFocusEffect`)
- `react-native-safe-area-context` (`SafeAreaView`)
- `react-native-svg`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
