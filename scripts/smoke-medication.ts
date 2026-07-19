import { medicationLogsCollection, medicationsCollection } from '../src/mocks/db/collections';
import { createId } from '../src/domain/id';
import type { Medication, MedicationLog } from '../src/domain/types';
import { findConflicts } from '../src/domain/conflictRules';

const USER_ID = 'elderly-self';
const TODAY = '2026-07-13';

function buildMedication(overrides: Partial<Medication>): Medication {
  return {
    id: createId('medication'),
    userId: USER_ID,
    name: '혈압약',
    timesOfDay: ['08:00', '20:00'],
    conflictFoods: [],
    createdAt: `${TODAY}T07:00:00.000Z`,
    ...overrides,
  };
}

async function writePhase() {
  const bloodPressureMed = buildMedication({ name: '혈압약', timesOfDay: ['08:00'] });
  const jointMed = buildMedication({ name: '관절약', timesOfDay: ['09:00', '21:00'], conflictFoods: ['커피'] });

  await medicationsCollection.upsert(bloodPressureMed);
  await medicationsCollection.upsert(jointMed);

  const log: MedicationLog = {
    id: createId('medlog'),
    medicationId: bloodPressureMed.id,
    userId: USER_ID,
    takenAt: `${TODAY}T08:05:00.000Z`,
    scheduledFor: `${TODAY}T08:00:00.000Z`,
  };
  await medicationLogsCollection.upsert(log);
  await medicationLogsCollection.upsert({
    id: createId('medlog'),
    medicationId: jointMed.id,
    userId: USER_ID,
    takenAt: `${TODAY}T09:15:00.000Z`,
    scheduledFor: `${TODAY}T09:00:00.000Z`,
    status: 'skipped',
    skippedReason: 'notFeelingWell',
  });

  const storedMeds = await medicationsCollection.query((item) => item.userId === USER_ID);
  const storedLogs = await medicationLogsCollection.query((item) => item.userId === USER_ID);
  if (storedMeds.length !== 2) {
    throw new Error(`expected 2 medications, got ${storedMeds.length}`);
  }
  if (storedLogs.length !== 2) {
    throw new Error(`expected 2 medication logs, got ${storedLogs.length}`);
  }

  console.log('MEDICATION_WRITE_PHASE_OK');
}

async function readPhase() {
  const storedMeds = await medicationsCollection.query((item) => item.userId === USER_ID);
  const storedLogs = await medicationLogsCollection.query((item) => item.userId === USER_ID);

  if (storedMeds.length !== 2) {
    throw new Error(`expected 2 persisted medications after restart, got ${storedMeds.length}`);
  }
  if (storedLogs.length !== 2) {
    throw new Error(`expected 2 persisted medication logs after restart, got ${storedLogs.length}`);
  }
  const skippedLog = storedLogs.find((item) => item.status === 'skipped');
  if (skippedLog?.skippedReason !== 'notFeelingWell') {
    throw new Error('skipped medication reason mismatch after restart');
  }

  const bloodPressureMed = storedMeds.find((item) => item.name === '혈압약');
  const jointMed = storedMeds.find((item) => item.name === '관절약');
  if (!bloodPressureMed || bloodPressureMed.timesOfDay.length !== 1) {
    throw new Error('blood pressure medication mismatch after restart');
  }
  if (!jointMed || jointMed.conflictFoods[0] !== '커피') {
    throw new Error('joint medication conflict food mismatch after restart');
  }

  const grapefruitWarnings = findConflicts(storedMeds, ['자몽']);
  if (grapefruitWarnings.length !== 1 || grapefruitWarnings[0].medicationName !== '혈압약') {
    throw new Error('expected exactly one grapefruit conflict warning for the blood pressure medication');
  }

  const coffeeWarnings = findConflicts(storedMeds, ['커피']);
  if (coffeeWarnings.length !== 1 || coffeeWarnings[0].medicationName !== '관절약') {
    throw new Error('expected coffee conflict warning for the joint medication via conflictFoods list');
  }

  const noConflictWarnings = findConflicts(storedMeds, ['사과']);
  if (noConflictWarnings.length !== 0) {
    throw new Error('expected no conflict warnings for an unrelated food');
  }

  console.log(
    'SMOKE TEST PASSED: medication + medication log records persisted across simulated restart, and conflict rules correctly flag grapefruit/coffee but not unrelated foods',
    { medicationCount: storedMeds.length, logCount: storedLogs.length, grapefruitWarnings, coffeeWarnings },
  );
}

const phase = process.argv[2];

const run = phase === 'write' ? writePhase() : readPhase();

run.catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
