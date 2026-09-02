import { describe, expect, it } from "vitest";

import { TscBlameError } from "../src/index.js";

/**
 * `TscBlameErrorCode` (declared in `src/errors.ts`) has no members yet: it is
 * widened one literal at a time, in the same pull request that ships the
 * pipeline stage raising that code (see `docs/design/v0.1.md` §11 and §15).
 * No stage has shipped, so there is no real code to construct one with —
 * this cast stands in until the first one lands, and every call below uses
 * it for the same reason.
 */
const PLACEHOLDER_CODE = "ERR_TEST_PLACEHOLDER" as unknown as never;

describe("TscBlameError construction", () => {
  it("is an Error subclass with a captured stack", () => {
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "test",
      message: "something went wrong",
    });
    expect(error).toBeInstanceOf(Error);
    expect(typeof error.stack).toBe("string");
  });

  it("sets its name to TscBlameError", () => {
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "test",
      message: "something went wrong",
    });
    expect(error.name).toBe("TscBlameError");
  });

  it("carries the message as a human-readable explanation", () => {
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "test",
      message: "something went wrong",
    });
    expect(error.message).toBe("something went wrong");
  });
});

describe("TscBlameError.code", () => {
  it("carries the given code", () => {
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "test",
      message: "something went wrong",
    });
    expect(error.code).toBe("ERR_TEST_PLACEHOLDER");
  });

  // AGENTS.md and the `designing-errors` skill fix the shape of every code
  // this package raises: `ERR_` plus SCREAMING_SNAKE_CASE. `TscBlameErrorCode`
  // has no members yet, so there is nothing to check membership against —
  // what already holds, and stays true for every literal a later issue adds
  // to the union, is that a value assigned to `code` follows that shape.
  it("is exhaustively ERR_ SCREAMING_SNAKE_CASE, the shape every future member of TscBlameErrorCode must have", () => {
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "test",
      message: "something went wrong",
    });
    expect(error.code).toMatch(/^ERR_[A-Z0-9_]+$/);
  });
});

describe("TscBlameError.stage", () => {
  it("carries the given stage name", () => {
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "measure",
      message: "something went wrong",
    });
    expect(error.stage).toBe("measure");
  });
});

describe("TscBlameError.cause", () => {
  it("propagates an Error cause unchanged", () => {
    const cause = new Error("root cause");
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "test",
      message: "something went wrong",
      cause,
    });
    expect(error.cause).toBe(cause);
  });

  it("propagates a non-Error cause unchanged", () => {
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "test",
      message: "something went wrong",
      cause: "a plain string reason",
    });
    expect(error.cause).toBe("a plain string reason");
  });

  it("leaves cause absent, rather than set to undefined, when none is given", () => {
    const error = new TscBlameError({
      code: PLACEHOLDER_CODE,
      stage: "test",
      message: "something went wrong",
    });
    // Distinguishing "absent" from "explicitly undefined" is the point of
    // exactOptionalPropertyTypes; "cause" in error would be true if the
    // constructor always assigned `this.cause`, even to undefined.
    expect("cause" in error).toBe(false);
  });
});
