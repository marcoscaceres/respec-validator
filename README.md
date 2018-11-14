# respec-validator
A tool that helps validates a ReSpec document for publication.

## Options

  * `-l`, `--no-links`        Don't validate cross references.
  * `-v`, `--no-validator`    Don't perform HTML validation.
  * `-h`, `--help`            Display this usage guide.
  * `--status` string       Override the spec's status.
  * `--gh-token` string     A GitHub token, if needed: https://github.com/settings/tokens
  * `--src` string          Optional, a ReSpec src file (default to index.html).

## Examples

Check all warnings/errors, HTML, and cross references.   

```Bash
$ npx respec-validate index.html
```

Don't do link check:

```Bash
$ npx respec-validate --no-links spec.html
```
