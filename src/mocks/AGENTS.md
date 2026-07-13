<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# mocks

## Purpose
The app's entire "backend" today: an MSW (`msw/native`) server for intercepting HTTP calls, an AsyncStorage-backed mock database (`db/`), and a mock "AI" nutrition-analysis module that stands in for a real vision/nutrition model. Everything under here is dev/mock-only infrastructure, gated by `__DEV__` and `EXPO_PUBLIC_USE_MOCKS`.

## Key Files
| File | Description |
|------|-------------|
| `setup.native.ts` | `mockServer = setupServer(...handlers)`; `enableMocking()` starts it unless `EXPO_PUBLIC_USE_MOCKS === 'false'` |
| `polyfills.ts` | Stubs `MessageEvent`, `Event`, `EventTarget`, `BroadcastChannel` globals if undefined — required for `msw/native` to function in the React Native runtime |
| `nutritionAnalysis.ts` | Core mock "AI": `FOOD_BANK` (8 Korean foods + nutrient breakdowns), `analyzeMockPhoto(seedIndex?)`, `sumNutrients(foods)`, `assessMealFitness(totalNutrients, profile?)` (sodium > 1500mg → `'caution'` with condition-aware messaging), `NEXT_MEAL_SUGGESTIONS` + `suggestNextMeal(...)`, `inferMealSlot(date)` (breakfast <10h, lunch <15h, dinner <20h, else snack), `NUTRIENT_TARGETS` + `nutrientPct(value, key)` |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `db/` | AsyncStorage-backed generic collection store + typed collections + seed data (see `db/AGENTS.md`) |
| `handlers/` | MSW request handlers (see `handlers/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `polyfills.ts` must be imported before `setup.native.ts` starts the MSW server — if you see MSW/native errors about missing globals, check this ordering first rather than assuming an MSW version bug.
- `nutritionAnalysis.ts` is the single source of truth for all nutrition math and thresholds (sodium caution at 1500mg, danger implied at 2000mg — see usages in `app/elderly/home.tsx` and `app/guardian/home.tsx`) — update thresholds here, not per-screen.
- When Mock DB seed data or `FOOD_BANK` contents change shape, check every screen that destructures `Meal.foods`/`NutrientBreakdown` fields, since there's no schema validation layer.

### Testing Requirements
- `npm run smoke:msw` — verifies the MSW server intercepts `apiClient` requests.
- `npm run smoke:meal`, `smoke:suggestion` — exercise `nutritionAnalysis.ts` functions.
- `npm run smoke:db` — exercises the underlying `db/` store (see `db/AGENTS.md`).

### Common Patterns
- All mock data generation functions accept an optional `seedIndex`/variant parameter to allow screens to cycle through deterministic pseudo-random results (e.g. "다른 추천 받기" / "get another suggestion" buttons) rather than using real randomness.

## Dependencies

### Internal
- `../domain/types` — `NutrientBreakdown`, `HealthProfile`, `Meal`, `FoodItem`, etc.

### External
- `msw` (`msw/native`)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
