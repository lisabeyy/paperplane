import { MIN_TRADES_TO_PLACE, STARTING_CASH } from "./markets";
import { counts, payouts } from "./payout";
import { getBook } from "./prices";
import { seasonBounds } from "./season";
import { getStore, type Flight, type Pilot, type PositionRow } from "./store";

export type BoardRow = {
  wallet: string;
  callsign: string;
  roi: number;
  equity: number;
  trades: number;
  drawdown: number;
  mostly: string;
  eligible: boolean;
  /** SOL this wallet has earned from landings this season, as pilot and as a seat. Not tied to rank. */
  prize: number;
  /** Flights that count toward the pool: profitable and at least two minutes in the air. */
  landings: number;
  crashPnl: number | null;
};

function mostlyOf(flights: Flight[], pos: PositionRow | null): string {
  const counts = new Map<string, number>();
  for (const f of flights) counts.set(f.market, (counts.get(f.market) ?? 0) + 1);
  if (pos) counts.set(pos.market, (counts.get(pos.market) ?? 0) + 1);
  let best = "—";
  let n = 0;
  for (const [m, c] of counts) if (c > n) { best = m; n = c; }
  return best;
}

export async function buildBoard(league: "open" | "hype" | "crash") {
  const store = getStore();
  const season = seasonBounds();
  const [pilots, positions, flights] = await Promise.all([
    store.allPilots(season.id),
    store.allPositions(season.id),
    store.allFlights(season.id),
  ]);
  let book: Awaited<ReturnType<typeof getBook>> | null = null;
  try {
    book = await getBook(10_000);
  } catch {
    book = null;
  }
  const posBy = new Map(positions.map((p) => [p.wallet, p]));
  const pool = Number(process.env.PRIZE_POOL_SOL || 0);
  const earned = payouts(flights, pool);
  const flightsBy = new Map<string, Flight[]>();
  for (const f of flights) {
    if (f.wiped) continue;
    const list = flightsBy.get(f.wallet) ?? [];
    list.push(f);
    flightsBy.set(f.wallet, list);
  }

  const rows: BoardRow[] = [];
  for (const pilot of pilots) {
    const mine = flightsBy.get(pilot.wallet) ?? [];
    const pos = posBy.get(pilot.wallet) ?? null;
    if (mine.length === 0 && !pos) continue;
    const price = pos && pos.entry > 0 && book ? book[pos.market].price : null;
    const openPnl = pos && price != null ? pos.margin * pos.leverage * (price / pos.entry - 1) * (pos.side === "long" ? 1 : -1) : 0;
    const eq = pilot.cash + (pos ? pos.margin + openPnl : 0);
    const hypeFlights = mine.filter((f) => f.market === "HYPE");
    const hypePnl = hypeFlights.reduce((s, f) => s + f.pnl, 0) + (pos?.market === "HYPE" ? openPnl : 0);
    const crash = mine.reduce<number | null>((worst, f) => (f.pnl < 0 && (worst == null || f.pnl < worst) ? f.pnl : worst), null);
    const roi = league === "hype" ? hypePnl / STARTING_CASH : eq / STARTING_CASH - 1;
    if (league === "hype" && hypeFlights.length === 0 && pos?.market !== "HYPE") continue;
    if (league === "crash" && crash == null) continue;
    rows.push({
      wallet: pilot.wallet,
      callsign: pilot.callsign,
      roi,
      equity: league === "hype" ? STARTING_CASH + hypePnl : eq,
      trades: league === "hype" ? hypeFlights.length : mine.length,
      drawdown: pilot.maxDrawdown,
      mostly: mostlyOf(mine, pos),
      eligible: mine.length >= MIN_TRADES_TO_PLACE,
      prize: earned.get(pilot.wallet) ?? 0,
      landings: mine.filter(counts).length,
      crashPnl: crash,
    });
  }

  rows.sort((a, b) => {
    if (league === "crash") return (a.crashPnl ?? 0) - (b.crashPnl ?? 0);
    if (b.roi !== a.roi) return b.roi - a.roi;
    if (a.drawdown !== b.drawdown) return a.drawdown - b.drawdown;
    return a.wallet.localeCompare(b.wallet);
  });

  return {
    seasonId: season.id,
    startsAt: season.startsAt.toISOString(),
    endsAt: season.endsAt.toISOString(),
    poolSol: Number.isFinite(pool) ? pool : 0,
    pilots: pilots.length,
    flying: rows.length,
    league,
    rows,
    earned,
  };
}

export function rowFor(board: Awaited<ReturnType<typeof buildBoard>>, wallet: string | null) {
  if (!wallet) return null;
  return board.rows.find((r) => r.wallet === wallet) ?? null;
}

export function pilotEquity(pilot: Pilot, pos: PositionRow | null, price: number | null) {
  if (!pos || price == null) return pilot.cash;
  const dir = pos.side === "long" ? 1 : -1;
  return pilot.cash + pos.margin + pos.margin * pos.leverage * (price / pos.entry - 1) * dir;
}
