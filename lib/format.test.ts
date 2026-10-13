import assert from "node:assert/strict";
import test from "node:test";
import { formatFiat, formatPercent, formatPrice, formatRatio } from "./format";
import { equity, liquidationPrice, pnl, prizeForRank, returnedCash, takeProfitPrice } from "./engine";

test("fiat hides signed zero and tiny values", () => {
  assert.equal(formatFiat(0), "$0.00");
  assert.equal(formatFiat(-0), "$0.00");
  assert.equal(formatFiat(0.004, "detailed", true), "+<$0.01");
  assert.equal(formatFiat(1234.5, "compact"), "$1.2K");
  assert.equal(formatFiat(1234.5, "detailed"), "$1,234.50");
  assert.equal(formatFiat(Number.NaN), "--");
});

test("percent and ratio", () => {
  assert.equal(formatPercent(0, true), "0.00%");
  assert.equal(formatPercent(12.345, true), "+12.35%");
  assert.equal(formatPercent(412.64, true), "+412.6%");
  assert.equal(formatRatio(10), "10x");
  assert.equal(formatRatio(2.5), "2.5x");
});

test("prices never abbreviate", () => {
  assert.equal(formatPrice(83210.23), "$83,210.23");
  assert.equal(formatPrice(109.84, "compact"), "$110");
  assert.equal(formatPrice(0.00005835, "compact"), "$0.0₄58");
});

test("perp math", () => {
  const pos = {
    market: "SOL" as const,
    side: "long" as const,
    margin: 500,
    leverage: 10,
    entry: 100,
    liq: liquidationPrice(100, 10, "long"),
    tp: takeProfitPrice(100, 2, "long"),
  };
  assert.ok(Math.abs(pos.liq - 90.8) < 1e-9);
  assert.ok(Math.abs(pos.tp - 102) < 1e-9);
  assert.ok(Math.abs(pnl(pos, 110) - 500) < 1e-9);
  assert.ok(Math.abs(equity(9500, pos, 110) - 10500) < 1e-6);
  const crashed = returnedCash(pos, pos.liq, "liq");
  assert.equal(crashed.back, 0);
  assert.equal(crashed.realized, -500);
  assert.equal(prizeForRank(0, 84.2), 21.05);
  assert.equal(prizeForRank(3, 0), 0);
});
