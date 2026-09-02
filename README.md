# tsc-blame

[![CI](https://github.com/tomada1114/tsc-blame/actions/workflows/ci.yml/badge.svg)](https://github.com/tomada1114/tsc-blame/actions/workflows/ci.yml)

Find the generic that's making `tsc` slow — and keep it from coming back.

`tsc-blame` measures TypeScript's type-checking cost deterministically, attributes it to
first-party files and declaration symbols, and compares the result against a baseline
committed to the repository. Commit `tsc-blame.json`, and every later run reports the
per-symbol delta. The GitHub Action posts that delta as a pull request comment; failing
the build is opt-in.

## Status

**Pre-release, under active development. Nothing is published to npm yet, and the CLI
described below does not exist.** This repository currently holds the project
scaffolding only — see [Current package contents](#current-package-contents). Treat
everything under [What it does](#what-it-does) as the v0.1 design, not as shipped
behavior.

## What it does

The problem this addresses has two halves. Existing trace tooling — notably
`@typescript/analyze-trace` — answers "why is type-checking expensive right now" as a
one-off diagnosis. What is missing is the layer that turns that answer into something
comparable over time, and that attributes cost to code you actually wrote rather than to
a `node_modules` package.

Planned for v0.1:

- **Deterministic measurement.** Runs `tsc`/`tsgo` under fixed conditions and reads back
  `--extendedDiagnostics` totals and the `--generateTrace` type dump.
- **Two-layer metrics.** A global total (L1) and a per-symbol attribution table (L2),
  reported as separate figures under separate names.
- **First-party attribution.** Types originating in `node_modules` and `lib.*.d.ts` are
  rolled up into a single `external` row, so the symbol table shows your code.
- **A committed baseline.** `--init` writes `tsc-blame.json`; `--budget` diffs the
  current run against it and exits non-zero only past an explicit threshold.
- **TypeScript 5.x and 7.x.** The type dump's file layout differs between them; an
  adapter absorbs that so one aggregation path serves both.
- **Project references and monorepos**, `--json` output, and a GitHub Action that
  comments the per-symbol diff on a pull request.

### Two design commitments

**The numbers are deterministic, or the tool is useless.** Type-check totals move by
roughly 20% with the checker's parallelism — measured at 29,641 to 35,541 `Types` for
the same code at `--checkers` 1 through 8. A baseline recorded on a developer's laptop
would not reproduce on a CI runner with a different core count, and the gate would be
flaky for reasons that have nothing to do with the code. So measurement runs always
force `--checkers 1`, overriding the user's configuration, and `tsc-blame.json` records
the checker count, the TypeScript version, and a hash of the `tsconfig` as an
environment fingerprint. On a fingerprint mismatch the comparison is skipped with a
warning and a zero exit — a missed regression beats a false one.

**"Blame" means where the cost is charged, not who caused it.** Attribution is to the
declaring symbol. The type dump does not carry usable call-site information — in a
measured fixture only 7 of 3,439 types had a `referenceLocation`, all of them pointing
inside `lib` — so pointing at "the line you changed", the way `git blame` does, is not
something this data supports. The diff table lists the files touched by the change
alongside the symbols that grew, and leaves the correlation to you.

### Not in scope

Wall-clock timings (they vary by machine, and printing them next to deterministic
figures makes the deterministic figures look approximate too), duration-gated hot spots
from the trace's check events, a breakdown inside `node_modules`, automated fix
suggestions, and a trace viewer UI. `@typescript/analyze-trace` already covers the
one-off diagnosis this deliberately leaves alone.

## Install

```sh
pnpm add tsc-blame
```

Requires Node.js 22 or newer. The package ships ESM only; on that range `require(esm)`
is unflagged, so a CommonJS consumer can `require()` it directly.

## Current package contents

Until the measurement pipeline lands, the package exports only the error type the
pipeline will raise. Every error the pipeline raises is a `TscBlameError`, so this is
how a caller tells it apart from anything else a dependency might throw:

```ts
import { TscBlameError } from "tsc-blame";

console.log(new Error("boom") instanceof TscBlameError);
// => false
```

All public symbols are named exports from the package root. Deep imports are private and
blocked by the package export map.

- `TscBlameError` carries a stable `code: TscBlameErrorCode` and `stage: string` — safe
  to branch on — plus an optional `cause`. `message` is written for humans and may be
  reworded in a patch release.
- `TscBlameErrorCode` has no members yet: no pipeline stage has shipped, so nothing
  raises one. Each later release widens it with the codes the stage it adds can raise.

See the generated TypeDoc documentation from `pnpm docs:build` for the full API
reference.

## Development

```sh
corepack pnpm@11.18.0 install --frozen-lockfile
pnpm hooks:install
pnpm check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete workflow.

## License

[MIT](LICENSE) © tomada
