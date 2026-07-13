import { healthProfilesCollection } from '../src/mocks/db/collections';
import { createId } from '../src/domain/id';
import type { HealthProfile } from '../src/domain/types';

const USER_ID = 'elderly-self';

async function writePhase() {
  const now = new Date().toISOString();
  const profile: HealthProfile = {
    id: createId('profile'),
    userId: USER_ID,
    name: '어르신',
    age: null,
    sex: 'unspecified',
    conditions: ['고혈압'],
    medications: ['혈압약'],
    swallowingDifficulty: false,
    avoidedFoods: ['짠 음식'],
    recentWeightKg: 60,
    appetiteLevel: 'normal',
    createdAt: now,
    updatedAt: now,
  };

  await healthProfilesCollection.upsert(profile);

  const profiles = await healthProfilesCollection.query((item) => item.userId === USER_ID);
  if (profiles.length !== 1) {
    throw new Error(`expected 1 onboarding profile, got ${profiles.length}`);
  }

  console.log('ONBOARDING_WRITE_PHASE_OK', profile.id);
}

async function readPhase() {
  const profiles = await healthProfilesCollection.query((item) => item.userId === USER_ID);
  if (profiles.length !== 1) {
    throw new Error(`expected 1 persisted onboarding profile after restart, got ${profiles.length}`);
  }

  const profile = profiles[0];
  if (profile.conditions.join(',') !== '고혈압' || profile.appetiteLevel !== 'normal') {
    throw new Error('persisted profile content mismatch');
  }

  console.log('SMOKE TEST PASSED: onboarding profile persisted across simulated restart', {
    id: profile.id,
    conditions: profile.conditions,
    appetiteLevel: profile.appetiteLevel,
  });
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
