<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# theme

## Purpose
Single design-token source for the entire app. Every screen and component under `app/` and `src/components/` styles itself from this file — there is no other source of colors, spacing, fonts, or shadows.

## Key Files
| File | Description |
|------|-------------|
| `tokens.ts` | Exports `colors`, `fontFamily` (Pretendard weight variants: regular/medium/semibold/bold/extrabold), `fontSize`, `spacing`, `radius`, `shadow`, `animationTiming`, `minTouchTarget` |

## For AI Agents

### Working In This Directory
- This file is high-blast-radius: changing a token value changes it everywhere it's used, with no per-screen overrides in most cases. Search for the token name across `app/` and `src/components/` before changing or removing one.
- `minTouchTarget` encodes an accessibility requirement for the elderly persona (see root `AGENTS.md`) — do not shrink it without checking the PRD's target-user rationale.
- `fontFamily` values must match the font names actually loaded via `expo-font` in `app/_layout.tsx` (Pretendard-*.ttf files in `../../assets/fonts/`) — adding a new weight here requires also loading the corresponding font file.

### Testing Requirements
- No automated tests. Verify visually via `expo start` after any token change, across both `app/elderly/` and `app/guardian/` screens since both consume this file.

### Common Patterns
- Consumers import named tokens directly (`import { colors, spacing } from '../theme/tokens'`) and compose them into `StyleSheet.create` objects — never inline literal hex/px values in screens.

## Dependencies

### Internal
- None — this is a leaf module with no internal dependencies.

### External
- None beyond the font files in `../../assets/fonts/` (loaded via `expo-font`, not imported directly by this file).

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
