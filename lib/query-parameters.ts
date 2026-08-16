import type { QueryParameter } from '../types/rules';

export function parseAddOrReplaceParams(value: string): QueryParameter[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf('=');

      return separatorIndex === -1
        ? { key: line, value: '' }
        : {
            key: line.slice(0, separatorIndex).trim(),
            value: line.slice(separatorIndex + 1),
          };
    });
}

export function parseRemoveParams(value: string): string[] {
  return value
    .split(/[\n,]/u)
    .map((key) => key.trim())
    .filter(Boolean);
}

export function formatAddOrReplaceParams(params: QueryParameter[]): string {
  return params.map(({ key, value }) => `${key}=${value}`).join('\n');
}

export function formatRemoveParams(params: string[]): string {
  return params.join('\n');
}
