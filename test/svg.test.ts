import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSvg, type BuildSvgParams } from '../scripts/lib/svg.js';
import type { DisplaySafePublicRepo, DisplaySafePrivateRepo } from '../scripts/lib/mask.js';

function mockPublicRepo(name: string, language: string | null = 'TypeScript'): DisplaySafePublicRepo {
  return {
    owner: 'maya-thorne',
    name,
    visibility: 'public',
    isPrivate: false,
    fork: false,
    archived: false,
    language,
    stargazers: 0,
    updatedAt: '2026-10-13T00:00:00Z',
    description: null,
    topics: [],
  };
}

function mockPrivateRepo(maskedName: string): DisplaySafePrivateRepo {
  return {
    owner: 'maya-thorne',
    name: maskedName,
    visibility: 'private',
    isPrivate: true,
    fork: false,
    archived: false,
    language: null,
    stargazers: 0,
    updatedAt: '2026-10-13T00:00:00Z',
  };
}

test('buildSvg: header title and metric chips never overlap on standard account', () => {
  const params: BuildSvgParams = {
    date: '2026-10-13',
    account: 'maya-thorne',
    groups: [
      {
        login: 'maya-thorne',
        type: 'account',
        repos: [
          mockPublicRepo('github-org-map', 'TypeScript'),
          mockPublicRepo('ring-io', 'C'),
          mockPrivateRepo('······fb7ffb'),
        ],
      },
    ],
    summary: {
      publicCount: 2,
      privateCount: 1,
      languages: [
        { language: 'TypeScript', count: 1 },
        { language: 'C', count: 1 },
      ],
    },
    showForkArchivedInfo: false,
  };

  const svg = buildSvg(params);

  // Parse width from viewBox
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.ok(viewBoxMatch, 'SVG must have valid viewBox');
  const width = parseInt(viewBoxMatch[1], 10);
  assert.ok(width >= 820, `Canvas width (${width}) should be at least 820px`);

  // Extract metric chip coordinates
  const row1PublicMatch = svg.match(/<!-- Metric Chip 1: Public[^>]*-->\s*<g transform="translate\((\d+(?:\.\d+)?), 10\)">/);
  assert.ok(row1PublicMatch, 'Metric Chip 1 must exist with y=10');
  const chip1X = parseFloat(row1PublicMatch[1]);

  const row2LangMatch = svg.match(/<!-- Metric Chip 3: Languages[^>]*-->\s*<g transform="translate\((\d+(?:\.\d+)?), 34\)">/);
  assert.ok(row2LangMatch, 'Metric Chip 3 must exist with y=34');
  const chip3X = parseFloat(row2LangMatch[1]);

  // Title starts at x=60. Estimated title width for "GitHub Organization Map — maya-thorne" is ~330px (x <= 390).
  const titleRightBound = 60 + 'GitHub Organization Map — maya-thorne'.length * 9;
  assert.ok(chip1X > titleRightBound + 20, `Chip 1 X (${chip1X}) must be well past title right bound (${titleRightBound})`);

  // Subtitle starts at x=60. Estimated subtitle width for "SNAPSHOT: 2026-10-13 · DAILY TELEMETRY" is ~250px (x <= 310).
  const subtitleRightBound = 60 + 'SNAPSHOT: 2026-10-13 · DAILY TELEMETRY'.length * 7.5;
  assert.ok(chip3X > subtitleRightBound + 20, `Chip 3 X (${chip3X}) must be well past subtitle right bound (${subtitleRightBound})`);
});

test('buildSvg: dynamic expansion prevents collision even with long names and multiple languages', () => {
  const longAccount = 'very-long-security-organization-name-sample';
  const params: BuildSvgParams = {
    date: '2026-10-13',
    account: longAccount,
    groups: [
      {
        login: longAccount,
        type: 'org',
        repos: [],
      },
    ],
    summary: {
      publicCount: 12,
      privateCount: 4,
      languages: [
        { language: 'TypeScript', count: 5 },
        { language: 'Python', count: 4 },
        { language: 'C++', count: 3 },
      ],
    },
    showForkArchivedInfo: false,
  };

  const svg = buildSvg(params);

  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.ok(viewBoxMatch, 'SVG must have valid viewBox');
  const width = parseInt(viewBoxMatch[1], 10);

  const row1PublicMatch = svg.match(/<!-- Metric Chip 1: Public[^>]*-->\s*<g transform="translate\((\d+(?:\.\d+)?), 10\)">/);
  assert.ok(row1PublicMatch);
  const chip1X = parseFloat(row1PublicMatch[1]);

  const titleRightBound = 60 + `GitHub Organization Map — ${longAccount}`.length * 8.8;
  assert.ok(chip1X > titleRightBound + 20, `Chip 1 X (${chip1X}) must never collide with long title (${titleRightBound})`);
});
