import type { ResponseHeaderOperation } from '../types/rules';

export function parseSetResponseHeaders(
  value: string,
): ResponseHeaderOperation[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(':');

      return {
        operation: 'set' as const,
        header: (separatorIndex === -1
          ? line
          : line.slice(0, separatorIndex)
        ).trim().toLowerCase(),
        value: separatorIndex === -1 ? '' : line.slice(separatorIndex + 1).trim(),
      };
    });
}

export function parseRemoveResponseHeaders(
  value: string,
): ResponseHeaderOperation[] {
  return value
    .split(/[\n,]/u)
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean)
    .map((header) => ({ operation: 'remove' as const, header }));
}

export function formatSetResponseHeaders(
  operations: ResponseHeaderOperation[],
): string {
  return operations
    .filter(
      (operation): operation is Extract<
        ResponseHeaderOperation,
        { operation: 'set' }
      > => operation.operation === 'set',
    )
    .map(({ header, value }) => `${header}: ${value}`)
    .join('\n');
}

export function formatRemoveResponseHeaders(
  operations: ResponseHeaderOperation[],
): string {
  return operations
    .filter(({ operation }) => operation === 'remove')
    .map(({ header }) => header)
    .join('\n');
}
