import { planeBalance } from "./plane";
import { seasonBounds } from "./season";
import { getStore } from "./store";

/** How long a fold sits on the ground before the fill. */
export const BOARD_MS = 90_000;

/** Hold required to fold or board once the mint exists. */
export const TICKET = 250_000;

/** Pilot's cut of a landed flight that other people boarded. The rest is split by weight. */
export const PILOT_CUT = 0.3;

function mint() {
  return process.env.PLANE_MINT || process.env.NEXT_PUBLIC_PLANE_MINT || "";
}

export async function ticketFor(wallet: string): Promise<{ ok: true; weight: number } | { ok: false; error: string }> {
  if (!mint()) return { ok: true, weight: 1 };
  const balance = await planeBalance(wallet);
  if (balance == null) return { ok: false, error: "Could not read your $PLANE balance. Try again." };
  if (balance < TICKET) return { ok: false, error: "Hold 250K $PLANE to fold or board a plane." };
  return { ok: true, weight: balance };
}

export async function getSky() {
  const season = seasonBounds();
  const store = getStore();
  const [positions, pilots] = await Promise.all([store.allPositions(season.id), store.allPilots(season.id)]);
  const names = new Map(pilots.map((p) => [p.wallet, p.callsign]));
  const call = (wallet: string) => names.get(wallet) || `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
  const planes = positions
    .slice()
    .sort((a, b) => {
      if (a.phase !== b.phase) return a.phase === "boarding" ? -1 : 1;
      return a.takeoffAt - b.takeoffAt;
    })
    .map((p) => ({
      id: p.id,
      wallet: p.wallet,
      callsign: call(p.wallet),
      market: p.market,
      side: p.side,
      leverage: p.leverage,
      margin: p.margin,
      phase: p.phase,
      takeoffAt: p.takeoffAt,
      entry: p.entry,
      liq: p.liq,
      tp: p.tp,
      boarders: p.boarders.map((b) => ({ wallet: b.wallet, callsign: call(b.wallet), weight: b.weight })),
    }));
  return {
    seasonId: season.id,
    boardMs: BOARD_MS,
    ticket: mint() ? TICKET : null,
    planes,
  };
}
