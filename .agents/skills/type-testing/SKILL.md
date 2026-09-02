---
name: type-testing
description: >
  Covers writing compile-time assertions in tests/types.test.ts with Vitest's
  expectTypeOf — inferred return types, generic preservation, accepted and rejected call
  signatures, and discriminated-union narrowing. Use when adding or reviewing a
  @ts-expect-error assertion, a type test for a new or changed public signature, or when
  a type test passes despite the annotation being wrong.
---

# Type Testing

**Owns:** type-level tests in `tests/types.test.ts` — what to assert about a type, and
the two ways such an assertion silently passes without testing anything. **Does not
own:** runtime behavior assertions (`writing-tests`), where test files live
(`placing-tests`), what is allowed to be exported at all (`public-api-contract`).

## What belongs here

`tests/types.test.ts` is the one file where `expectTypeOf` assertions live. For every
public function or type touched by a change, assert:

- The inferred return type, including literal types the operation preserves
  (`Promise<"a">`, not the widened `Promise<string>`).
- That a generic passes through unwidened rather than collapsing to its constraint.
- Which inputs are accepted, and which are rejected with `@ts-expect-error`.
- That a discriminated union narrows correctly on its discriminant field.

## Trap 1: a `@ts-expect-error` inside `it()` still runs

Vitest executes the body of `it()`. A directly inlined invalid call is therefore
evaluated at test time, not just type-checked — if the call happens to throw or have a
side effect, the test can pass or fail for the wrong reason, and if the assertion
depends on a code path never reached, nothing was proven at all. (`code` below is a
value already typed as `TscBlameErrorCode`, used only so the object literal's other
fields stay isolated to what each example actually tests — see the borrowed trap further
down.)

```ts
// Wrong: runs the invalid call as part of the test body.
it("rejects a non-string stage", () => {
  // @ts-expect-error stage must name the pipeline phase as a string
  new TscBlameError({ code, stage: 42, message: "m" });
});

// Right: declare the invalid call inside a function, never invoke it. The
// assertion is that the function fails to compile.
it("rejects a non-string stage", () => {
  const rejected = (): void => {
    // @ts-expect-error stage must name the pipeline phase as a string
    new TscBlameError({ code, stage: 42, message: "m" });
  };
  expect(rejected).toBeTypeOf("function");
});
```

## Trap 2: a union initializer narrows before the assertion runs

`const value: A | B = makeB()` infers `value` as `B`, not `A | B` — TypeScript narrows a
`const` on its initializer. An assertion against a variable declared this way tests the
concrete branch, not the union, so it proves nothing about the branch that is supposed
to widen and narrow.

```ts
// Wrong: `shape` is inferred as Square, not the union.
const shape: Circle | Square = { kind: "square", side: 2 };

// Right: receive the value as a function parameter, so the annotation on the
// parameter — not the argument's own type — is what the union test checks.
const classify = (shape: Circle | Square): void => {
  if (shape.kind === "circle") {
    expectTypeOf(shape).toEqualTypeOf<Circle>();
  } else {
    expectTypeOf(shape).toEqualTypeOf<Square>();
  }
};
classify({ kind: "square", side: 2 });
```

`TscBlameError` does not need this pattern today — every code shares the same three
fields, so there is no per-code variant to narrow into (`src/errors.ts`'s remarks). The
trap still applies the moment a public type is a real discriminated union of distinct
shapes.

## A borrowed trap: `@ts-expect-error` can be satisfied by the wrong error

`@ts-expect-error` only asserts that the next line fails to compile — it does not check
_why_. A typo'd property name and a genuine type-contract violation both satisfy it
equally, so a rename or an unrelated refactor can leave the comment green while testing
nothing you intended. Wherever the expected failure is about a type (a wrong argument
type, a wrong return type) rather than a missing symbol, pair the `@ts-expect-error`
with an `expectTypeOf` assertion on the correct call next to it, so the test still fails
if the error moves to a different line or a different cause.

## Annotated generic exports

A generic function whose return type is hand-annotated instead of left to inference can
be annotated wider than what the implementation actually returns, which silently loses
precision for every caller. Any exported generic with an explicit return annotation
needs a type test proving the annotation is no wider than the inferred type — compare
`expectTypeOf(fn(...)).toEqualTypeOf<...>()` against a call whose input is concrete
enough to pin down the narrowest expected result. **BACKGROUND:** `writing-typescript`
explains why annotating a generic export is the standard way to accidentally widen it.

## What these tests do not cover

These assertions check the _source's own_ contract — the type-checker's view of
`src/index.ts` as compiled from `tests/types.test.ts`. They say nothing about what a
consumer sees after packaging: module resolution, `exports` conditions, and a `.d.ts`
rewritten by the build can all diverge from the source view. That published surface is
checked separately, from a consumer's point of view, by `pnpm package:smoke`. A green
`tests/types.test.ts` and a red `package:smoke` are not a contradiction — they are two
different guarantees.
