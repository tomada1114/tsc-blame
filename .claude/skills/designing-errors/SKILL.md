---
name: designing-errors
description: >
  Covers the shape of a package error class and the vocabulary of its `code` string, for
  both `src/errors.ts`-style errors and `scripts/**` error codes such as `ERR_SMOKE_*`.
  Use when adding or changing an `Error` subclass, choosing or renaming an `ERR_*` code,
  deciding what a rejected-input error should carry, or wiring an `AbortSignal`
  rejection reason.
---

# Designing Errors

**Owns:** the shape of an error type and the vocabulary of `code` strings, in both
`src/**` and `scripts/**`. **Does not own:** general type-system judgment
(`writing-typescript`); how an error is asserted in a test (`writing-tests`); the stderr
message contract for repository automation (`writing-repo-scripts` — the `ERR_` prefix
rule below is shared with it, but the full message shape lives there).

## The one rule that matters

**`code` is the contract; `message` is not.** A caller branches on `code` because it is
a stable string literal that only changes across a breaking release. `message` is prose
for a human reading a log and may be reworded in a patch release. Never write a test, a
catch clause, or a script's own error handling that matches on `message` text — match on
`code`, or on the error's class via `instanceof`.

## Shape of an error class

This package raises exactly one class, `TscBlameError` (`src/errors.ts`), rather than
one class per failure — `docs/design/v0.1.md` §11 keys its vocabulary by `code`, not by
class. A new failure mode is a new literal added to the shared `TscBlameErrorCode`
union, never a new `Error` subclass.

- Subclass `Error`, set `this.name` to the class name in the constructor, and type
  `readonly code` as a shared string-literal union (`TscBlameErrorCode`) rather than as
  `string`. The literal type is what lets a consumer narrow on `code` and get every
  other field typed along with it.
- `TscBlameErrorCode` is populated incrementally: it has no members until the first
  pipeline stage ships, and each later issue in §15's delivery order widens it with the
  literal(s) the stage it ships can raise, in the same pull request. Adding a literal is
  additive and non-breaking; see "Changing a `code`" below for what removing or renaming
  one costs.
- Give the class domain-specific `readonly` fields beyond `code` and `message` — never
  the rejected value itself when it could hold sensitive input. `TscBlameError.stage`
  names the pipeline phase that raised the error (`"measure"`, `"parse"`), not an
  internal variable name that could be renamed without that being a contract change.
- When a function forwards an abort onto an `AbortSignal`, abort the controller with the
  exact same error instance the returned promise rejects with, not a fresh error
  carrying the same message — build the error once, then pass that one instance to both
  `controller.abort(error)` and the rejection, so a cooperating operation reading
  `signal.reason` sees the identical object the caller's `catch` receives.

```ts
/**
 * The single error class raised across the tsc-blame pipeline.
 *
 * @public
 */
export class TscBlameError extends Error {
  /** Stable discriminator naming the specific failure. */
  readonly code: TscBlameErrorCode;

  /** Name of the pipeline stage that raised the error. */
  readonly stage: string;

  /** The underlying error or value this error wraps, when there is one. */
  declare readonly cause?: unknown;

  constructor(options: {
    readonly code: TscBlameErrorCode;
    readonly stage: string;
    readonly message: string;
    readonly cause?: unknown;
  }) {
    super(options.message);
    this.name = "TscBlameError";
    this.code = options.code;
    this.stage = options.stage;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
```

## Choosing a `code` string

- `ERR_` prefix, `SCREAMING_SNAKE_CASE`, describing the failure rather than the function
  that raised it (`ERR_MEASURE_COMPILER_FAILED`, not `ERR_RUN_TSC_FAILED`).
- A `scripts/**` error code additionally carries the stage prefix that raised it
  (`ERR_SMOKE_*`, `ERR_ATTW_*`, `ERR_DEPENDENCY_*`), so the code alone — without opening
  the script — tells you which check to go read. Pick an existing stage prefix over
  inventing a new one when the failure belongs to a check that already has one.
- When a function can fail for several structurally different reasons, model them as a
  discriminated union keyed on `code` (or a shared base class per reason) rather than
  one error class with several optional fields — a consumer should be able to `switch`
  on `code` and get every field narrowed, not check which optional fields happen to be
  set.

## Changing a `code`

Adding, renaming, or removing a `code` on a publicly reachable error changes what a
consumer's `switch (error.code)` compiles against — it is a change to the published
contract, not an implementation detail. **REQUIRED:** `release-impact` for what that
means for the semver bump.
