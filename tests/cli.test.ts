import process from "node:process";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

import { main, runCli } from "../src/cli.js";

describe("runCli", () => {
  it("returns help on --help", () => {
    expect(runCli(["--help"], "my-tool")).toEqual({
      exitCode: 0,
      stdout:
        "Usage: my-tool [options]\n\n" +
        "Options:\n" +
        "  -h, --help  Show this help message.\n",
      stderr: "",
    });
  });

  it("returns help on the short help flag", () => {
    const result = runCli(["-h"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage: package [options]");
    expect(result.stderr).toBe("");
  });

  it("does not write output for an invocation without options", () => {
    expect(runCli([])).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
});

// `main` is the thin seam between `runCli`'s pure result and the real
// process: it is what src/cli.ts's own `isMain(import.meta.url)` guard calls
// when the file is run as the installed command. Testing it directly here —
// rather than only through a child-process smoke test — is what lets this
// in-process suite cover those stdout/stderr/exit-code side effects at all;
// see `placing-tests`'s note that coverage stops at the process boundary.
describe("main", () => {
  let stdoutSpy: MockInstance<typeof process.stdout.write>;
  let stderrSpy: MockInstance<typeof process.stderr.write>;

  function spyOnProcessOutput(): void {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  }

  it("writes stdout and returns the exit code for --help", () => {
    spyOnProcessOutput();
    const exitCode = main(["--help"], "my-tool");
    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith(
      "Usage: my-tool [options]\n\n" +
        "Options:\n" +
        "  -h, --help  Show this help message.\n",
    );
    expect(stderrSpy).toHaveBeenCalledWith("");
  });

  it("writes nothing to stdout or stderr for an invocation without options", () => {
    spyOnProcessOutput();
    const exitCode = main([], "package");
    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith("");
    expect(stderrSpy).toHaveBeenCalledWith("");
  });
});

// The module's own `if (isMain(import.meta.url))` guard — the part that
// actually runs when this file is executed as the installed command — never
// fires from a plain `import`, because Vitest's own runner is always the
// process entry point instead. Forcing it to fire, in-process, is what a
// child-process smoke test cannot give coverage credit for (`placing-tests`),
// so this re-imports the module fresh with `process.argv` pointed at it.
describe("the top-level CLI entry guard", () => {
  it("runs main and reports the result once, when this module is the entry point", async () => {
    const modulePath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.argv = [originalArgv[0] ?? "node", modulePath, "--help"];
    try {
      vi.resetModules();
      await import("../src/cli.js");
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
    }
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    expect(stderrSpy).toHaveBeenCalledWith("");
  });
});
