import assert from "node:assert/strict";
import test from "node:test";

import { ZERO_AUTH_SUMMARY_KEYS, recoveryActionKeys } from "./zeroAuthUx.ts";

test("zero auth agreement summary keeps the customer-facing explanation to three points", () => {
  assert.deepEqual(ZERO_AUTH_SUMMARY_KEYS, [
    "summaryNoCharge",
    "summaryDamageOnly",
    "summaryStripeSecure",
  ]);
});

test("reader payment failures expose practical recovery actions for staff", () => {
  assert.deepEqual(recoveryActionKeys("posDeclined", "reader", true), [
    "retry",
    "tryAnotherCard",
    "switchToScreenSignature",
    "changeStore",
  ]);
  assert.deepEqual(recoveryActionKeys("signTimeout", "reader", true), [
    "retry",
    "switchToScreenSignature",
    "changeStore",
  ]);
});

test("screen-signature generic failures stay simple", () => {
  assert.deepEqual(recoveryActionKeys("generic", "screen", false), ["retry"]);
});
