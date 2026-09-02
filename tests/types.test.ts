import { describe, expect, expectTypeOf, it } from "vitest";

import { TscBlameError, type TscBlameErrorCode } from "../src/index.js";

// These are compile-time assertions about the public surface. They run under
// Vitest so a broken type contract fails the same gate as a broken behavior,
// while tests/package.test.ts checks the *published declarations* from a
// consumer's point of view.
describe("public API types", () => {
  it("has no members yet, and every future one is a string literal", () => {
    // src/errors.ts's remarks: TscBlameErrorCode is widened one literal at a
    // time, in the same pull request that ships the pipeline stage raising
    // it. Nothing has shipped, so the union is exactly `never` today — this
    // assertion is the compile-time half of that state, and starts failing
    // the moment the first literal is added, which is the point at which
    // this test (and the cast in tests/errors.test.ts) needs updating.
    expectTypeOf<TscBlameErrorCode>().toEqualTypeOf<never>();
  });

  it("exposes TscBlameError.code typed as TscBlameErrorCode", () => {
    expectTypeOf<TscBlameError["code"]>().toEqualTypeOf<TscBlameErrorCode>();
  });

  it("exposes TscBlameError.stage as a string", () => {
    expectTypeOf<TscBlameError["stage"]>().toEqualTypeOf<string>();
  });

  it("exposes TscBlameError.cause as optional and unknown", () => {
    expectTypeOf<TscBlameError["cause"]>().toEqualTypeOf<unknown>();
  });

  it("requires code, stage, and message; cause is optional", () => {
    // Declared, never given a value: TscBlameErrorCode has no members yet
    // (see src/errors.ts), so no expression actually has this type. Using it
    // here — rather than a cast on each call below — keeps `code` itself
    // type-correct in every object literal, so the only diagnostic each
    // `@ts-expect-error` below can be satisfied by is the one under test, not
    // an incidental error on `code` (the type-testing skill's "@ts-expect-error
    // can be satisfied by the wrong error" trap).
    // TscBlameErrorCode has no members yet (see src/errors.ts), so no real
    // expression has this type; `undefined` is used as the runtime stand-in
    // because `never` is a subtype of `undefined`, so the assertion holds.
    const code = undefined as never;

    const rejected = (): void => {
      // @ts-expect-error code, stage, and message are all required
      new TscBlameError({});
      // @ts-expect-error stage must be a string, not a number
      new TscBlameError({ code, stage: 1, message: "m" });
      // @ts-expect-error message is required
      new TscBlameError({ code, stage: "s" });
      // @ts-expect-error an unknown option is a typo, not an extension point
      new TscBlameError({ code, stage: "s", message: "m", extra: true });
    };
    expect(rejected).toBeTypeOf("function");
  });

  it("accepts an explicit cause of any type", () => {
    // TscBlameErrorCode has no members yet (see src/errors.ts), so no real
    // expression has this type; `undefined` is used as the runtime stand-in
    // because `never` is a subtype of `undefined`, so the assertion holds.
    const code = undefined as never;
    expectTypeOf(TscBlameError).toBeConstructibleWith({
      code,
      stage: "s",
      message: "m",
      cause: "anything",
    });
  });
});
