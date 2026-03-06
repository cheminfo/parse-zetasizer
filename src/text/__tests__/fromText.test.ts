import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { fromText } from '../fromText.ts';

function readDataFile(filename: string): string {
  return readFileSync(join(import.meta.dirname, 'data', filename), 'utf8');
}

test('parse zetasizer text export with 3 records', () => {
  const result = fromText(readDataFile('particleSize.txt'));

  expect(result).toHaveLength(3);

  const firstRecord = result[0];

  expect(firstRecord).toBeDefined();

  expect(Object.keys(firstRecord?.arrays ?? {})).toStrictEqual([
    'Sizes',
    'Intensities',
    'Volumes',
    'Numbers',
    'Undersize By Intensity',
  ]);

  for (const array of Object.values(firstRecord?.arrays ?? {})) {
    expect(array.data).toHaveLength(70);
  }

  const sizes = firstRecord?.arrays.Sizes;

  expect(sizes?.units).toBe('d.nm');
  expect(sizes?.data[0]).toBe(0.4);
  expect(sizes?.data[69]).toBe(1e4);

  const intensities = firstRecord?.arrays.Intensities;

  expect(intensities?.units).toBe('Percent');

  expect(firstRecord?.meta['Sample Name']).toBe('20260916_SiNP_7 1');
  expect(firstRecord?.meta['Serial Number']).toBe('MAL1086580');
  expect(firstRecord?.meta['Temperature (\uFFFDC)']).toBe(25);
  expect(firstRecord?.meta.Type).toBe('Size');
  expect(firstRecord?.meta['Record Number']).toBe(20);
});

test('empty input returns empty array', () => {
  expect(fromText('')).toStrictEqual([]);
});

test('header-only input returns empty array', () => {
  expect(fromText('Col1\tCol2\n')).toStrictEqual([]);
});

test('single scalar row', () => {
  const result = fromText('Name\tValue\nfoo\t42');

  expect(result).toHaveLength(1);
  expect(result[0]?.meta.Name).toBe('foo');
  expect(result[0]?.meta.Value).toBe(42);
});

test('parse zeta potential export', () => {
  const result = fromText(readDataFile('zetaPotential.txt'));

  expect(result).toHaveLength(1);

  const record = result[0];

  expect(record).toBeDefined();

  expect(Object.keys(record?.arrays ?? {})).toStrictEqual([
    'Intensities',
    'Zeta Potentials',
  ]);

  for (const array of Object.values(record?.arrays ?? {})) {
    expect(array.data).toHaveLength(90);
  }

  const intensities = record?.arrays.Intensities;

  expect(intensities?.units).toBe('');

  const zetaPotentials = record?.arrays['Zeta Potentials'];

  expect(zetaPotentials?.units).toBe('mV');
  expect(zetaPotentials?.data[0]).toBe(-147);
  expect(zetaPotentials?.data[89]).toBe(147);

  expect(record?.meta.Type).toBe('Zeta');
  expect(record?.meta['Sample Name']).toBe('LCD in FB 75/25 1');
  expect(record?.meta['Zeta Potential (mV)']).toBe(-16.8);
  expect(record?.meta['Zeta Deviation (mV)']).toBe(5.71);
  expect(record?.meta['Conductivity (mS/cm)']).toBe(0.943);
});

test('array columns without units', () => {
  const result = fromText('X[1]\tX[2]\tX[3]\ndata\n1\t2\t3');

  expect(result).toHaveLength(2);

  const arrays = result[1]?.arrays;

  expect(arrays?.X?.units).toBe('');
  expect(arrays?.X?.data).toStrictEqual(new Float64Array([1, 2, 3]));
});
