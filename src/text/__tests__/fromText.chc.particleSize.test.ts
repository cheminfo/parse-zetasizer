import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { fromText } from '../fromText.ts';

test('parse chc particle size export with summary and distribution', () => {
  const data = readFileSync(
    join(import.meta.dirname, 'data', 'chc_particleSize.txt'),
  ).buffer;
  const result = fromText(data);

  expect(result).toHaveLength(4);

  const firstRecord = result[0];

  expect(firstRecord).toBeDefined();

  const arrayKeys = Object.keys(firstRecord ?? {}).filter((k) => k !== 'meta');

  expect(arrayKeys).toStrictEqual([
    'Correlation Delay Times',
    'Correlation Data',
    'Sizes',
    'Intensities',
    'Numbers',
    'Volumes',
  ]);

  const sizes = firstRecord?.Sizes as
    | { data: Float64Array; units: string }
    | undefined;

  expect(sizes?.units).toBe('d.nm');
  expect(sizes?.data).toHaveLength(70);
  expect(sizes?.data[0]).toBe(0.4);
  expect(sizes?.data[69]).toBe(1e4);

  expect(firstRecord?.meta.Record).toBe(1);
  expect(firstRecord?.meta.Type).toBe('Size');
  expect(firstRecord?.meta['Sample Name']).toBe('SD283 - F1, HBG6.4, 0h 1');
  expect(firstRecord?.meta['Z-Ave (d.nm)']).toBe(108);
  expect(firstRecord?.meta.PdI).toBe(0.112);
  expect(firstRecord?.meta['Intensity Mean (d.nm)']).toBe(116.1);
  expect(firstRecord?.meta['Number Mean (d.nm)']).toBe(78.38);
  expect(firstRecord?.meta['Volume Mean (d.nm)']).toBe(99.31);
  expect(firstRecord?.meta['Serial Number']).toBe('MAL1143160');
  expect(firstRecord?.meta['Dispersant Name']).toBe('Water');
  expect(firstRecord?.meta['Material Name']).toBe('Chitosan');

  expect(result).toMatchSnapshot();
});
