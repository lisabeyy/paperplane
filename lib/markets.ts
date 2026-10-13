export const MARKETS = {
  HYPE: { symbol: "HYPEUSDT", maxLev: 50, fee: 0.0006 },
  SOL: { symbol: "SOLUSDT", maxLev: 250, fee: 0.0006 },
  ETH: { symbol: "ETHUSDT", maxLev: 250, fee: 0.0006 },
  BTC: { symbol: "BTCUSDT", maxLev: 250, fee: 0.0006 },
} as const;

export type MarketId = keyof typeof MARKETS;

export const STARTING_CASH = 10_000;
export const MIN_MARGIN = 10;
export const MIN_TRADES_TO_PLACE = 10;
export const MAINT = 0.92;

export function isMarket(v: string): v is MarketId {
  return v in MARKETS;
}
