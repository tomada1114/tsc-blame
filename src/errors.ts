/**
 * Discriminator carried by {@link TscBlameError}.
 *
 * @remarks
 * `docs/design/v0.1.md` §11 lists the full vocabulary of codes the pipeline
 * will eventually raise, keyed by the stage that raises them. This union is
 * populated incrementally rather than all at once: each issue in §15's
 * delivery order widens it with the literal codes the stage it ships can
 * raise, in the same pull request that ships that stage. No stage has
 * shipped yet, so the union starts with no members.
 *
 * @public
 */
export type TscBlameErrorCode = never;

/**
 * The single error class raised across the tsc-blame pipeline.
 *
 * @remarks
 * `code` and `stage` are part of the published contract and are safe to
 * branch on. `message` is written for humans and may be reworded in a patch
 * release, so do not match on it.
 *
 * @public
 */
export class TscBlameError extends Error {
  /** Stable discriminator naming the specific failure. */
  readonly code: TscBlameErrorCode;

  /**
   * Name of the pipeline stage that raised the error, for example
   * `"measure"` or `"parse"`.
   */
  readonly stage: string;

  /**
   * The underlying error or value this error wraps, when there is one.
   *
   * @remarks
   * `declare`d rather than a plain field: with `useDefineForClassFields`
   * (implied by this package's `target`), an ordinary field declaration
   * defines the property — as `undefined` — for every instance regardless
   * of whether the constructor assigns it, which would make `"cause" in
   * error` true even when no cause was given. `declare` opts this field out
   * of that definition, leaving the constructor's conditional assignment as
   * the only thing that ever creates the property.
   */
  declare readonly cause?: unknown;

  /**
   * @param options - See {@link TscBlameError.code}, {@link TscBlameError.stage}
   * and {@link TscBlameError.cause}. `options.message` is a human-readable
   * explanation of the failure.
   */
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
