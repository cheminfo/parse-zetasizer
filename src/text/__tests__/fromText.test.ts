import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { fromText } from '../fromText.ts';

const text = readFileSync(
  join(import.meta.dirname, 'data/particleSize.txt'),
  'utf8',
);

test('parse zetasizer text export with 3 records', () => {
  const result = fromText(text);

  expect(result.records).toHaveLength(3);

  const firstRecord = result.records[0];

  expect(firstRecord).toBeDefined();

  expect(Object.keys(firstRecord?.arrays ?? {})).toStrictEqual([
    'Sizes',
    'Intensities',
    'Volumes',
    'Numbers',
    'Undersize By Intensity',
  ]);

  const sizes = firstRecord?.arrays.Sizes;

  expect(sizes?.units).toBe('d.nm');
  expect(sizes?.data).toHaveLength(70);
  expect(sizes?.data[0]).toBe(0.4);
  expect(sizes?.data[69]).toBe(1e4);

  const intensities = firstRecord?.arrays.Intensities;

  expect(intensities?.units).toBe('Percent');
  expect(intensities?.data).toHaveLength(70);

  expect(firstRecord?.meta['Sample Name']).toBe('20260916_SiNP_7 1');
  expect(firstRecord?.meta['Serial Number']).toBe('MAL1086580');
  expect(firstRecord?.meta['Temperature (\uFFFDC)']).toBe(25);
  expect(firstRecord?.meta.Type).toBe('Size');
  expect(firstRecord?.meta['Record Number']).toBe(20);
});

test('empty input returns empty records', () => {
  expect(fromText('')).toStrictEqual({ records: [] });
});

test('header-only input returns empty records', () => {
  expect(fromText('Col1\tCol2\n')).toStrictEqual({ records: [] });
});

test('single scalar row', () => {
  const input = 'Name\tValue\nfoo\t42';
  const result = fromText(input);

  expect(result.records).toHaveLength(1);
  expect(result.records[0]?.meta.Name).toBe('foo');
  expect(result.records[0]?.meta.Value).toBe(42);
});

test('array columns without units', () => {
  const input = 'X[1]\tX[2]\tX[3]\ndata\n1\t2\t3';
  const result = fromText(input);

  expect(result.records).toHaveLength(2);

  const arrays = result.records[1]?.arrays;

  expect(arrays?.X?.units).toBe('');
  expect(arrays?.X?.data).toStrictEqual(new Float64Array([1, 2, 3]));
});
