import { describe, expect, it } from 'vitest';
import {
  COMPLETION_STORAGE_KEY,
  isAppCompleted,
  normalizeCompletionMap,
  readCompletionMap,
  setAppCompleted,
} from '../../src/completion.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('completion storage', () => {
  it('keeps only true completion flags', () => {
    expect(normalizeCompletionMap({ app1: true, app2: false, app3: 'true' })).toEqual({ app1: true });
  });

  it('saves completion and restores it after reload', () => {
    const storage = memoryStorage();
    expect(setAppCompleted('study-canvas', true, storage)).toBe(true);
    expect(isAppCompleted('study-canvas', storage)).toBe(true);
    expect(readCompletionMap(storage)).toEqual({ 'study-canvas': true });
  });

  it('can return a completed app to development', () => {
    const storage = memoryStorage({
      [COMPLETION_STORAGE_KEY]: JSON.stringify({ app1: true }),
    });
    expect(setAppCompleted('app1', false, storage)).toBe(true);
    expect(isAppCompleted('app1', storage)).toBe(false);
  });

  it('recovers safely from broken saved data', () => {
    const storage = memoryStorage({ [COMPLETION_STORAGE_KEY]: '{broken' });
    expect(readCompletionMap(storage)).toEqual({});
  });
});
