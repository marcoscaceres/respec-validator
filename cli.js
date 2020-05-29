#!/usr/bin/env node
/*eslint-env node*/
"use strict";
const path = require("path");
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const handler = require("serve-handler");
const { promises: fs } = require("fs");
const http = require("http");
const server = http.createServer(
  async (request, response) =>
    await handler(request, response, {
      cleanUrls: false,
    })
);
server.listen(5000, () => {});

let DEBUG = process.env.DEBUG || false;
const optionList = [
  {
    alias: "l",
    description: "Don't validate cross references.",
    name: "no-links",
    type: Boolean,
  },
  {
    alias: "g",
    defaultValue: false,
    description: "Use HTTP GET when doing link validation, instead of HEAD.",
    name: "check-links-using-get",
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
    defaultValue: false,
    description: "Show additional debugging information.",
    name: "debug",
    type: Boolean,
  },
  {
    defaultValue: false,
    description: "Show version number.",
    name: "version",
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
    description: "A GitHub user associated with the token.",
    name: "gh-user",
    type: String,
  },
  {
    defaultOption: true,
    description: "A ReSpec src file.",
    multiple: false,
    name: "src",
    type: String,
  },
  {
    name: "manifest",
    description: "Path to Echidna manifest",
    type: String,
  },
];

const usageSections = [
  {
    header: "respec-validator",
    content: "A tool that helps validates a ReSpec document for publication.",
  },
  {
    header: "Usage",
    content: "npx respec-validator [options] file.html",
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
      if (DEBUG) console.log(`Running Shell command:\n\t${this.cmd}\n`);
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
  const url = new URL(`http://localhost:5000/${spec}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }
  // -e is stop on errors, -w is stop on warnings
  const cmd = `npx respec2html -e -w --timeout 30 --src "${
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
  const cmd = `java -jar ${vnu} --also-check-css --filterpattern ".*bdi.*" ${file}`;
  await new ShellCommand(cmd).run();
  console.info("    ✅  Looks good! No HTML validation errors!\n");
}

async function checkLinks(file, { useGET, ignores }) {
  console.info("🔎 Checking links and cross-references...");
  const dir = path.dirname(file);
  const additionalArgs = useGET ? "--http-always-get" : "";
  // the link checker expects a directory, not a file.
  await new ShellCommand(
    `npx link-checker ${dir} --url-ignore="https://ev.buaa.edu.cn/" --http-timeout=50000 ${additionalArgs} --http-redirects=3 ${ignores}`
  ).run();
  console.info("\n    ✅  Links are good!\n");
}

/**
 * Process an echidna manifest, spits out URLs to ignore
 */
async function processManifest(manifest) {
  const manifestPath = path.resolve(manifest);
  const data = await fs.readFile(manifestPath, "utf-8");
  const ignores = data
    .split(/\n/)
    .filter(item => item)
    .map(item => {
      const [urlComponent] = item.split(/\s+/);
      const { pathname } = new URL(urlComponent, "file://");
      return `--url-ignore=${pathname.slice(1)}`;
    })
    .join(" ");
  return ignores;
}

/**
 *
 * If there are any errors or warnings, the app exits with 1.
 */
async function validate(options) {
  if (DEBUG) console.log("Version:", await getPackageVersion());
  let exitCode = 0;
  try {
    const params = {};
    if (options["gh-token"])
      Object.assign(params, { githubToken: options["gh-token"] });

    if (options["gh-user"])
      Object.assign(params, { githubUser: options["gh-user"] });

    if (options["status"])
      Object.assign(params, { specStatus: options["status"] });

    const htmlFile = await doReSpecValidation(options.src, params);
    if (!options["no-validator"]) {
      await doMarkupValidation(htmlFile);
    }
    if (!options["no-links"]) {
      await checkLinks(htmlFile, {
        useGET: options["check-links-using-get"],
        ignores: options.manifest
          ? await processManifest(options.manifest)
          : "",
      });
    }
    console.info("🎉 All checks passed!");
  } catch (err) {
    console.error(err);
    console.info("\n ❌  Not so good... please fix the issues above.");
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

async function getPackageVersion() {
  const fs = require("fs");
  const { promisify } = require("util");
  const readFileAsync = promisify(fs.readFile);
  const packagePath = path.resolve(__dirname, "./package.json");
  const content = await readFileAsync(packagePath, "utf-8");
  const { version } = JSON.parse(content);
  return version;
}

async function parseCommandLine() {
  let options;
  try {
    options = commandLineArgs(optionList);
  } catch (err) {
    console.info(commandLineUsage(usageSections));
    return process.exit(127);
  }
  DEBUG = options.debug;
  if (options.version) {
    const version = await getPackageVersion();
    console.info(version + "\n");
    return process.exit(0);
  }
  if (options.help) {
    console.info(commandLineUsage(usageSections));
    return process.exit(0);
  }
  if (!options.src) {
    console.info(commandLineUsage(usageSections));
    return process.exit(1);
  }
  if (!options["gh-token"] && options["gh-user"]) {
    console.error("Missing --gh-token value.");
    process.exit(1);
  }
  return options;
}
(async () => {
  const options = await parseCommandLine();
  if (options) validate(options);
})();
