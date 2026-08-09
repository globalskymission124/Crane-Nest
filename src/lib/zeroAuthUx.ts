export type ZeroAuthSignMethod = "screen" | "reader";

export type ZeroAuthIssue =
  | "generic"
  | "posDeclined"
  | "posTimeout"
  | "posCanceled"
  | "signFailed"
  | "signTimeout";

export type RecoveryActionKey =
  | "retry"
  | "tryAnotherCard"
  | "switchToScreenSignature"
  | "changeStore";

export const ZERO_AUTH_HOLD_AMOUNT_JPY = 50;

export const ZERO_AUTH_SUMMARY_KEYS = [
  "summaryNoCharge",
  "summaryDamageOnly",
  "summaryStripeSecure",
] as const;

export function recoveryActionKeys(
  issue: ZeroAuthIssue,
  signMethod: ZeroAuthSignMethod,
  hasMultipleBranches: boolean
): RecoveryActionKey[] {
  const common: RecoveryActionKey[] = ["retry"];
  const branchAction: RecoveryActionKey[] = hasMultipleBranches ? ["changeStore"] : [];
  const screenFallback: RecoveryActionKey[] =
    signMethod === "reader" ? ["switchToScreenSignature"] : [];

  if (issue === "posDeclined") {
    return [...common, "tryAnotherCard", ...screenFallback, ...branchAction];
  }

  if (issue === "posTimeout" || issue === "posCanceled") {
    return [...common, "tryAnotherCard", ...branchAction];
  }

  if (issue === "signFailed" || issue === "signTimeout") {
    return [...common, ...screenFallback, ...branchAction];
  }

  return common;
}
