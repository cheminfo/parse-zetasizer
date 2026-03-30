import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { fromText } from '../fromText.ts';

function readDataFile(filename: string): ArrayBuffer {
  return readFileSync(join(import.meta.dirname, 'data', filename)).buffer;
}

test('parse chc particle size export with summary and distribution', () => {
  const result = fromText(readDataFile('chc_particleSize.txt'));

  expect(result).toHaveLength(4);

  const firstRecord = result[0];

  expect(firstRecord).toBeDefined();

  expect(Object.keys(firstRecord?.arrays ?? {})).toStrictEqual([
    'Correlation Delay Times',
    'Correlation Data',
    'Sizes',
    'Intensities',
    'Numbers',
    'Volumes',
  ]);

  const sizes = firstRecord?.arrays.Sizes;

  expect(sizes?.units).toBe('d.nm');
  expect(sizes?.data).toHaveLength(70);
  expect(sizes?.data[0]).toBe(0.4);
  expect(sizes?.data[69]).toBe(1e4);

  expect(firstRecord?.meta.Record).toBe(1);
  expect(firstRecord?.meta.Type).toBe('Size');
  expect(firstRecord?.meta['Sample Name']).toBe('SD283 - F1, HBG6.4, 0h 1');
  expect(firstRecord?.meta['Z-Ave (d.nm)']).toBe(108);
  expect(firstRecord?.meta['Number Mean (d.nm)']).toBe(78.38);
  expect(firstRecord?.meta.PdI).toBe(0.112);
  expect(firstRecord?.meta['Serial Number']).toBe('MAL1143160');
  expect(firstRecord?.meta['Dispersant Name']).toBe('Water');
  expect(firstRecord?.meta['Material Name']).toBe('Chitosan');

  expect(result).toMatchSnapshot();
});

test('parse chc zeta potential export', () => {
  const result = fromText(readDataFile('chc_zetaPotential.txt'));

  expect(result).toHaveLength(4);

  const record = result[0];

  expect(record).toBeDefined();

  expect(Object.keys(record?.arrays ?? {})).toStrictEqual([
    'Times',
    'Phases',
    'Zeta Potentials',
    'Intensities',
  ]);

  const zetaPotentials = record?.arrays['Zeta Potentials'];

  expect(zetaPotentials?.units).toBe('mV');

  expect(record?.meta.Type).toBe('Zeta');
  expect(record?.meta['S/W Version']).toBe(7.11);
  expect(record?.meta['Dispersant Name']).toBe('Water');
  expect(record?.meta['Conductivity (mS/cm)']).toBe(0.0966);
  expect(record?.meta['Zeta Potential (mV)']).toBe(8.1);

  expect(result).toMatchSnapshot();
});
