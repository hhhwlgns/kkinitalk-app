import {
  guardianAlertsCollection,
  guardianCareActionsCollection,
  guardianLinksCollection,
  medicationsCollection,
} from '../src/mocks/db/collections';
import { createId } from '../src/domain/id';
import { findConnectedLink, findLinkByInviteCode } from '../src/domain/guardianLink';
import { buildAlertCandidates } from '../src/domain/alertRules';
import type { CheckIn, GuardianLink, Medication } from '../src/domain/types';

const ELDERLY_USER_ID = 'elderly-self';
const GUARDIAN_USER_ID = 'guardian-self';
const INVITE_CODE = 'TESTCD';
const TODAY = '2026-07-13';

async function writePhase() {
  const pendingLink: GuardianLink = {
    id: createId('guardianlink'),
    inviteCode: INVITE_CODE,
    elderlyUserId: ELDERLY_USER_ID,
    guardianUserId: null,
    status: 'pending',
    createdAt: `${TODAY}T07:00:00.000Z`,
  };
  await guardianLinksCollection.upsert(pendingLink);

  const allLinks = await guardianLinksCollection.getAll();
  const match = findLinkByInviteCode(allLinks, INVITE_CODE);
  if (!match) {
    throw new Error('expected to find pending link by invite code');
  }
  await guardianLinksCollection.upsert({ ...match, guardianUserId: GUARDIAN_USER_ID, status: 'connected' });

  const connectedLink = findConnectedLink(await guardianLinksCollection.getAll(), GUARDIAN_USER_ID);
  if (!connectedLink || connectedLink.elderlyUserId !== ELDERLY_USER_ID) {
    throw new Error('expected connected link to resolve to elderly user');
  }

  const bloodPressureMed: Medication = {
    id: createId('medication'),
    userId: ELDERLY_USER_ID,
    name: '혈압약',
    timesOfDay: ['08:00'],
    conflictFoods: ['자몽'],
    createdAt: `${TODAY}T07:10:00.000Z`,
  };
  const diabetesMed: Medication = {
    id: createId('medication'),
    userId: ELDERLY_USER_ID,
    name: '당뇨약',
    timesOfDay: ['09:00'],
    conflictFoods: [],
    createdAt: `${TODAY}T07:11:00.000Z`,
  };
  await medicationsCollection.upsert(bloodPressureMed);
  await medicationsCollection.upsert(diabetesMed);
  await medicationsCollection.remove(diabetesMed.id);

  const remainingMeds = await medicationsCollection.query((item) => item.userId === ELDERLY_USER_ID);
  if (remainingMeds.length !== 1 || remainingMeds[0].name !== '혈압약') {
    throw new Error(`expected 1 remaining medication after delete, got ${remainingMeds.length}`);
  }

  const badCheckIn: CheckIn = {
    id: createId('checkin'),
    userId: ELDERLY_USER_ID,
    date: TODAY,
    condition: 'bad',
    hadMeal: true,
    note: null,
    recordedAt: `${TODAY}T07:30:00.000Z`,
  };
  const candidates = buildAlertCandidates(
    ELDERLY_USER_ID,
    new Date(`${TODAY}T20:00:00`),
    [badCheckIn],
    [],
    remainingMeds,
    [],
    true,
  );
  const highRiskCandidate = candidates.find((item) => item.type === 'high_risk');
  if (!highRiskCandidate) {
    throw new Error('expected a high_risk alert candidate for a bad check-in');
  }
  await guardianAlertsCollection.upsert({
    ...highRiskCandidate,
    createdAt: `${TODAY}T20:00:00.000Z`,
    acknowledged: false,
    comment: null,
  });

  const alerts = await guardianAlertsCollection.query((item) => item.elderlyUserId === ELDERLY_USER_ID);
  if (alerts.length !== 1) {
    throw new Error(`expected 1 alert, got ${alerts.length}`);
  }
  await guardianAlertsCollection.upsert({ ...alerts[0], comment: '병원 방문 예약함' });
  await guardianCareActionsCollection.upsert({ id: createId('care-action'), guardianUserId: GUARDIAN_USER_ID, elderlyUserId: ELDERLY_USER_ID, type: 'requestMealRecord', message: '식사 기록을 부탁드렸어요.', createdAt: `${TODAY}T20:10:00.000Z` });

  console.log('GUARDIAN_WRITE_PHASE_OK');
}

async function readPhase() {
  const links = await guardianLinksCollection.getAll();
  const connectedLink = findConnectedLink(links, GUARDIAN_USER_ID);
  if (!connectedLink || connectedLink.status !== 'connected' || connectedLink.elderlyUserId !== ELDERLY_USER_ID) {
    throw new Error('guardian link connection did not persist after restart');
  }

  const meds = await medicationsCollection.query((item) => item.userId === ELDERLY_USER_ID);
  if (meds.length !== 1 || meds[0].name !== '혈압약') {
    throw new Error(`expected 1 persisted medication after restart, got ${meds.length}`);
  }

  const alerts = await guardianAlertsCollection.query((item) => item.elderlyUserId === ELDERLY_USER_ID);
  if (alerts.length !== 1) {
    throw new Error(`expected 1 persisted alert after restart, got ${alerts.length}`);
  }
  const alert = alerts[0];
  if (alert.type !== 'high_risk' || alert.comment !== '병원 방문 예약함' || alert.acknowledged !== false) {
    throw new Error('alert comment/state did not persist correctly after restart');
  }
  const careActions = await guardianCareActionsCollection.query((item) => item.elderlyUserId === ELDERLY_USER_ID);
  if (careActions.length !== 1 || careActions[0].type !== 'requestMealRecord') {
    throw new Error('guardian care action did not persist after restart');
  }

  console.log(
    'SMOKE TEST PASSED: guardian connect, medication add/delete, and alert generation/comment persisted across simulated restart',
    { elderlyUserId: connectedLink.elderlyUserId, medicationCount: meds.length, alertComment: alert.comment, careAction: careActions[0].type },
  );
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
