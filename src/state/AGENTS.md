<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# state

## Purpose
Global React Context providers shared by both role trees: the active role/user identity, and high-risk-sharing consent. Both are wired into `app/_layout.tsx` at the root so they're available to every screen.

## Key Files
| File | Description |
|------|-------------|
| `RoleContext.tsx` | `RoleProvider` / `useRole()` — persists `role` (`Role \| null`) and `activeUserId` to AsyncStorage keys `kkinitalk:activeRole` / `kkinitalk:activeUserId`; exposes `setRole` |
| `ConsentContext.tsx` | `ConsentProvider` / `useConsent()` — backed by `consentRecordsCollection` from the mock DB (not AsyncStorage directly); exposes `highRiskSharingConsent`, `loadHighRiskSharingConsent(userId)`, `setHighRiskSharingConsent(userId, value)` |

## For AI Agents

### Working In This Directory
- `RoleContext` is the single source of truth for "who is using the app right now" — every screen derives its user id from `useRole().activeUserId`, so changes to its persistence keys or shape ripple across the entire `app/` tree. Grep for `useRole(` before changing its interface.
- `ConsentContext` intentionally does **not** cache consent globally on load — screens call `loadHighRiskSharingConsent(userId)` explicitly (typically in a `useFocusEffect`) because consent is per-elderly-user, and a guardian may need a different user's consent than the currently active role's own id implies. Keep this explicit-load pattern rather than auto-loading in the provider.
- This directory is React-only (unlike `../domain/`) — it's fine to use hooks/Context here, but keep the actual business rules (e.g. what happens with a `bad` condition + consent) in `../domain/alertRules.ts`, not inline in these providers.

### Testing Requirements
- No dedicated smoke test for this directory's React logic. Consent persistence is indirectly covered by `npm run smoke:consent` (which exercises `consentRecordsCollection` directly, not the Context).

### Common Patterns
- Both providers follow the same shape: a Context + a `use*()` hook that throws (or would throw) if used outside its provider, initialized once in `app/_layout.tsx`.

## Dependencies

### Internal
- `../mocks/db/collections` (`consentRecordsCollection`) — used by `ConsentContext`
- `../domain/types` (`Role`, `ConsentRecord`)

### External
- `@react-native-async-storage/async-storage` — used by `RoleContext`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
