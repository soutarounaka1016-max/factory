import { describe, expect, it } from 'vitest';
import {
  factory,
  formatRepositoryName,
  isDiscoverableRepository,
  mergeApps,
  pinnedApps,
  repositoryToApp,
} from './apps.js';

describe('app discovery', () => {
  it('detects a public GitHub Pages repository', () => {
    expect(isDiscoverableRepository({
      name: 'new-app',
      has_pages: true,
      private: false,
      archived: false,
      fork: false,
    }, factory)).toBe(true);
  });

  it.each([
    { name: 'codex', has_pages: true, private: false, archived: false, fork: false },
    { name: 'private-app', has_pages: true, private: true, archived: false, fork: false },
    { name: 'archived-app', has_pages: true, private: false, archived: true, fork: false },
    { name: 'forked-app', has_pages: true, private: false, archived: false, fork: true },
    { name: 'not-published', has_pages: false, private: false, archived: false, fork: false },
  ])('does not detect excluded repository $name', (repo) => {
    expect(isDiscoverableRepository(repo, factory)).toBe(false);
  });

  it('uses the Japanese override for the business idea app', () => {
    const app = repositoryToApp({
      name: 'business-idea-manager',
      owner: { login: factory.owner },
      has_pages: true,
      homepage: '',
      archived: false,
      pushed_at: '2026-07-22T00:00:00Z',
    });

    expect(app.name).toBe('事業アイデア管理アプリ');
    expect(app.publicUrl).toBe('https://soutarounaka1016-max.github.io/business-idea-manager/');
  });

  it('creates a readable name and Pages URL for a future app', () => {
    const app = repositoryToApp({
      name: 'customer-support-tool',
      owner: { login: factory.owner },
      description: '問い合わせ対応を整理するアプリ。',
      has_pages: true,
      homepage: '',
      archived: false,
    });

    expect(formatRepositoryName(app.repo)).toBe('Customer Support Tool');
    expect(app.name).toBe('Customer Support Tool');
    expect(app.publicUrl).toBe('https://soutarounaka1016-max.github.io/customer-support-tool/');
  });

  it('merges pinned and discovered apps without duplicates', () => {
    const discovered = repositoryToApp({
      name: 'study-canvas',
      owner: { login: factory.owner },
      description: 'API description',
      has_pages: true,
      archived: false,
      pushed_at: '2026-07-22T00:00:00Z',
    });
    const merged = mergeApps(pinnedApps, [discovered]);

    expect(merged.filter((app) => app.repo === 'study-canvas')).toHaveLength(1);
    expect(merged.find((app) => app.repo === 'study-canvas')?.name).toBe('Study Canvas');
  });
});
