import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import type { ZetasizerArray } from '../fromText.ts';
import { fromText } from '../fromText.ts';

test('parse mxd zeta potential export', () => {
  const data = readFileSync(
    join(import.meta.dirname, 'data', 'mxd_zetaPotential.txt'),
  ).buffer;
  const result = fromText(data);

  expect(result).toHaveLength(1);

  const record = result[0];

  expect(record).toBeDefined();

  const arrayKeys = Object.keys(record ?? {}).filter((k) => k !== 'meta');

  expect(arrayKeys).toStrictEqual(['Intensities', 'Zeta Potentials']);

  for (const key of arrayKeys) {
    const array = record?.[key] as ZetasizerArray | undefined;

    expect(array?.data).toHaveLength(90);
  }

  const intensities = record?.Intensities as ZetasizerArray | undefined;

  expect(intensities?.units).toBe('');

  const zetaPotentials = record?.['Zeta Potentials'] as
    | ZetasizerArray
    | undefined;

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
