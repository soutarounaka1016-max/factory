import { describe, expect, it } from 'vitest';
import { PRIORITY_STORAGE_KEY, getAppPriority, readPriorityMap, setAppPriority } from '../../src/priority.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('priority storage', () => {
  it('uses the configured fallback when no saved value exists', () => {
    expect(getAppPriority('study-canvas', 5, memoryStorage())).toBe(5);
  });

  it('saves and restores a user selected priority', () => {
    const storage = memoryStorage();
    expect(setAppPriority('study-canvas', 4, storage)).toBe(true);
    expect(getAppPriority('study-canvas', 2, storage)).toBe(4);
  });

  it('clamps invalid values into the supported 1 to 5 range', () => {
    const storage = memoryStorage();
    setAppPriority('high', 99, storage);
    setAppPriority('low', -5, storage);
    expect(readPriorityMap(storage)).toEqual({ high: 5, low: 1 });
  });

  it('recovers safely from broken saved data', () => {
    const storage = memoryStorage({ [PRIORITY_STORAGE_KEY]: '{broken' });
    expect(readPriorityMap(storage)).toEqual({});
  });
});
