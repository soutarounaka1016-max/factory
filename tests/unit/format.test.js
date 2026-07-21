import { describe, expect, it } from 'vitest';
import { firstLine, shortSha } from '../../src/format.js';

describe('format helpers', () => {
  it('shortens SHA', () => expect(shortSha('123456789')).toBe('1234567'));
  it('uses first commit line', () => expect(firstLine('feat: x\n\nbody')).toBe('feat: x'));
  it('shows unknown explicitly', () => expect(firstLine()).toBe('未確認'));
});
