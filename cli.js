#!/usr/bin/env node
/*eslint-env node*/
"use strict";
const path = require("path");
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");

const optionList = [
  {
    alias: "l",
    description: "Don't validate cross references.",
    name: "no-links",
    type: Boolean,
  },
  {
    alias: "v",
    description: "Don't perform HTML validation.",
    name: "no-validator",
    type: Boolean,
  },
  {
    alias: "h",
    defaultValue: false,
    description: "Display this usage guide.",
    name: "help",
    type: Boolean,
  },
  {
    description: "Override the spec's status.",
    name: "status",
    type: String,
  },
  {
    description:
      "A GitHub token, if needed: https://github.com/settings/tokens",
    name: "gh-token",
    type: String,
  },
  {
    defaultOption: true,
    defaultValue: "index.html",
    description: "A ReSpec src file.",
    multiple: false,
    name: "src",
    type: String,
  },
];

const usageSections = [
  {
    header: "validate",
    content: "A tool that helps validates a ReSpec document for publication.",
  },
  {
    header: "Options",
    optionList,
  },
  {
    header: "Examples",
    content: [
      {
        desc: "1. Check all warnings/errors, HTML, and cross references.",
        example: "$ respec-validate index.html",
      },
      {
        desc: "2. Don't do link check ",
        example: "$ respec-validate --no-links index.html",
      },
    ],
  },
  {
    content: "Project home: {underline https://github.com/w3c/respec}",
    raw: true,
  },
];

/**
 *
 * @param {string} cmd A string representing a shell command.
 */
class ShellCommand {
  constructor(cmd, { quiet = false } = {}) {
    this._cmd = cmd;
    this._options = { quiet };
  }
  get cmd() {
    return this._cmd;
  }
  run() {
    const { exec } = require("child_process");
    return new Promise((resolve, reject) => {
      const childProcess = exec(this.cmd, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
      if (!this._options.quiet) {
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);
      }
    });
  }
}

/**
 * ReSpec generates the specs and checks for any errors.
 * It spins up a local HTTP server and checks the spec.
 *
 * @param {String} spec Path to spec, relative to local server.
 * @returns {String} Path to generated specification.
 */
async function doReSpecValidation(spec, params) {
  console.info(`🔎 Validating ReSpec document "${spec}"...\n`);
  const tempDir = await new ShellCommand("mktemp -d", { quiet: true }).run();
  const tempFile = path.resolve(tempDir.trim(), "./output.html");
  const handler = require("serve-handler");
  const http = require("http");
  const server = http.createServer((request, response) =>
    handler(request, response)
  );
  server.listen(5000, () => {});
  const url = new URL(`http://localhost:5000/${spec}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }
  // -e is stop on errors, -w is stop on warnings
  const cmd = `npx respec2html -e -w --timeout 30 --src="${
    url.href
  }" --out ${tempFile}`;
  await new ShellCommand(cmd).run();
  console.info(
    "    ✅  Success! ReSpec document has not warnings or errors...\n"
  );
  return tempFile;
}

/**
 * Validates HTML against validator.nu's validator, but locally.
 *
 * @param {DOMString} file path to file to validate.
 */
async function doMarkupValidation(file) {
  console.info("🔎 Checking document markup...\n");
  const vnu = require("vnu-jar");
  await new ShellCommand(`java -jar ${vnu} --also-check-css ${file}`).run();
  console.info("    ✅  Looks good! No HTML validation errors!\n");
}

async function checkLinks(file) {
  console.info("🔎 Checking links and cross-references...\n");
  const dir = path.dirname(file);
  // the link checker expects a directory, not a file.
  await new ShellCommand(
    `npx link-checker --http-timeout=20000 --http-redirects=3 ${dir}`
  ).run();
  console.info("    ✅  Links are good!\n");
}

/**
 *
 * If there are any errors or warnings, the app exits with 1.
 */
async function validate(options) {
  let exitCode = 0;
  try {
    const params = {};
    if (options["gh-token"])
      Object.assign(params, { githubToken: options["gh-token"] });

    if (options["status"])
      Object.assign(params, { specStatus: options["status"] });

    const htmlFile = await doReSpecValidation(options.src, params);
    if (!options["no-validator"]) {
      await doMarkupValidation(htmlFile);
    }
    if (!options["no-links"]) {
      await checkLinks(htmlFile);
    }
    console.info("🎉 All checks passed!");
  } catch (err) {
    console.info("\n ❌  Not so good... please fix the issues above.");
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

function parseCommandLine() {
  let options;
  try {
    options = commandLineArgs(optionList);
  } catch (err) {
    console.info(commandLineUsage(usageSections));
    return process.exit(127);
  }
  if (options.help) {
    console.info(commandLineUsage(usageSections));
    return process.exit(0);
  }
  return options;
}

const options = parseCommandLine();
if (options) validate(options);
