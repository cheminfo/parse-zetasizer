import { expect, test } from 'vitest';

import type { ZetasizerRecord } from '../fromText.ts';
import { getArray } from '../getArray.ts';

const record: ZetasizerRecord = {
  meta: { Record: 1, Type: 'Size' },
  Sizes: { data: new Float64Array([1, 2, 3]), units: 'd.nm' },
  Intensities: { data: new Float64Array([10, 20]), units: 'Percent' },
};

test('returns a ZetasizerArray by name', () => {
  const sizes = getArray(record, 'Sizes');

  expect(sizes).toStrictEqual({
    data: new Float64Array([1, 2, 3]),
    units: 'd.nm',
  });
});

test('returns undefined for meta key', () => {
  expect(getArray(record, 'meta')).toBeUndefined();
});

test('returns undefined for missing key', () => {
  expect(getArray(record, 'Volumes')).toBeUndefined();
});
