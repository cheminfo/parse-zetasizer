# parse-zetasizer

[![NPM version](https://img.shields.io/npm/v/parse-zetasizer.svg)](https://www.npmjs.com/package/parse-zetasizer)
[![npm download](https://img.shields.io/npm/dm/parse-zetasizer.svg)](https://www.npmjs.com/package/parse-zetasizer)
[![test coverage](https://img.shields.io/codecov/c/github/cheminfo/parse-zetasizer.svg)](https://codecov.io/gh/cheminfo/parse-zetasizer)
[![license](https://img.shields.io/npm/l/parse-zetasizer.svg)](https://github.com/cheminfo/parse-zetasizer/blob/main/LICENSE)

Parse tab-separated text exports from [Malvern Panalytical Zetasizer](https://www.malvernpanalytical.com/en/products/product-range/zetasizer-range/zetasizer-advance-range) instruments.

The parser dynamically discovers array columns (e.g., Sizes, Intensities, Volumes, Numbers) and scalar metadata columns from the header row, so it works regardless of which fields the user selected for export.

## Installation

```console
npm install parse-zetasizer
```

## Usage

```js
import { readFileSync } from 'node:fs';

import { fromText } from 'parse-zetasizer';

const text = readFileSync('zetasizer-export.txt', 'utf8');
const result = fromText(text);

// result.records is an array of measurements
for (const record of result.records) {
  // record.arrays contains array data (e.g., Sizes, Intensities)
  console.log(record.arrays.Sizes.data); // Float64Array
  console.log(record.arrays.Sizes.units); // "d.nm"

  // record.meta contains scalar metadata
  console.log(record.meta['Sample Name']);
  console.log(record.meta['Temperature (°C)']);
}
```

## License

[MIT](./LICENSE)
