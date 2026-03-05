import { expect, test } from 'vitest';

import { fromText } from '../index.ts';

test('fromText is exported', () => {
  expect(typeof fromText).toBe('function');
});
