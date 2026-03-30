import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import type { ZetasizerArray } from '../fromText.ts';
import { fromText } from '../fromText.ts';

test('parse mxd particle size export with 3 records', () => {
  const data = readFileSync(
    join(import.meta.dirname, 'data', 'mxd_particleSize.txt'),
  ).buffer;
  const result = fromText(data);

  expect(result).toHaveLength(3);

  const firstRecord = result[0];

  expect(firstRecord).toBeDefined();

  const arrayKeys = Object.keys(firstRecord ?? {}).filter((k) => k !== 'meta');

  expect(arrayKeys).toStrictEqual([
    'Sizes',
    'Intensities',
    'Volumes',
    'Numbers',
    'Undersize By Intensity',
  ]);

  for (const key of arrayKeys) {
    const array = firstRecord?.[key] as ZetasizerArray | undefined;

    expect(array?.data).toHaveLength(70);
  }

  const sizes = firstRecord?.Sizes as ZetasizerArray | undefined;

  expect(sizes?.units).toBe('d.nm');
  expect(sizes?.data[0]).toBe(0.4);
  expect(sizes?.data[69]).toBe(1e4);

  const intensities = firstRecord?.Intensities as ZetasizerArray | undefined;

  expect(intensities?.units).toBe('Percent');

  expect(firstRecord?.meta['Sample Name']).toBe('20260916_SiNP_7 1');
  expect(firstRecord?.meta['Serial Number']).toBe('MAL1086580');
  expect(firstRecord?.meta['Temperature (°C)']).toBe(25);
  expect(firstRecord?.meta.Type).toBe('Size');
  expect(firstRecord?.meta['Record Number']).toBe(20);

  expect(result).toMatchSnapshot();
});
