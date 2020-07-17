# respec-validator
A tool that helps validates a ReSpec document for publication. It:

 * Checks that there are not ReSpec warnings or errors.
 * Generated output conforms to validator.nu.
 * There are not broken links/cross-references to other documents.

## Installation

```Bash
npm install -g respec-validator 
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
$ npx respec-validator index.html
```

Don't do link check:

```Bash
$ npx respec-validator --no-links spec.html
```

## FAQ

### Can I make it run faster?

If you already have Chrome installed, you can set the following environment variables to avoid downloading Chromium unnecessarily.

``` bash
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
# Replace the path with your actual Chromium browser path
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
# Some common values for above might be:
# on MacOS: "/Applications/Google Chrome.app/Contents/MacOS/Google chrome"
# on Ubuntu: /usr/bin/google-chrome
# on Windows 10: C:\Users\USER\AppData\Local\Google\Chrome\Application\chome.exe
```

or, in a GitHub Action workflow (as they have Chrome installed; assuming Ubuntu)
``` yaml
env:
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 1
  PUPPETEER_EXECUTABLE_PATH: /usr/bin/google-chrome
```
