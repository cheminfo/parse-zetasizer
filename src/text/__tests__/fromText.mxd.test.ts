import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { fromText } from '../fromText.ts';

function readDataFile(filename: string): ArrayBuffer {
  return readFileSync(join(import.meta.dirname, 'data', filename)).buffer;
}

test('parse mxd particle size export with 3 records', () => {
  const result = fromText(readDataFile('mxd_particleSize.txt'));

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
  expect(firstRecord?.meta['Temperature (°C)']).toBe(25);
  expect(firstRecord?.meta.Type).toBe('Size');
  expect(firstRecord?.meta['Record Number']).toBe(20);

  expect(result).toMatchSnapshot();
});

test('parse mxd zeta potential export', () => {
  const result = fromText(readDataFile('mxd_zetaPotential.txt'));

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

  expect(result).toMatchSnapshot();
});
