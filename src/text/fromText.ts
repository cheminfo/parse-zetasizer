/**
 * Generic parser for Malvern Zetasizer tab-separated text exports.
 *
 * The parser dynamically discovers array columns (e.g., `Sizes[1] (d.nm)`)
 * and scalar metadata columns from the header row. This makes it work
 * regardless of which fields the user selected for export or which
 * instrument model produced the file.
 *
 * Some exports contain multiple sections (e.g., a summary table followed
 * by a distribution table). The parser detects new header rows and merges
 * corresponding records from each section.
 */

import { parseString } from 'dynamic-typing';
import type { TextData } from 'ensure-string';
import { ensureString } from 'ensure-string';

/**
 * A peak detected in a distribution, with its position and width.
 */
export interface ZetasizerDistribution {
  /** Peak position (e.g., in d.nm for size distributions). */
  peak: number;
  /** Peak width (e.g., in d.nm for size distributions). */
  width: number;
}

/**
 * A group of array columns sharing the same prefix (e.g., "Sizes").
 */
export interface ZetasizerArray {
  /** The data values for this array group. */
  data: Float64Array;
  /** Units extracted from the header (e.g., "d.nm", "Percent"), or empty. */
  units: string;
  /** Mean value for this distribution, if available. */
  mean?: number;
  /** Non-zero peaks detected in this distribution, if available. */
  distributions?: ZetasizerDistribution[];
}

/**
 * A single measurement record parsed from one data row.
 *
 * Array data columns (e.g., "Sizes", "Intensities") are stored directly
 * as properties alongside `meta`.
 */
export interface ZetasizerRecord {
  /** Scalar metadata columns, keyed by the original header name. */
  meta: Record<string, boolean | number | string>;
  /** Array data columns, keyed by header prefix (e.g., "Sizes", "Intensities"). */
  [key: string]: ZetasizerArray | Record<string, boolean | number | string>;
}

/**
 * Parse a Zetasizer tab-separated text export into structured records.
 *
 * The parser dynamically discovers columns from the header row:
 * - Columns matching `Name[N] (units)` are grouped into array data.
 * - All other columns become scalar metadata entries.
 *
 * Files may contain multiple sections with different headers. Each new
 * header row starts a new section, and records are merged across sections
 * in order.
 * @param data - The raw content of the Zetasizer export file (string, ArrayBuffer, or typed array)
 * @returns Array of parsed measurement records
 */
export function fromText(data: TextData): ZetasizerRecord[] {
  const text = ensureString(data);
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) {
    return [];
  }

  const sections = splitSections(lines);
  const sectionResults: ZetasizerRecord[][] = [];

  for (const section of sections) {
    const headers = section[0]?.split('\t') ?? [];
    const { arrayGroups, scalarIndices } = classifyColumns(headers);
    const records: ZetasizerRecord[] = [];

    for (let i = 1; i < section.length; i++) {
      const line = section[i];
      if (!line) continue;
      const values = line.split('\t');

      const record: ZetasizerRecord = { meta: {} };
      for (const group of arrayGroups) {
        record[group.name] = {
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
      record.meta = meta;

      records.push(record);
    }

    sectionResults.push(records);
  }

  const records = mergeSections(sectionResults);
  extractDistributionParameters(records);
  return records;
}

/**
 * Split lines into sections, each starting with a header row.
 *
 * The first line is always treated as a header. Subsequent lines that
 * contain array column patterns (e.g., `Name[1]`) are detected as new
 * header rows, starting a new section.
 * @param lines - Non-empty lines from the file
 * @returns Array of sections, each being an array of lines (header + data)
 */
function splitSections(lines: string[]): string[][] {
  const sections: string[][] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (i === 0) {
      current.push(line);
    } else if (isHeaderLine(line)) {
      if (current.length > 0) {
        sections.push(current);
      }
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    sections.push(current);
  }

  return sections;
}

const ARRAY_HEADER_PATTERN =
  /^(?<name>.+?)\[(?:\d+)]\s*(?:\((?<units>.+?)\))?$/;

/**
 * Check if a line looks like a header row by testing whether any
 * tab-separated value matches the array column pattern.
 * @param line - A line from the file
 * @returns True if the line appears to be a header row
 */
function isHeaderLine(line: string): boolean {
  const fields = line.split('\t');
  return fields.some((field) => ARRAY_HEADER_PATTERN.test(field));
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
 * Merge records from multiple sections by index. Records at the same
 * position across sections are combined, with later sections' metadata
 * and arrays added to earlier ones.
 * @param sectionResults - Array of record arrays, one per section
 * @returns Merged array of records
 */
function mergeSections(sectionResults: ZetasizerRecord[][]): ZetasizerRecord[] {
  if (sectionResults.length === 0) return [];
  if (sectionResults.length === 1) return sectionResults[0] ?? [];

  const maxLength = Math.max(...sectionResults.map((s) => s.length));
  const merged: ZetasizerRecord[] = [];

  for (let i = 0; i < maxLength; i++) {
    const record: ZetasizerRecord = { meta: {} };

    for (const section of sectionResults) {
      const sectionRecord = section[i];
      if (!sectionRecord) continue;
      for (const [key, value] of Object.entries(sectionRecord)) {
        if (key === 'meta') {
          Object.assign(
            record.meta,
            value as Record<string, boolean | number | string>,
          );
        } else {
          record[key] = value;
        }
      }
    }

    merged.push(record);
  }

  return merged;
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

const MEAN_PATTERN = /^(.+?)\s+Mean\s+\(/i;
const WIDTH_PEAK_PATTERN = /^(.+?)\s+Width\s+Peak\s+(\d+)\s+\(/i;
const PEAK_PATTERN = /^(.+?)\s+Peak\s+(\d+)\s+\(/i;

/**
 * Find the array name that matches a given prefix (e.g., "Intensity" → "Intensities").
 * @param record - The record to search for matching array entries
 * @param prefix - The prefix to match (e.g., "Intensity")
 * @returns The matching array name, or undefined
 */
function findArrayByPrefix(
  record: ZetasizerRecord,
  prefix: string,
): string | undefined {
  const lowerPrefix = prefix.toLowerCase();
  // Handle y→ies pluralization (e.g., "Intensity" → "Intensities")
  const altPrefix = lowerPrefix.replace(/y$/, 'i');
  return Object.keys(record)
    .filter((key) => key !== 'meta')
    .find((name) => {
      const lowerName = name.toLowerCase();
      return (
        lowerName.startsWith(lowerPrefix) || lowerName.startsWith(altPrefix)
      );
    });
}

/**
 * Get or create a peak entry in the peak data map.
 * @param peakData - Map of array name to peak number to peak data
 * @param arrayName - The array name to look up
 * @param peakNumber - The peak number to look up
 * @returns The peak entry object
 */
function getOrCreatePeak(
  peakData: Map<string, Map<number, { position?: number; width?: number }>>,
  arrayName: string,
  peakNumber: number,
): { position?: number; width?: number } {
  let peaks = peakData.get(arrayName);
  if (!peaks) {
    peaks = new Map();
    peakData.set(arrayName, peaks);
  }
  let entry = peaks.get(peakNumber);
  if (!entry) {
    entry = {};
    peaks.set(peakNumber, entry);
  }
  return entry;
}

/**
 * Extract distribution-specific parameters (mean, peaks, widths) from scalar
 * metadata and attach them to their corresponding array entries.
 *
 * Matched keys are removed from `meta`. Peaks where both position and width
 * are zero are filtered out.
 * @param records - The parsed records to process in-place
 */
function extractDistributionParameters(records: ZetasizerRecord[]): void {
  for (const record of records) {
    const extractedKeys = new Set<string>();
    const peakData = new Map<
      string,
      Map<number, { position?: number; width?: number }>
    >();

    for (const [key, value] of Object.entries(record.meta)) {
      if (typeof value !== 'number') continue;

      let match = MEAN_PATTERN.exec(key);
      if (match) {
        const prefix = match[1] ?? '';
        const arrayName = findArrayByPrefix(record, prefix);
        const arrayEntry = arrayName
          ? (record[arrayName] as ZetasizerArray | undefined)
          : undefined;
        if (arrayEntry) {
          arrayEntry.mean = value;
          extractedKeys.add(key);
        }
        continue;
      }

      match = WIDTH_PEAK_PATTERN.exec(key);
      if (match) {
        const prefix = match[1] ?? '';
        const peakNumber = Number(match[2]);
        const arrayName = findArrayByPrefix(record, prefix);
        if (arrayName) {
          getOrCreatePeak(peakData, arrayName, peakNumber).width = value;
          extractedKeys.add(key);
        }
        continue;
      }

      match = PEAK_PATTERN.exec(key);
      if (match) {
        const prefix = match[1] ?? '';
        const peakNumber = Number(match[2]);
        const arrayName = findArrayByPrefix(record, prefix);
        if (arrayName) {
          getOrCreatePeak(peakData, arrayName, peakNumber).position = value;
          extractedKeys.add(key);
        }
        continue;
      }
    }

    for (const [arrayName, peaks] of peakData) {
      const distributions = [...peaks.entries()]
        .toSorted((a, b) => a[0] - b[0])
        .map(([, p]) => ({ peak: p.position ?? 0, width: p.width ?? 0 }))
        .filter((p) => p.peak !== 0 || p.width !== 0);

      const arrayEntry = record[arrayName] as ZetasizerArray | undefined;
      if (distributions.length > 0 && arrayEntry) {
        arrayEntry.distributions = distributions;
      }
    }

    const filteredMeta: Record<string, boolean | number | string> = {};
    for (const [key, value] of Object.entries(record.meta)) {
      if (!extractedKeys.has(key)) {
        filteredMeta[key] = value;
      }
    }
    record.meta = filteredMeta;
  }
}
