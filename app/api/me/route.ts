import { fail, json } from "@/lib/http";
import { readWallet } from "@/lib/auth";
import { equity } from "@/lib/engine";
import { STARTING_CASH } from "@/lib/markets";
import { getBook } from "@/lib/prices";
import { tierOf } from "@/lib/plane";
import { seasonBounds } from "@/lib/season";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const wallet = await readWallet();
  if (!wallet) return fail("Connect a wallet first.", 401);
  const season = seasonBounds();
  const store = getStore();
  const pilot = await store.getPilot(wallet, season.id);
  if (!pilot) return fail("Connect a wallet first.", 401);
  const position = await store.getPosition(wallet, season.id);
  const flights = await store.flightsFor(wallet, season.id, 8);
  const trades = await store.tradeCount(wallet, season.id);
  let mark: number | null = null;
  if (position) {
    try {
      mark = (await getBook())[position.market].price;
    } catch {
      mark = null;
    }
  }
  const eq = equity(pilot.cash, position, mark);
  const tier = await tierOf(wallet);
  return json({
    wallet,
    callsign: pilot.callsign,
    cash: pilot.cash,
    equity: eq,
    roi: eq / STARTING_CASH - 1,
    trades,
    resetsUsed: pilot.resetsUsed,
    position,
    mark,
    flights,
    seasonId: season.id,
    endsAt: season.endsAt.toISOString(),
    tier,
  });
}
