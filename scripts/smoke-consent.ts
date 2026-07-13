import { consentRecordsCollection } from '../src/mocks/db/collections';
import { buildAlertCandidates } from '../src/domain/alertRules';
import type { CheckIn } from '../src/domain/types';

const ELDERLY_USER_ID = 'elderly-self';
const TODAY = '2026-07-13';

const badCheckIn: CheckIn = {
  id: 'checkin-consent-test',
  userId: ELDERLY_USER_ID,
  date: TODAY,
  condition: 'bad',
  hadMeal: true,
  note: null,
  recordedAt: `${TODAY}T07:30:00.000Z`,
};

async function writePhase() {
  const withoutConsent = buildAlertCandidates(
    ELDERLY_USER_ID,
    new Date(`${TODAY}T20:00:00.000Z`),
    [badCheckIn],
    [],
    [],
    [],
    false,
  );
  if (withoutConsent.some((item) => item.type === 'high_risk')) {
    throw new Error('expected no high_risk candidate without consent');
  }

  const withConsent = buildAlertCandidates(
    ELDERLY_USER_ID,
    new Date(`${TODAY}T20:00:00.000Z`),
    [badCheckIn],
    [],
    [],
    [],
    true,
  );
  if (!withConsent.some((item) => item.type === 'high_risk')) {
    throw new Error('expected a high_risk candidate with consent');
  }

  await consentRecordsCollection.upsert({
    id: ELDERLY_USER_ID,
    userId: ELDERLY_USER_ID,
    highRiskSharingConsent: true,
    updatedAt: `${TODAY}T07:00:00.000Z`,
  });

  console.log('CONSENT_WRITE_PHASE_OK');
}

async function readPhase() {
  const record = await consentRecordsCollection.getById(ELDERLY_USER_ID);
  if (!record || record.highRiskSharingConsent !== true) {
    throw new Error('consent record did not persist across simulated restart');
  }

  console.log('SMOKE TEST PASSED: consent gating logic and consent record persisted across simulated restart', {
    highRiskSharingConsent: record.highRiskSharingConsent,
  });
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
