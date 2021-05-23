# CHANGELOG

## 1.0.0

Initial release.

## 2.0.0

- Removed `run` function (suites will now run automatically).
- Added optional third parameter to the `add` function - an options object to tweak each case.
- Added name string as a required first parameter of `suite` function.
- Added suite name and fastest result to saved file content.
- `suite` function now returns a `Promise` with all results, instead of internal `Suite` object.

## 2.0.1

- Improved documentation (table of contents, better overview).

## 2.0.2

- Improved README (installation instruction).
- Improved type definitions.

## 2.0.3

- Added snippets.

## 2.0.4

- Added snippet for ES/TS modules.

## 3.0.0

- Simplified objects that are passed to `complete`, `cycle` and returned as a promise by running `suite` function (raw benchmark events are now hidden).
- Added support for async benchmarks and async setup.
- Added slowest case info to the file content.

## 3.0.1

- Improved type definitions for `suite` function.
- Added async example to /examples folder.
- Replaced example GIF with the current version.

## 3.0.2

- Improved snippets (fixed descriptions).
- Improved grammar in README.

## 3.1.0

- Added relative differences between cases (default cycle output and file content)

## 3.2.0

- Added progress status.
- Added examples for custom logging.
- Updated example GIF.

## 3.2.1

- Fixed bug with overriding logs of many suites.
- Added examples for running many async suites.

## 3.3.0

- Added details field to the benchmark result.
- Added option to save detailed results.
- Improved JSDocs for benchmark result object.

## 3.3.1

- Improved README.

## 3.3.2

- Added code reuse guide to the README.
- Added code reuse examples.

## 3.3.3

- Improved grammar in README.
- Added detailed summary example to the README.

## 3.3.4, 3.3.5

- Added package quality badge, removed wrong typings

## 3.4.0

- Added support for simple or detailed output in CSV format (on save).

## 3.5.0

- Added support for simple or detailed output as HTML table (on save).

## 3.6.0

- Added support for output as HTML chart (on save).

## 3.6.1

- Rebuilt the library.

## 3.6.2

- Improved charts generation (renders only colors you need, in a cyclical manner).

## 3.6.3

- Updated dependencies, added CONTRIBUTING info.

## 3.6.4 - 3.6.9

- Updated dependencies

## 3.6.10 - 3.6.11

- Added async keyword to the package.json to improve searching on npm.

## 3.6.12

- Improved typings by adding strict type checks.

## 3.6.13 - 3.6.14

- Updated dependencies

## 3.6.15

- Updated dependencies
- Fixed precision issues for slow cases
