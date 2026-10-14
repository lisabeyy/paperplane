import assert from "node:assert/strict";
import test from "node:test";
import { formatFiat, formatPercent, formatPrice, formatRatio } from "./format";
import { equity, liquidationPrice, pnl, returnedCash, takeProfitPrice } from "./engine";
import { MIN_AIR_MS, payouts } from "./payout";

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
});

test("pool pays landings by profit x weight", () => {
  const air = MIN_AIR_MS;
  const base = { reason: "land" as const, airMs: air, pilotWeight: 1, riders: [], wiped: false };
  // Solo flight with 3x the profit gets 3x the slice.
  let out = payouts([{ ...base, wallet: "a", pnl: 300 }, { ...base, wallet: "b", pnl: 100 }], 10);
  assert.equal(out.get("a"), 7.5);
  assert.equal(out.get("b"), 2.5);
  // Scalps under two minutes, losses and liquidations earn nothing.
  out = payouts(
    [
      { ...base, wallet: "a", pnl: 100 },
      { ...base, wallet: "s", pnl: 5000, airMs: air - 1 },
      { ...base, wallet: "l", pnl: -50 },
      { ...base, wallet: "q", pnl: 10, reason: "liq" as const },
    ],
    4,
  );
  assert.deepEqual([...out.entries()], [["a", 4]]);
  // With seats: pilot 30%, seats 70% by hold. A reset pilot forfeits, seats keep the whole slice.
  const riders = [{ wallet: "r1", weight: 3 }, { wallet: "r2", weight: 1 }];
  out = payouts([{ ...base, wallet: "p", pnl: 100, riders }], 10);
  assert.ok(Math.abs(out.get("p")! - 3) < 1e-9);
  assert.ok(Math.abs(out.get("r1")! - 5.25) < 1e-9);
  assert.ok(Math.abs(out.get("r2")! - 1.75) < 1e-9);
  out = payouts([{ ...base, wallet: "p", pnl: 100, riders, wiped: true }], 10);
  assert.equal(out.get("p"), undefined);
  assert.ok(Math.abs(out.get("r1")! - 7.5) < 1e-9);
  assert.equal(payouts([{ ...base, wallet: "a", pnl: 100 }], 0).size, 0);
});
