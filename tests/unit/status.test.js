import { describe, expect, it } from 'vitest';
import { deriveState } from '../../src/status.js';

const base = {
  config: { id: 'x', name: 'X', description: 'x', owner: 'o', repo: 'r', publicUrl: 'https://example.com', developmentStatus: 'active' },
  fetchedAt: '2026-07-21T12:00:00Z', fromCache: false, jobs: [], pullRequests: [], errors: [],
};

const successfulJobs = [
  { name: 'Unit tests', status: 'completed', conclusion: 'success' },
  { name: 'Build', status: 'completed', conclusion: 'success' },
  { name: 'Chromium', status: 'completed', conclusion: 'success' },
  { name: 'WebKit', status: 'completed', conclusion: 'success' },
  { name: 'Deploy Pages', status: 'completed', conclusion: 'success' },
  { name: 'Verify published URL', status: 'completed', conclusion: 'success' },
];

describe('deriveState', () => {
  it('marks successful verified deployment as healthy', () => {
    const result = deriveState({
      ...base,
      deployRun: { status: 'completed', conclusion: 'success' },
      latestRun: { status: 'completed', conclusion: 'success', updated_at: '2026-07-21T11:59:00Z' },
      commit: { commit: { author: { date: '2026-07-21T11:58:00Z' } } },
      jobs: successfulJobs,
    });
    expect(result.overall.label).toBe('公開中');
    expect(result.pages.label).toBe('公開確認済み');
    expect(result.webkit.tone).toBe('success');
  });

  it('surfaces browser failure', () => {
    const result = deriveState({
      ...base,
      jobs: [{ name: 'Chromium', status: 'completed', conclusion: 'failure' }],
    });
    expect(result.overall.label).toBe('テスト失敗');
    expect(result.chromium.tone).toBe('danger');
  });

  it('does not treat an unrelated successful workflow as test and build success', () => {
    const result = deriveState({
      ...base,
      latestRun: { name: 'Documentation', status: 'completed', conclusion: 'success' },
      deployRun: { name: 'Deploy Pages', status: 'completed', conclusion: 'success' },
      jobs: [{ name: 'Deploy Pages', status: 'completed', conclusion: 'success' }],
    });
    expect(result.tests.label).toBe('未確認');
    expect(result.build.label).toBe('未確認');
    expect(result.overall.label).not.toBe('公開中');
  });

  it('requires published URL verification before marking Pages healthy', () => {
    const result = deriveState({
      ...base,
      jobs: [
        ...successfulJobs.filter((job) => job.name !== 'Verify published URL'),
      ],
    });
    expect(result.pages.label).toBe('URL未確認');
    expect(result.publication.tone).toBe('warning');
    expect(result.overall.label).not.toBe('公開中');
  });

  it('surfaces published URL verification failure even when deploy succeeded', () => {
    const result = deriveState({
      ...base,
      jobs: [
        ...successfulJobs.filter((job) => job.name !== 'Verify published URL'),
        { name: 'Verify published URL', status: 'completed', conclusion: 'failure' },
      ],
    });
    expect(result.pages.label).toBe('公開確認失敗');
    expect(result.publication.label).toBe('公開失敗');
    expect(result.overall.label).toBe('公開失敗');
  });

  it('keeps API failure explicit', () => {
    const result = deriveState({ ...base, errors: [{ endpoint: '/x', message: 'HTTP 403' }] });
    expect(result.overall.label).toBe('一部未確認');
    expect(result.nextAction).toContain('取得失敗');
  });
});
