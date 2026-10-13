import { fail, json, withLock } from "@/lib/http";
import { newId, readWallet } from "@/lib/auth";
import { openFee } from "@/lib/engine";
import { MARKETS, MIN_MARGIN, isMarket } from "@/lib/markets";
import { seasonBounds } from "@/lib/season";
import { BOARD_MS, ticketFor } from "@/lib/sky";
import { getStore, markEquity } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const wallet = await readWallet();
  if (!wallet) return fail("Connect a wallet to fly.", 401);
  const body = (await req.json().catch(() => null)) as {
    market?: string;
    side?: string;
    margin?: number;
    leverage?: number;
    tpPct?: number;
  } | null;
  if (!body || !body.market || !isMarket(body.market)) return fail("Pick a market.");
  if (body.side !== "long" && body.side !== "short") return fail("Pick long or short.");
  const market = body.market;
  const side = body.side as "long" | "short";
  const margin = Number(body.margin);
  const leverage = Number(body.leverage);
  const tpPct = Number(body.tpPct);
  const spec = MARKETS[market];
  if (!Number.isFinite(margin) || margin < MIN_MARGIN) return fail(`Margin starts at $${MIN_MARGIN}.`);
  if (!Number.isFinite(leverage) || leverage < 1.1 || leverage > spec.maxLev) return fail(`Leverage for ${market} is 1.1x to ${spec.maxLev}x.`);
  if (!Number.isFinite(tpPct) || tpPct < 0.2 || tpPct > 25) return fail("Take-profit is a 0.2% to 25% move.");

  return withLock(wallet, async () => {
    const season = seasonBounds().id;
    const store = getStore();
    const pilot = await store.getPilot(wallet, season);
    if (!pilot) return fail("No paper account yet.", 404);
    const ticket = await ticketFor(wallet);
    if (!ticket.ok) return fail(ticket.error, 403);
    if (await store.getPosition(wallet, season)) return fail("You already have a plane on the sheet.");
    if (await store.boardingSeat(wallet, season)) return fail("Leave the plane you boarded before you fold your own.");
    const fee = openFee(margin, leverage, spec.fee);
    if (margin + fee > pilot.cash + 1e-8) return fail("Not enough paper for that margin and fee.");
    pilot.cash -= margin + fee;
    const now = Date.now();
    const pos = {
      id: newId(),
      wallet,
      seasonId: season,
      market,
      side,
      margin,
      leverage,
      entry: 0,
      liq: 0,
      tp: 0,
      openedAt: now,
      phase: "boarding" as const,
      takeoffAt: now + BOARD_MS,
      tpPct,
      pilotWeight: ticket.weight,
      boarders: [],
    };
    await store.insertPosition(pos);
    await markEquity(pilot, pos, null);
    return json({ position: pos, cash: pilot.cash, fee, takeoffAt: pos.takeoffAt });
  });
}
