import { MAINT, type MarketId } from "./markets";

export type Side = "long" | "short";

export type OpenPosition = {
  market: MarketId;
  side: Side;
  margin: number;
  leverage: number;
  entry: number;
  liq: number;
  tp: number;
};

export function liquidationPrice(entry: number, leverage: number, side: Side): number {
  return side === "long" ? entry * (1 - MAINT / leverage) : entry * (1 + MAINT / leverage);
}

export function takeProfitPrice(entry: number, tpPct: number, side: Side): number {
  const t = tpPct / 100;
  return side === "long" ? entry * (1 + t) : entry * (1 - t);
}

/** Linear perp PnL. Margin was already pulled from cash. A plane still on the ground has no entry yet. */
export function pnl(pos: Pick<OpenPosition, "margin" | "leverage" | "entry" | "side">, price: number): number {
  if (!(pos.entry > 0) || !(price > 0)) return 0;
  const dir = pos.side === "long" ? 1 : -1;
  return pos.margin * pos.leverage * (price / pos.entry - 1) * dir;
}

export function equity(cash: number, pos: OpenPosition | null, price: number | null): number {
  if (!pos) return cash;
  if (price == null || !(pos.entry > 0)) return cash + pos.margin;
  return cash + pos.margin + pnl(pos, price);
}

export function hit(pos: OpenPosition, price: number): "liq" | "tp" | null {
  if (pos.side === "long") {
    if (price <= pos.liq) return "liq";
    if (price >= pos.tp) return "tp";
    return null;
  }
  if (price >= pos.liq) return "liq";
  if (price <= pos.tp) return "tp";
  return null;
}

export function fillPrice(pos: OpenPosition, mark: number, reason: "land" | "liq" | "tp"): number {
  if (reason === "liq") return pos.liq;
  if (reason === "tp") return pos.tp;
  return mark;
}

/** Cash returned to the account. Liquidation returns nothing. */
export function returnedCash(pos: OpenPosition, price: number, reason: "land" | "liq" | "tp"): { back: number; realized: number } {
  if (reason === "liq") return { back: 0, realized: -pos.margin };
  const realized = pnl(pos, price);
  return { back: Math.max(0, pos.margin + realized), realized };
}

export function openFee(margin: number, leverage: number, feeRate: number): number {
  return margin * leverage * feeRate;
}

export function prizeForRank(index: number, pool: number): number {
  if (!(pool > 0) || index < 0 || index >= 50) return 0;
  if (index === 0) return pool * 0.25;
  if (index === 1) return pool * 0.15;
  if (index === 2) return pool * 0.1;
  if (index < 10) return (pool * 0.3) / 7;
  return (pool * 0.2) / 40;
}

export const TIERS = [
  { id: "paper", name: "paper", min: 0, resets: 1 },
  { id: "origami", name: "origami", min: 250_000, resets: 3 },
  { id: "jet", name: "jet", min: 2_000_000, resets: Number.POSITIVE_INFINITY },
  { id: "concorde", name: "concorde", min: 10_000_000, resets: Number.POSITIVE_INFINITY },
] as const;

export function tierForBalance(balance: number | null): (typeof TIERS)[number] {
  if (balance == null || !(balance > 0)) return TIERS[0];
  let current: (typeof TIERS)[number] = TIERS[0];
  for (const t of TIERS) if (balance >= t.min) current = t;
  return current;
}
