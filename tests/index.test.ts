import { describe, expect, it } from "vitest";

import * as api from "../src/index.js";

describe("the public surface", () => {
  it("exports exactly TscBlameError", () => {
    // TscBlameErrorCode is a type, so it never appears as a runtime export
    // here — see tests/types.test.ts for the compile-time assertion on it,
    // and tests/errors.test.ts for TscBlameError's own behavior.
    expect(Object.keys(api).sort()).toEqual(["TscBlameError"]);
  });
});
