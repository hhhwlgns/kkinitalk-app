<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-13 | Updated: 2026-07-13 -->

# db

## Purpose
The app's actual persistence layer: a generic AsyncStorage-backed `Collection<T>` store, one typed collection per domain entity, and one-time demo seed data. Every screen that reads or writes app data goes through this directory, not through `../../api/client.ts`.

## Key Files
| File | Description |
|------|-------------|
| `store.ts` | `createCollection<T extends WithId>(name)` — generic CRUD (`getAll`/`getById`/`query`/`upsert`/`remove`/`replaceAll`) backed by a single JSON array per collection at AsyncStorage key `kkinitalk:db:<name>`; also `isSeeded()`/`markSeeded()` (key `kkinitalk:db:seeded`) |
| `collections.ts` | Instantiates every typed collection: `usersCollection`, `healthProfilesCollection`, `mealsCollection`, `medicationsCollection`, `medicationLogsCollection`, `checkInsCollection`, `guardianLinksCollection`, `guardianAlertsCollection`, `consentRecordsCollection` |
| `seed.ts` | `seedMockDb()` — idempotent (checks `isSeeded()` first); creates one demo elderly user (`demo-elderly-1`, "김끼니"), one demo guardian (`demo-guardian-1`, "김보호"), and a demo `HealthProfile`, then `markSeeded()` |

## For AI Agents

### Working In This Directory
- Every collection is a flat JSON array read/written as a whole on every operation (`readAll`/`writeAll` in `store.ts`) — there is no indexing or partial-write optimization. This is fine at demo data volumes; do not add pagination/streaming here without discussing with the user first, since it would be over-engineering for the current scale.
- Adding a new entity type means: add the type to `../../domain/types.ts`, add one line to `collections.ts` (`export const xCollection = createCollection<X>('x')`), and use `createId('x')` (`../../domain/id.ts`) for its ids — follow this exact three-step pattern for consistency.
- `seed.ts` is guarded by `isSeeded()` so it only ever runs once per install — if you need to force reseeding during development, clear AsyncStorage (e.g. reinstall the Expo Go app data) rather than changing this guard.

### Testing Requirements
- `npm run smoke:db` exercises `store.ts`'s core CRUD + the write/restart/read persistence guarantee directly.
- Every other `smoke:*` script (`checkin`, `meal`, `medication`, `history`, `profile`, `guardian`, `consent`, `onboarding`) exercises one or more of the typed collections in `collections.ts` end-to-end.

### Common Patterns
- All records implement `WithId` (`{ id: string }`) so they work with the generic `Collection<T>` interface — never add an entity type without an `id` field.
- Timestamps on records are ISO strings (`new Date().toISOString()`), not `Date` objects, since they must survive `JSON.stringify`/`JSON.parse` round-trips through AsyncStorage.

## Dependencies

### Internal
- `../../domain/types` — every entity type stored here

### External
- `@react-native-async-storage/async-storage`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
