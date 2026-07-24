export const PRIORITY_STORAGE_KEY = 'ai-factory.app-priorities.v1';

const clamp = (value, fallback = 3) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.min(5, Math.round(number))) : fallback;
};

export function readPriorityMap(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(PRIORITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id]) => typeof id === 'string' && id).map(([id, value]) => [id, clamp(value)]));
  } catch {
    return {};
  }
}

export function getAppPriority(id, fallback = 3, storage = globalThis.localStorage) {
  return readPriorityMap(storage)[id] ?? clamp(fallback);
}

export function setAppPriority(id, value, storage = globalThis.localStorage) {
  if (!id) return false;
  const map = readPriorityMap(storage);
  map[id] = clamp(value);
  try {
    storage?.setItem(PRIORITY_STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}
