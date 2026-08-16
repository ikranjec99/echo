import { describe, expect, it } from 'vitest';
import {
  parseRuleBackup,
  prepareRulesForImport,
  serializeRuleBackup,
} from '../lib/rule-backup';
import type { InterceptorRule } from '../types/rules';

const rule: InterceptorRule = {
  id: 'rule-1',
  name: 'Block analytics',
  enabled: true,
  urlPattern: '||analytics.example.com^',
  action: { type: 'block' },
  createdAt: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:00:00.000Z',
};

describe('rule backups', () => {
  it('serializes and parses a versioned backup', () => {
    const contents = serializeRuleBackup(
      [rule],
      '2026-08-16T01:00:00.000Z',
    );

    expect(JSON.parse(contents)).toMatchObject({
      formatVersion: 1,
      exportedAt: '2026-08-16T01:00:00.000Z',
    });
    expect(parseRuleBackup(contents)).toEqual([rule]);
  });

  it('rejects invalid JSON and unsupported backup versions', () => {
    expect(() => parseRuleBackup('{')).toThrow('not valid JSON');
    expect(() =>
      parseRuleBackup(JSON.stringify({ formatVersion: 2, rules: [] })),
    ).toThrow('version is not supported');
  });

  it('rejects malformed and invalid rules', () => {
    expect(() =>
      parseRuleBackup(
        JSON.stringify({ formatVersion: 1, rules: [{ id: 'broken' }] }),
      ),
    ).toThrow('malformed rules');

    expect(() =>
      parseRuleBackup(
        JSON.stringify({
          formatVersion: 1,
          rules: [{ ...rule, name: '' }],
        }),
      ),
    ).toThrow('not valid in Echo');
  });

  it('rejects duplicate identifiers', () => {
    expect(() =>
      parseRuleBackup(
        JSON.stringify({ formatVersion: 1, rules: [rule, rule] }),
      ),
    ).toThrow('duplicate rule identifiers');
  });

  it('imports rules as disabled copies with fresh identifiers', () => {
    const imported = prepareRulesForImport(
      [rule],
      () => 'imported-rule',
      '2026-08-16T02:00:00.000Z',
    );

    expect(imported).toEqual([
      {
        ...rule,
        id: 'imported-rule',
        enabled: false,
        createdAt: '2026-08-16T02:00:00.000Z',
        updatedAt: '2026-08-16T02:00:00.000Z',
      },
    ]);
  });
});
