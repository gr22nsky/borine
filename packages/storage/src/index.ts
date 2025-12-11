import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('AsyncStorage save failed', err);
    throw err;
  }
}

export async function updateJson<T>(key: string, updater: (current: T) => T, fallback: T): Promise<T> {
  const current = await loadJson<T>(key, fallback);
  const next = updater(current);
  await saveJson<T>(key, next);
  return next;
}
