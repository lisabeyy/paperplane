import { hit, liquidationPrice, returnedCash, takeProfitPrice, openFee } from "./engine";
import { withLock } from "./http";
import { MARKETS } from "./markets";
import { getBook } from "./prices";
import { seasonId } from "./season";
import { getStore, markEquity, type PositionRow } from "./store";

const g = globalThis as unknown as { __ppLoop?: boolean };

export async function settleOpen() {
  const store = getStore();
  const season = seasonId();
  let book;
  try {
    book = await getBook(4000);
  } catch (err) {
    console.error("price loop", err);
    return;
  }
  const positions = await store.allPositions(season);
  for (const pos of positions) {
    const quote = book[pos.market];
    if (!quote) continue;
    await withLock(pos.wallet, async () => {
      const current = await store.getPosition(pos.wallet, season);
      if (!current) return;
      if (current.phase === "boarding") {
        if (Date.now() >= current.takeoffAt) {
          try {
            await takeoff(current);
          } catch (err) {
            console.error("takeoff", err);
          }
        }
        return;
      }
      const reason = hit(current, quote.price);
      const pilot = await store.getPilot(pos.wallet, season);
      if (pilot) await markEquity(pilot, current, quote.price);
      if (reason) await closeAt(current, reason);
    });
  }
}

export async function takeoff(pos: PositionRow) {
  const store = getStore();
  const entry = (await getBook(0))[pos.market].price;
  const next: PositionRow = {
    ...pos,
    phase: "air",
    entry,
    liq: liquidationPrice(entry, pos.leverage, pos.side),
    tp: takeProfitPrice(entry, pos.tpPct, pos.side),
  };
  await store.savePosition(next);
  const pilot = await store.getPilot(pos.wallet, pos.seasonId);
  if (pilot) await markEquity(pilot, next, entry);
  return next;
}

/** Pull a fold back before takeoff. Margin and the open fee return to the paper account. */
export async function scratch(pos: PositionRow) {
  const store = getStore();
  const taken = await store.takePosition(pos.wallet, pos.seasonId);
  if (!taken || taken.phase !== "boarding") return null;
  await store.dropBoarders(taken.id);
  const pilot = await store.getPilot(taken.wallet, taken.seasonId);
  if (!pilot) return null;
  pilot.cash += taken.margin + openFee(taken.margin, taken.leverage, MARKETS[taken.market].fee);
  await markEquity(pilot, null, null);
  return pilot.cash;
}

export async function closeAt(pos: PositionRow, reason: "land" | "liq" | "tp", mark?: number) {
  const store = getStore();
  const taken = await store.takePosition(pos.wallet, pos.seasonId);
  if (!taken) return null;
  const price = reason === "land" ? (mark ?? (await getBook(0))[taken.market].price) : reason === "tp" ? taken.tp : taken.liq;
  const settled = returnedCash(taken, price, reason);
  const pilot = await store.getPilot(taken.wallet, taken.seasonId);
  if (!pilot) return null;
  pilot.cash += settled.back;
  const riders = taken.boarders ?? [];
  const flight = {
    id: taken.id,
    wallet: taken.wallet,
    seasonId: taken.seasonId,
    market: taken.market,
    side: taken.side,
    leverage: taken.leverage,
    margin: taken.margin,
    pnl: settled.realized,
    reason,
    closedAt: Date.now(),
    boarders: riders.length,
    weight: (taken.pilotWeight || 1) + riders.reduce((sum, b) => sum + b.weight, 0),
  };
  // Credit cash before the flight row exists: the client treats a new flight as "landed" and
  // immediately reads the board, which would otherwise rank this pilot without the returned cash.
  await markEquity(pilot, null, null);
  await store.addFlight(flight);
  return flight;
}

export function startEngine() {
  if (g.__ppLoop) return;
  g.__ppLoop = true;
  const tick = () => {
    settleOpen().catch((err) => console.error(err));
  };
  setInterval(tick, 3000);
  tick();
}
