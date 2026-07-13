import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { consentRecordsCollection } from '../mocks/db/collections';

interface ConsentContextValue {
  highRiskSharingConsent: boolean | null;
  setHighRiskSharingConsent: (userId: string, value: boolean) => Promise<void>;
  loadHighRiskSharingConsent: (userId: string) => Promise<boolean>;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [highRiskSharingConsent, setHighRiskSharingConsentState] = useState<boolean | null>(null);

  const loadHighRiskSharingConsent = useCallback(async (userId: string) => {
    const record = await consentRecordsCollection.getById(userId);
    const value = record?.highRiskSharingConsent ?? false;
    setHighRiskSharingConsentState(value);
    return value;
  }, []);

  const setHighRiskSharingConsent = useCallback(async (userId: string, value: boolean) => {
    await consentRecordsCollection.upsert({
      id: userId,
      userId,
      highRiskSharingConsent: value,
      updatedAt: new Date().toISOString(),
    });
    setHighRiskSharingConsentState(value);
  }, []);

  const value = useMemo(
    () => ({ highRiskSharingConsent, setHighRiskSharingConsent, loadHighRiskSharingConsent }),
    [highRiskSharingConsent, setHighRiskSharingConsent, loadHighRiskSharingConsent],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return ctx;
}
