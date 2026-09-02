#!/usr/bin/env node

import { realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Run the package command without coupling its behavior to process globals.
 *
 * @param argv Arguments after the executable name.
 * @param executable Name or path shown in the usage line.
 * @returns The process result a caller should observe.
 */
export function runCli(argv: readonly string[], executable = "package"): CliResult {
  if (argv.includes("--help") || argv.includes("-h")) {
    return {
      exitCode: 0,
      stdout:
        `Usage: ${executable} [options]\n\n` +
        "Options:\n" +
        "  -h, --help  Show this help message.\n",
      stderr: "",
    };
  }
  return { exitCode: 0, stdout: "", stderr: "" };
}

function canonicalize(target: string): string {
  try {
    return realpathSync(target);
  } catch {
    return path.resolve(target);
  }
}

function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  return (
    entry !== undefined &&
    canonicalize(entry) === canonicalize(fileURLToPath(moduleUrl))
  );
}

/**
 * Run the command against the real process and report its result.
 *
 * @remarks
 * Exported so a test can exercise these side effects directly, in-process —
 * this is the only part of the file that touches `process` I/O.
 *
 * @param argv Arguments after the executable name.
 * @param executable Name or path shown in the usage line.
 * @returns The exit code the process should report.
 */
export function main(argv: readonly string[], executable: string): number {
  const result = runCli(argv, executable);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result.exitCode;
}

if (isMain(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2), process.argv[1] ?? "package");
}
