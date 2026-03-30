import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import type { ZetasizerArray } from '../fromText.ts';
import { fromText } from '../fromText.ts';

test('parse chc zeta potential export', () => {
  const data = readFileSync(
    join(import.meta.dirname, 'data', 'chc_zetaPotential.txt'),
  ).buffer;
  const result = fromText(data);

  expect(result).toHaveLength(4);

  const record = result[0];

  expect(record).toBeDefined();

  const arrayKeys = Object.keys(record ?? {}).filter((k) => k !== 'meta');

  expect(arrayKeys).toStrictEqual([
    'Times',
    'Phases',
    'Zeta Potentials',
    'Intensities',
  ]);

  const zetaPotentials = record?.['Zeta Potentials'] as
    | ZetasizerArray
    | undefined;

  expect(zetaPotentials?.units).toBe('mV');

  expect(record?.meta.Type).toBe('Zeta');
  expect(record?.meta['S/W Version']).toBe(7.11);
  expect(record?.meta['Dispersant Name']).toBe('Water');
  expect(record?.meta['Conductivity (mS/cm)']).toBe(0.0966);
  expect(record?.meta['Zeta Potential (mV)']).toBe(8.1);

  expect(result).toMatchSnapshot();
});
