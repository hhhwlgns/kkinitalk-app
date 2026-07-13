<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# components

## Purpose
Shared presentational React components used by both the elderly and guardian screen trees — big-touch-target buttons, a legal/medical disclaimer banner, the app mascot logo, and a multi-select chip group.

## Key Files
| File | Description |
|------|-------------|
| `BigButton.tsx` | Large primary/secondary button (`minTouchTarget + 8` min height) used for all main CTAs |
| `DisclaimerBanner.tsx` | Renders one of three fixed Korean disclaimer strings (`general` / `emergency` / `medication`) — the app's "this is not medical advice" safety copy |
| `MascotLogo.tsx` | Inline SVG mascot logo (rounded creature face), scalable via `size` prop |
| `MultiSelect.tsx` | Chip-based multi-select control; also exports the standalone `toggleOption(list, option)` helper (special-cases a `'없음'`/"none" option that clears all others) used by profile/onboarding screens even where the `MultiSelect` component itself isn't rendered |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `voice/` | Voice-assistant-style UI pieces used specifically by the onboarding flow (see `voice/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- These components are intentionally generic/role-agnostic — do not add role-specific logic (e.g. `useRole()` calls) here; keep role branching in `app/elderly/` and `app/guardian/` screens.
- `toggleOption` in `MultiSelect.tsx` encodes a specific UX rule (selecting "없음" clears everything else, selecting anything else clears "없음") — reuse it rather than reimplementing multi-select toggle logic elsewhere (see `app/elderly/profile.tsx`, `app/elderly/onboarding/index.tsx`).
- All styling must use `../theme/tokens` — no hardcoded colors/sizes.

### Testing Requirements
- No automated tests. Verify visually via `expo start`; `toggleOption` behavior is simple enough to eyeball but is a good candidate for a smoke test if it grows more branches.

### Common Patterns
- Every component is a small, self-contained `StyleSheet.create` + functional component pair in its own file — no shared style files or component composition helpers.
- Icons/graphics (`MascotLogo`) use inline `react-native-svg` primitives, matching the convention used throughout `app/`.

## Dependencies

### Internal
- `../theme/tokens` — all colors, fonts, spacing, radius

### External
- `react-native-svg` (`MascotLogo`)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
