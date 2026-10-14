import type { Flight } from "./store";

/** A flight has to stay in the air this long before it can earn from the pool. */
export const MIN_AIR_MS = 120_000;

/** Pilot's cut of a landed flight that other wallets boarded. Seats split the rest by hold. */
export const PILOT_CUT = 0.3;

type Payable = Pick<Flight, "wallet" | "pnl" | "reason" | "airMs" | "pilotWeight" | "riders" | "wiped">;

/** Profitable, closed by the pilot or take-profit, and long enough in the air to not be a scalp. */
export function counts(f: Pick<Flight, "pnl" | "reason" | "airMs">): boolean {
  return f.pnl > 0 && f.reason !== "liq" && f.airMs >= MIN_AIR_MS;
}

/** A flight's claim on the pool: paper profit times the $PLANE weight aboard. */
export function score(f: Payable): number {
  if (!counts(f)) return 0;
  const seats = f.riders.reduce((s, r) => s + r.weight, 0);
  // A pilot who reset gave up their own cut; their passengers still flew and keep theirs.
  const aboard = (f.wiped ? 0 : f.pilotWeight) + seats;
  return f.pnl * aboard;
}

/**
 * Season pool split across landings, proportional to score.
 * Inside a flight: pilot alone takes all of it, otherwise 30% pilot / 70% seats by hold.
 */
export function payouts(flights: Payable[], pool: number): Map<string, number> {
  const out = new Map<string, number>();
  if (!(pool > 0)) return out;
  const scored = flights.map((f) => ({ f, s: score(f) })).filter((x) => x.s > 0);
  const total = scored.reduce((sum, x) => sum + x.s, 0);
  if (!(total > 0)) return out;
  const add = (wallet: string, sol: number) => out.set(wallet, (out.get(wallet) ?? 0) + sol);
  for (const { f, s } of scored) {
    const slice = (pool * s) / total;
    const seats = f.riders.reduce((sum, r) => sum + r.weight, 0);
    const pilotShare = f.wiped ? 0 : seats > 0 ? PILOT_CUT : 1;
    if (pilotShare > 0) add(f.wallet, slice * pilotShare);
    if (seats > 0) for (const r of f.riders) add(r.wallet, (slice * (1 - pilotShare) * r.weight) / seats);
  }
  return out;
}
