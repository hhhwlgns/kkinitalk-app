import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Role } from '../domain/types';

const ROLE_STORAGE_KEY = 'kkinitalk:activeRole';
const ACTIVE_USER_STORAGE_KEY = 'kkinitalk:activeUserId';

interface RoleContextValue {
  role: Role | null;
  activeUserId: string | null;
  isLoading: boolean;
  setRole: (role: Role, userId: string) => Promise<void>;
  clearRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedRole, storedUserId] = await Promise.all([
        AsyncStorage.getItem(ROLE_STORAGE_KEY),
        AsyncStorage.getItem(ACTIVE_USER_STORAGE_KEY),
      ]);
      if (storedRole === 'elderly' || storedRole === 'guardian') {
        setRoleState(storedRole);
      }
      if (storedUserId) {
        setActiveUserId(storedUserId);
      }
      setIsLoading(false);
    })();
  }, []);

  const setRole = useCallback(async (nextRole: Role, userId: string) => {
    await Promise.all([
      AsyncStorage.setItem(ROLE_STORAGE_KEY, nextRole),
      AsyncStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId),
    ]);
    setRoleState(nextRole);
    setActiveUserId(userId);
  }, []);

  const clearRole = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(ROLE_STORAGE_KEY),
      AsyncStorage.removeItem(ACTIVE_USER_STORAGE_KEY),
    ]);
    setRoleState(null);
    setActiveUserId(null);
  }, []);

  const value = useMemo(
    () => ({ role, activeUserId, isLoading, setRole, clearRole }),
    [role, activeUserId, isLoading, setRole, clearRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return ctx;
}
