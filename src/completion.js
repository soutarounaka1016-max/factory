export const COMPLETION_STORAGE_KEY = 'ai-factory.completed-apps.v1';

export function normalizeCompletionMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id, completed]) => typeof id === 'string' && id.length > 0 && completed === true)
      .map(([id]) => [id, true]),
  );
}

export function readCompletionMap(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(COMPLETION_STORAGE_KEY);
    return raw ? normalizeCompletionMap(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function writeCompletionMap(map, storage = globalThis.localStorage) {
  const normalized = normalizeCompletionMap(map);
  try {
    storage?.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    return false;
  }
  return true;
}

export function isAppCompleted(id, storage = globalThis.localStorage) {
  return readCompletionMap(storage)[id] === true;
}

export function setAppCompleted(id, completed, storage = globalThis.localStorage) {
  const map = readCompletionMap(storage);
  if (completed) map[id] = true;
  else delete map[id];
  return writeCompletionMap(map, storage);
}
