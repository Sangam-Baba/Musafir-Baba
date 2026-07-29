import { MMKV } from 'react-native-mmkv';

// @ts-ignore
export const storage = new MMKV();

export const setItem = (key: string, value: string) => {
  storage.set(key, value);
};

export const getItem = (key: string): string | null => {
  return storage.getString(key) || null;
};

export const removeItem = (key: string) => {
  storage.delete(key);
};
