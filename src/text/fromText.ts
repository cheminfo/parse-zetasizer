/**
 * Generic parser for Malvern Zetasizer tab-separated text exports.
 *
 * The parser dynamically discovers array columns (e.g., `Sizes[1] (d.nm)`)
 * and scalar metadata columns from the header row. This makes it work
 * regardless of which fields the user selected for export or which
 * instrument model produced the file.
 */

import { parseString } from 'dynamic-typing';
import type { TextData } from 'ensure-string';
import { ensureString } from 'ensure-string';

/**
 * A group of array columns sharing the same prefix (e.g., "Sizes").
 */
export interface ZetasizerArray {
  /** The data values for this array group. */
  data: Float64Array;
  /** Units extracted from the header (e.g., "d.nm", "Percent"), or empty. */
  units: string;
}

/**
 * A single measurement record parsed from one data row.
 */
export interface ZetasizerRecord {
  /** Array data columns, keyed by header prefix (e.g., "Sizes", "Intensities"). */
  arrays: Record<string, ZetasizerArray>;
  /** Scalar metadata columns, keyed by the original header name. */
  meta: Record<string, boolean | number | string>;
}

/**
 * Parse a Zetasizer tab-separated text export into structured records.
 *
 * The parser dynamically discovers columns from the header row:
 * - Columns matching `Name[N] (units)` are grouped into array data.
 * - All other columns become scalar metadata entries.
 * @param data - The raw content of the Zetasizer export file (string, ArrayBuffer, or typed array)
 * @returns Array of parsed measurement records
 */
export function fromText(data: TextData): ZetasizerRecord[] {
  const text = ensureString(data);
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) {
    return [];
  }

  const headerLine = lines[0];
  if (!headerLine) {
    return [];
  }
  const headers = headerLine.split('\t');
  const { arrayGroups, scalarIndices } = classifyColumns(headers);

  const records: ZetasizerRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = line.split('\t');

    const arrays: Record<string, ZetasizerArray> = {};
    for (const group of arrayGroups) {
      arrays[group.name] = {
        data: extractFloatArray(values, group.start, group.count),
        units: group.units,
      };
    }

    const meta: Record<string, boolean | number | string> = {};
    for (const [name, index] of scalarIndices) {
      const raw = values[index] ?? '';
      if (raw !== '') {
        meta[name] = parseString(raw);
      }
    }

    records.push({ arrays, meta });
  }

  return records;
}

interface ArrayColumnGroup {
  /** Header prefix (e.g., "Sizes"). */
  name: string;
  /** Units string from the header (e.g., "d.nm"). */
  units: string;
  /** Start column index. */
  start: number;
  /** Number of consecutive columns in this group. */
  count: number;
}

const ARRAY_HEADER_PATTERN =
  /^(?<name>.+?)\[(?:\d+)]\s*(?:\((?<units>.+?)\))?$/;

/**
 * Scan headers to identify groups of array columns and scalar columns.
 *
 * Array columns follow the pattern `Name[N] (units)` where N is sequential.
 * All other columns are treated as scalar metadata.
 * @param headers - Array of header strings
 * @returns Object with arrayGroups and scalarIndices
 */
function classifyColumns(headers: string[]): {
  arrayGroups: ArrayColumnGroup[];
  scalarIndices: Map<string, number>;
} {
  const arrayGroups: ArrayColumnGroup[] = [];
  const scalarIndices = new Map<string, number>();

  let currentGroup: ArrayColumnGroup | undefined;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i] ?? '';
    const match = ARRAY_HEADER_PATTERN.exec(header);

    if (match) {
      const name = match.groups?.name ?? '';
      const units = match.groups?.units ?? '';

      if (currentGroup?.name === name) {
        currentGroup.count++;
      } else {
        if (currentGroup) {
          arrayGroups.push(currentGroup);
        }
        currentGroup = { name, units, start: i, count: 1 };
      }
    } else {
      if (currentGroup) {
        arrayGroups.push(currentGroup);
        currentGroup = undefined;
      }
      if (header) {
        // For duplicate header names (e.g., "Sample Name" appears twice),
        // keep the last occurrence which is in the metadata section.
        scalarIndices.set(header, i);
      }
    }
  }

  if (currentGroup) {
    arrayGroups.push(currentGroup);
  }

  return { arrayGroups, scalarIndices };
}

/**
 * Extract a Float64Array from a row of tab-separated values.
 * @param values - Array of string values from the row
 * @param start - Start column index
 * @param count - Number of columns to extract
 * @returns Float64Array of parsed values
 */
function extractFloatArray(
  values: string[],
  start: number,
  count: number,
): Float64Array {
  const result = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = Number(values[start + i]);
  }
  return result;
}
