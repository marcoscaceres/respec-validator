# respec-validator
A tool that helps validates a ReSpec document for publication. It:

 * Checks that there are not ReSpec warnings or errors.
 * Generated output conforms to validator.nu.
 * There are not broken links/cross-references to other documents.

## Installation

```Bash
npm install respec-validator
```

## Options

Usage: `npx respec-validator [options] [respec-file]`

The following `options` are available:

  * `-l`, `--no-links`        Don't validate cross references.
  * `-v`, `--no-validator`    Don't perform HTML validation.
  * `-h`, `--help`            Display this usage guide.
  * `--status` string       Override the spec's [status](https://github.com/w3c/respec/wiki/specStatus) (e.g., "ED").
  * `--gh-token` string     A GitHub token, if needed: https://github.com/settings/tokens
  * `--src` string          Optional, a ReSpec src file (default to index.html).
  * `--debug`               Shows addition debugging information.

## Examples

Check all warnings/errors, HTML, and cross references.

```Bash
$ npx respec-validate index.html
```

Don't do link check:

```Bash
$ npx respec-validate --no-links spec.html
```
