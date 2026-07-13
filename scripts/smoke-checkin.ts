import { checkInsCollection } from '../src/mocks/db/collections';
import { createId } from '../src/domain/id';
import type { CheckIn } from '../src/domain/types';

const USER_ID = 'elderly-self';
const DAY_1 = '2026-07-10';
const DAY_2 = '2026-07-11';

async function writePhase() {
  const entries: CheckIn[] = [
    {
      id: createId('checkin'),
      userId: USER_ID,
      date: DAY_1,
      condition: 'good',
      hadMeal: true,
      note: null,
      recordedAt: `${DAY_1}T08:00:00.000Z`,
    },
    {
      id: createId('checkin'),
      userId: USER_ID,
      date: DAY_2,
      condition: 'bad',
      hadMeal: false,
      note: '속이 안 좋아요',
      recordedAt: `${DAY_2}T08:10:00.000Z`,
    },
  ];

  for (const entry of entries) {
    await checkInsCollection.upsert(entry);
  }

  const stored = await checkInsCollection.query((item) => item.userId === USER_ID);
  if (stored.length !== 2) {
    throw new Error(`expected 2 check-ins, got ${stored.length}`);
  }

  console.log('CHECKIN_WRITE_PHASE_OK');
}

async function readPhase() {
  const stored = await checkInsCollection.query((item) => item.userId === USER_ID);
  if (stored.length !== 2) {
    throw new Error(`expected 2 persisted check-ins after restart, got ${stored.length}`);
  }

  const byDate = new Map(stored.map((item) => [item.date, item]));
  const day1 = byDate.get(DAY_1);
  const day2 = byDate.get(DAY_2);

  if (!day1 || day1.condition !== 'good' || day1.hadMeal !== true) {
    throw new Error('day 1 check-in mismatch after restart');
  }
  if (!day2 || day2.condition !== 'bad' || day2.hadMeal !== false || day2.note !== '속이 안 좋아요') {
    throw new Error('day 2 check-in mismatch after restart');
  }

  console.log('SMOKE TEST PASSED: check-in history persisted across simulated restart and queryable by date', {
    count: stored.length,
    dates: [...byDate.keys()].sort(),
  });
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
