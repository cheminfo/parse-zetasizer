import { expect, test } from 'vitest';

import { fromText } from '../fromText.ts';

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

test('array columns without units', () => {
  const result = fromText('X[1]\tX[2]\tX[3]\ndata\n1\t2\t3');

  expect(result).toHaveLength(2);

  const arrays = result[1]?.arrays;

  expect(arrays?.X?.units).toBe('');
  expect(arrays?.X?.data).toStrictEqual(new Float64Array([1, 2, 3]));
});
