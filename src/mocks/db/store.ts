import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'kkinitalk:db:';

interface WithId {
  id: string;
}

export interface Collection<T extends WithId> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  query(predicate: (item: T) => boolean): Promise<T[]>;
  upsert(item: T): Promise<T>;
  remove(id: string): Promise<void>;
  replaceAll(items: T[]): Promise<void>;
}

export function createCollection<T extends WithId>(name: string): Collection<T> {
  const storageKey = `${KEY_PREFIX}${name}`;

  async function readAll(): Promise<T[]> {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as T[];
  }

  async function writeAll(items: T[]): Promise<void> {
    await AsyncStorage.setItem(storageKey, JSON.stringify(items));
  }

  return {
    getAll: readAll,

    async getById(id: string) {
      const items = await readAll();
      return items.find((item) => item.id === id) ?? null;
    },

    async query(predicate: (item: T) => boolean) {
      const items = await readAll();
      return items.filter(predicate);
    },

    async upsert(item: T) {
      const items = await readAll();
      const index = items.findIndex((existing) => existing.id === item.id);
      if (index === -1) {
        items.push(item);
      } else {
        items[index] = item;
      }
      await writeAll(items);
      return item;
    },

    async remove(id: string) {
      const items = await readAll();
      await writeAll(items.filter((item) => item.id !== id));
    },

    replaceAll: writeAll,
  };
}

export async function resetAllMockData(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const kkinitalkKeys = allKeys.filter((key) => key.startsWith('kkinitalk:'));
  if (kkinitalkKeys.length > 0) {
    await AsyncStorage.multiRemove(kkinitalkKeys);
  }
}
