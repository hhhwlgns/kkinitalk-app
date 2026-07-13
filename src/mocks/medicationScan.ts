// Mock "AI" medication photo analysis.
// Mirrors the prototype's 약 사진 스캔 흐름 (예: 아모디핀정 5mg → 혈압약 → 자몽 경고).
// There is no real vision model — this returns a plausible result from a small bank,
// keeping the "참고용" (reference only) framing required by the product spec.

export interface MedicationScanResult {
  // Recognized product name shown to the user (e.g. 아모디핀정 5mg).
  productName: string;
  // Category keyword that maps onto conflict rules and reminders (e.g. 혈압약).
  category: string;
  // Human-readable dosing hint (e.g. 하루 1번).
  dosageHint: string;
  // Suggested default times of day in HH:MM (used to prefill the schedule).
  suggestedTimes: string[];
  // Foods that conflict with this medication, if any (drives the conflict warning).
  conflictFoods: string[];
  // Short caution sentence, elder-friendly. Null when there is no known conflict.
  conflictNote: string | null;
}

const SCAN_BANK: MedicationScanResult[] = [
  {
    productName: '아모디핀정 5mg',
    category: '혈압약',
    dosageHint: '혈압약 · 하루 1번',
    suggestedTimes: ['08:00'],
    conflictFoods: ['자몽'],
    conflictNote: '자몽하고 같이 드시면 안 돼요.',
  },
  {
    productName: '메트포르민정 500mg',
    category: '당뇨약',
    dosageHint: '당뇨약 · 하루 2번',
    suggestedTimes: ['08:00', '18:00'],
    conflictFoods: ['자몽'],
    conflictNote: '자몽과 함께 드시면 약효에 영향을 줄 수 있어요.',
  },
  {
    productName: '아세트아미노펜정 500mg',
    category: '관절약',
    dosageHint: '진통제 · 필요할 때',
    suggestedTimes: ['12:30'],
    conflictFoods: ['술'],
    conflictNote: '술과 함께 드시면 속이 상할 수 있어요.',
  },
  {
    productName: '오메가3 연질캡슐',
    category: '영양제',
    dosageHint: '영양제 · 하루 1번',
    suggestedTimes: ['08:00'],
    conflictFoods: [],
    conflictNote: null,
  },
];

// Returns a deterministic-when-seeded pick so screens can vary results without a real model.
export function analyzeMockMedicationPhoto(seedIndex?: number): MedicationScanResult {
  const index =
    seedIndex !== undefined ? seedIndex % SCAN_BANK.length : Math.floor(Math.random() * SCAN_BANK.length);
  return SCAN_BANK[index];
}

// Manual-entry name options (used by the "직접 고르기" fallback), aligned with the prototype.
export const MEDICATION_NAME_OPTIONS = ['혈압약', '당뇨약', '영양제'];

// Suggested time chips shown as HH:MM with a friendly label.
export const MEDICATION_TIME_OPTIONS: { label: string; value: string }[] = [
  { label: '아침 8:00', value: '08:00' },
  { label: '점심 12:30', value: '12:30' },
  { label: '저녁 7:00', value: '19:00' },
];
