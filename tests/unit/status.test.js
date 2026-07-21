import { describe, expect, it } from 'vitest';
import { deriveState } from '../../src/status.js';

const base = {
  config: { id: 'x', name: 'X', description: 'x', owner: 'o', repo: 'r', publicUrl: 'https://example.com', developmentStatus: 'active' },
  fetchedAt: '2026-07-21T12:00:00Z', fromCache: false, jobs: [], pullRequests: [], errors: [],
};

describe('deriveState', () => {
  it('marks successful verified deployment as healthy', () => {
    const result = deriveState({
      ...base,
      deployRun: { status: 'completed', conclusion: 'success' },
      latestRun: { status: 'completed', conclusion: 'success', updated_at: '2026-07-21T11:59:00Z' },
      commit: { commit: { author: { date: '2026-07-21T11:58:00Z' } } },
      jobs: [
        { name: 'Unit tests', status: 'completed', conclusion: 'success' },
        { name: 'Build', status: 'completed', conclusion: 'success' },
        { name: 'Chromium', status: 'completed', conclusion: 'success' },
        { name: 'WebKit', status: 'completed', conclusion: 'success' },
      ],
    });
    expect(result.overall.label).toBe('公開中');
    expect(result.webkit.tone).toBe('success');
  });

  it('surfaces browser failure', () => {
    const result = deriveState({
      ...base,
      deployRun: { status: 'completed', conclusion: 'success' },
      jobs: [{ name: 'Chromium', status: 'completed', conclusion: 'failure' }],
    });
    expect(result.overall.label).toBe('テスト失敗');
    expect(result.chromium.tone).toBe('danger');
  });

  it('keeps missing data explicit', () => {
    const result = deriveState({ ...base, errors: [{ endpoint: '/x', message: 'HTTP 403' }] });
    expect(result.overall.label).toBe('未確認');
    expect(result.nextAction).toContain('取得失敗');
  });
});
