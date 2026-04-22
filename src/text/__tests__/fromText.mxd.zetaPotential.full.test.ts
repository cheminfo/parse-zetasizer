import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { fromText } from '../fromText.ts';

test('parse mxd full zeta potential export with 3 records', () => {
  const data = readFileSync(
    join(import.meta.dirname, 'data', 'mxd_zetaPotential_full.txt'),
  ).buffer as ArrayBuffer;
  const result = fromText(data);

  expect(result).toHaveLength(3);

  const firstRecord = result[0];

  expect(firstRecord).toBeDefined();

  const arrayKeys = Object.keys(firstRecord ?? {}).filter((k) => k !== 'meta');

  expect(arrayKeys).toStrictEqual([]);

  expect(firstRecord?.meta.Type).toBe('Zeta');
  expect(firstRecord?.meta['Sample Name']).toBe(
    '20250325_MMA_CuCl2_Anisole_24h 1',
  );
  expect(firstRecord?.meta['Serial Number']).toBe('MAL1086580');
  expect(firstRecord?.meta['Record Number']).toBe(4);
  expect(firstRecord?.meta['Temperature (°C)']).toBe(25);

  expect(result).toMatchSnapshot();
});
