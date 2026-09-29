import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTransferRouteIntent,
  isRinkuTown,
  requiresTerminalSelection,
} from "../lib/transferRouteIntent.ts";

test("detects Rinku Town destination names", () => {
  assert.equal(isRinkuTown("りんくうタウン駅"), true);
  assert.equal(isRinkuTown("Rinku Town Station"), true);
  assert.equal(isRinkuTown("関西国際空港"), false);
});

test("requires terminal for direct KIX and Rinku airport intent only", () => {
  assert.equal(requiresTerminalSelection("関西国際空港", null), true);
  assert.equal(requiresTerminalSelection("りんくうタウン駅", "airport"), true);
  assert.equal(requiresTerminalSelection("りんくうタウン駅", "nankai"), false);
  assert.equal(requiresTerminalSelection("JR日根野駅", null), false);
});

test("formats Rinku route intent for notifications", () => {
  assert.equal(formatTransferRouteIntent("nankai", null), "南海線に乗車");
  assert.equal(formatTransferRouteIntent("airport", "1"), "空港へ移動（ターミナル1）");
  assert.equal(formatTransferRouteIntent("airport", null), "空港へ移動（ターミナル未設定）");
  assert.equal(formatTransferRouteIntent(null, null), null);
});
