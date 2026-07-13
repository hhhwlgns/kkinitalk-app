import { guardianLinksCollection, healthProfilesCollection } from '../src/mocks/db/collections';
import { createId } from '../src/domain/id';
import { generateInviteCode } from '../src/domain/inviteCode';
import type { GuardianLink, HealthProfile } from '../src/domain/types';

const USER_ID = 'elderly-self';
const TODAY = '2026-07-13';

async function writePhase() {
  const profile: HealthProfile = {
    id: createId('profile'),
    userId: USER_ID,
    name: '김어르신',
    age: 78,
    sex: 'unspecified',
    conditions: ['고혈압'],
    medications: ['혈압약'],
    swallowingDifficulty: false,
    avoidedFoods: ['짠 음식'],
    recentWeightKg: 60,
    appetiteLevel: 'normal',
    createdAt: `${TODAY}T07:00:00.000Z`,
    updatedAt: `${TODAY}T07:00:00.000Z`,
  };
  await healthProfilesCollection.upsert(profile);

  const editedProfile: HealthProfile = {
    ...profile,
    name: '김철수',
    recentWeightKg: 58,
    updatedAt: `${TODAY}T08:00:00.000Z`,
  };
  await healthProfilesCollection.upsert(editedProfile);

  const link: GuardianLink = {
    id: createId('guardianlink'),
    inviteCode: generateInviteCode(),
    elderlyUserId: USER_ID,
    guardianUserId: null,
    status: 'pending',
    createdAt: `${TODAY}T08:05:00.000Z`,
  };
  await guardianLinksCollection.upsert(link);

  const storedProfiles = await healthProfilesCollection.query((item) => item.userId === USER_ID);
  const storedLinks = await guardianLinksCollection.query((item) => item.elderlyUserId === USER_ID);
  if (storedProfiles.length !== 1) {
    throw new Error(`expected 1 profile (upsert should edit in place), got ${storedProfiles.length}`);
  }
  if (storedLinks.length !== 1) {
    throw new Error(`expected 1 guardian link, got ${storedLinks.length}`);
  }

  console.log('PROFILE_WRITE_PHASE_OK');
}

async function readPhase() {
  const storedProfiles = await healthProfilesCollection.query((item) => item.userId === USER_ID);
  const storedLinks = await guardianLinksCollection.query((item) => item.elderlyUserId === USER_ID);

  if (storedProfiles.length !== 1) {
    throw new Error(`expected 1 persisted profile after restart, got ${storedProfiles.length}`);
  }
  const profile = storedProfiles[0];
  if (profile.name !== '김철수' || profile.recentWeightKg !== 58) {
    throw new Error('profile edit did not persist correctly after restart');
  }

  if (storedLinks.length !== 1) {
    throw new Error(`expected 1 persisted guardian link after restart, got ${storedLinks.length}`);
  }
  const link = storedLinks[0];
  if (link.status !== 'pending' || link.guardianUserId !== null || link.inviteCode.length !== 6) {
    throw new Error('guardian link invite code candidate mismatch after restart');
  }

  console.log(
    'SMOKE TEST PASSED: edited health profile and generated guardian invite code persisted across simulated restart',
    { profileName: profile.name, recentWeightKg: profile.recentWeightKg, inviteCode: link.inviteCode, status: link.status },
  );
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
