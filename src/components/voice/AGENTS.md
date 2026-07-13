<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# voice

## Purpose
Small presentational pieces that simulate a voice-assistant conversation UI, used exclusively by `app/elderly/onboarding/index.tsx` to make the health intake flow feel like a spoken Q&A rather than a form.

## Key Files
| File | Description |
|------|-------------|
| `AiQuestionBubble.tsx` | Speech-bubble-styled `Text` wrapper that renders the current `STEP_QUESTIONS[step]` string |
| `AnalyzingSpinner.tsx` | Small animated spinner used to simulate "AI is thinking/analyzing" pauses |
| `OnboardingDots.tsx` | Step-progress dot indicator (`total`/`step` props) shown at the top of the onboarding header |
| `OptionStack.tsx` | Vertical stack of selectable option rows (`{ key, label, selected, onPress }[]`) — used for single-choice, auto-advancing steps (swallowing difficulty, appetite, high-risk consent) |
| `VoiceListeningIndicator.tsx` | Animated "listening" waveform/mic indicator shown above each question |

## For AI Agents

### Working In This Directory
- These components are purpose-built for the onboarding flow only — they are not intended as general-purpose chat/voice UI; don't add unrelated features here, extend `../` (general `components/`) instead if a new screen needs something similar but not onboarding-specific.
- `OptionStack` is a single-select list (one `onPress` triggers immediate advance in the caller) — it is distinct from `../MultiSelect.tsx`, which supports multiple selections and a separate "다음" button; don't conflate the two when adding a new onboarding step.

### Testing Requirements
- No automated tests. Verify visually by running through `app/elderly/onboarding/index.tsx` via `expo start`.

### Common Patterns
- All animated/indicator components here use React Native's `Animated` API directly (no animation library) — follow the same approach for consistency and bundle-size reasons.

## Dependencies

### Internal
- `../../theme/tokens` — all styling

### External
- `react-native` (`Animated`)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
