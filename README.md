![reg-cli](./docs/reg-cli.jpg)

![[Build Status](https://travis-ci.org/reg-viz/reg-cli)](https://travis-ci.org/reg-viz/reg-cli.svg?branch=master)
![[Build Status](https://ci.appveyor.com/project/bokuweb/reg-cli)](https://ci.appveyor.com/api/projects/status/ir907qbc633q9na4?svg=true)
![[npm package](https://www.npmjs.com/package/reg-cli)](https://img.shields.io/npm/v/reg-cli.svg)
![[npm package downloads](https://www.npmjs.com/package/reg-cli)](https://img.shields.io/npm/dm/reg-cli.svg)

> Visual regression test tool with html reporter.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [CLI](#cli)
  - [Per-Image Threshold Overrides](#per-image-threshold-overrides)
  - [HTML Report](#html-report)
  - [From JSON](#from-json)
- [Test](#test)
- [Contribute](#contribute)
- [License](#license)

## Installation

### Requirements

 - Node.js v18+

`reg-cli` support Node.js v18+

``` sh
$ npm i -D reg-cli
```

## Usage

### CLI

``` sh
$ reg-cli /path/to/actual-dir /path/to/expected-dir /path/to/diff-dir -R ./report.html
```

####  Options

  * `-U`, `--update` Update expected images.(Copy \`actual images\` to \`expected images\`).
  * `-R`, `--report` Output html report to specified directory.
  * `-J`, `--json` Specified json report path. If omitted `./reg.json`
  * `-I`, `--ignoreChange` If true, error will not be thrown when image change detected.
  * `-E`, `--extendedErrors` If true, also added/deleted images will throw an error.
  * `-P`, `--urlPrefix` Add prefix to all image src.
  * `-M`, `--matchingThreshold` Matching threshold, ranges from 0 to 1. Smaller values make the comparison more sensitive. 0 by default. Specifically, you can set how much of a difference in the YIQ difference metric should be considered a different pixel. If there is a difference between pixels, it will be treated as "same pixel" if it is within this threshold.
  * `-T`, `--thresholdRate` Rate threshold for detecting change. When the difference ratio of the image is larger than the set rate detects the change. Applied after `matchingThreshold`. 0 by default.
  * `-S`, `--thresholdPixel` Pixel threshold for detecting change. When the difference pixel of the image is larger than the set pixel detects the change. This value takes precedence over `thresholdRate`. Applied after `matchingThreshold`. 0 by default.
  * `-C`, `--concurrency` How many processes launches in parallel. If omitted 4.
  * `-A`, `--enableAntialias` Enable antialias. If omitted false.
  * `-X`, `--additionalDetection`. Enable additional difference detection(highly experimental). Select "none" or "client" (default: "none").
  * `-F`, `--from` Generate report from json. Please specify json file. If set, only report will be output without comparing images.
  * `--image-config` Specify per-image threshold overrides. Can be used multiple times or point to a JSON config file.

### Per-Image Threshold Overrides

For the below examples note that the image must contain it's relative path (from the output folder).

You can override thresholds for specific images using the `--image-config` option in two ways:

#### Inline Configuration

Use the format `"image.png:param=value,param2=value2"`:

```sh
$ reg-cli /path/to/actual /path/to/expected /path/to/diff \
  --image-config "relative/output/path/to/image/logo.png:thresholdRate=0.1" \
  --image-config "relative/output/path/to/imagescreenshot.png:thresholdPixel=100,matchingThreshold=0.05"
```

#### JSON Configuration File

Create a JSON file with your image overrides:

**image-config.json:**
```json
{
  "imageOverrides": {
    "logo.png": {
      "thresholdRate": 0.1,
      "matchingThreshold": 0.02
    },
    "relative/output/path/screenshot.png": {
      "thresholdPixel": 100
    },
    "relative/output/path/component-test.png": {
      "matchingThreshold": 0.05,
      "thresholdRate": 0.2
    },
    "relative/output/path/sensitive-image.jpg": {
      "matchingThreshold": 0.001,
      "thresholdRate": 0.05
    }
  }
} 
```

Then use it with:

```sh
$ reg-cli /path/to/actual /path/to/expected /path/to/diff --image-config ./image-config.json
```

#### Supported Override Parameters

- `matchingThreshold`: Per-pixel sensitivity (0-1, lower = more sensitive)
- `thresholdRate`: Percentage of different pixels allowed (0-1)  
- `thresholdPixel`: Absolute number of different pixels allowed

Per-image overrides take precedence over global threshold settings. If no override is specified for an image, the global settings are used.

### html report

If `-R` option set, output html report to specified directory.
https://reg-viz.github.io/reg-cli/

![open](./docs/open.png)
![close](./docs/close.png)
![viewer](./docs/viewer.png)

### from json

If `-F` option set, only report will be output without comparing images.

``` sh
reg-cli.js -F ./sample/reg.json -R ./sample/index.html"
```

- json format
``` json
{
    "failedItems": ["sample.png"],
    "newItems":[],
    "deletedItems":[],
    "passedItems":[],
    "expectedItems":["sample.png"],
    "actualItems":["sample.png"],
    "diffItems":["sample.png"],
    "actualDir":"./actual",
    "expectedDir":"./expected",
    "diffDir":"./diff"
}
```

## Test

```sh
$ npm t
```

## Contribute

PRs welcome.

## License

The MIT License (MIT)

Copyright (c) 2017 bokuweb

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

![reg-viz](https://raw.githubusercontent.com/reg-viz/artwork/master/repository/footer.png)

