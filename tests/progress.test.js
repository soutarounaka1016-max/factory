import { describe, expect, it } from 'vitest';
import { calculateProgress } from '../src/progress-calculator.js';

describe('calculateProgress', () => {
  it('counts only unique development milestones', () => {
    const progress = calculateProgress({
      development: 'info', tests: 'success', build: 'success', chromium: 'success', webkit: 'success', pages: 'success',
    });
    expect(progress.total).toBe(6);
    expect(progress.completed).toBe(6);
    expect(progress.percentage).toBe(99);
    expect(progress.stateLabel).toBe('主要工程確認済み');
  });

  it('shows the next incomplete milestone instead of a generic waiting label', () => {
    const progress = calculateProgress({
      development: 'info', tests: 'success', build: 'success', chromium: 'neutral', webkit: 'neutral', pages: 'neutral',
    });
    expect(progress.completed).toBe(3);
    expect(progress.percentage).toBe(45);
    expect(progress.stateLabel).toBe('次: Chromium');
  });

  it('does not reward a failed milestone with fake progress', () => {
    const progress = calculateProgress({
      development: 'info', tests: 'danger', build: 'success', chromium: 'success', webkit: 'success', pages: 'neutral',
    });
    expect(progress.percentage).toBe(55);
    expect(progress.stateLabel).toBe('修正: 通常テスト');
  });

  it('represents running work as partial progress', () => {
    const progress = calculateProgress({
      development: 'info', tests: 'running', build: 'neutral', chromium: 'neutral', webkit: 'neutral', pages: 'neutral',
    });
    expect(progress.percentage).toBe(20);
    expect(progress.stateLabel).toBe('実行中: 通常テスト');
  });
});
