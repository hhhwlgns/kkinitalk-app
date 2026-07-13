import { checkInsCollection } from '../src/mocks/db/collections';
import { seedMockDb } from '../src/mocks/db/seed';
import { healthProfilesCollection } from '../src/mocks/db/collections';

const USER_ID = 'elderly-self';

async function writePhase() {
  await seedMockDb();

  const profiles = await healthProfilesCollection.query((item) => item.userId === USER_ID);
  if (profiles.length !== 1) {
    throw new Error(`expected 1 seeded profile, got ${profiles.length}`);
  }

  await checkInsCollection.upsert({
    id: 'checkin-smoke-1',
    userId: USER_ID,
    date: '2026-07-12',
    condition: 'good',
    hadMeal: true,
    note: null,
    recordedAt: '2026-07-12T00:00:00.000Z',
  });

  console.log('WRITE_PHASE_OK');
}

async function readPhase() {
  const profiles = await healthProfilesCollection.query((item) => item.userId === USER_ID);
  if (profiles.length !== 1) {
    throw new Error(`expected 1 persisted profile after restart, got ${profiles.length}`);
  }

  const checkIns = await checkInsCollection.getAll();
  const found = checkIns.find((c) => c.id === 'checkin-smoke-1');
  if (!found) {
    throw new Error('expected checkin-smoke-1 to survive restart');
  }

  console.log('SMOKE TEST PASSED: mock DB data persisted across simulated restart', {
    profiles: profiles.length,
    checkIns: checkIns.length,
  });
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
