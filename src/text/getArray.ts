import type { ZetasizerArray, ZetasizerRecord } from './fromText.ts';

/**
 * Get a ZetasizerArray from a record by name.
 *
 * Since ZetasizerRecord uses an index signature, accessing a property
 * returns a union type. This helper narrows it to ZetasizerArray.
 * @param record - Parsed Zetasizer record
 * @param name - Array name (e.g., "Sizes", "Intensities")
 * @returns The array, or undefined if not found
 */
export function getArray(
  record: ZetasizerRecord,
  name: string,
): ZetasizerArray | undefined {
  const value = record[name];
  if (value && typeof value === 'object' && 'data' in value) {
    return value as ZetasizerArray;
  }
  return undefined;
}
