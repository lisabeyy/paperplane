import { readWallet } from "@/lib/auth";
import { fail, json, withLock } from "@/lib/http";
import { seasonBounds } from "@/lib/season";
import { getSky, ticketFor } from "@/lib/sky";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_ABOARD = 24;

function withTwo<T>(a: string, b: string, fn: () => Promise<T>): Promise<T> {
  const [first, second] = a < b ? [a, b] : [b, a];
  if (first === second) return withLock(first, fn);
  return withLock(first, () => withLock(second, fn));
}

export async function POST(req: Request) {
  const wallet = await readWallet();
  if (!wallet) return fail("Connect a wallet to board.", 401);
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return fail("Pick a plane.");
  const season = seasonBounds().id;
  const store = getStore();
  const found = (await store.allPositions(season)).find((p) => p.id === body.id);
  if (!found) return fail("That plane already left.");
  if (found.wallet === wallet) return fail("You folded this one. You are already on it.");

  return withTwo(wallet, found.wallet, async () => {
    const ticket = await ticketFor(wallet);
    if (!ticket.ok) return fail(ticket.error, 403);
    const pilotPos = await store.getPosition(found.wallet, season);
    if (!pilotPos || pilotPos.id !== body.id || pilotPos.phase !== "boarding") return fail("That plane already took off.");
    if (Date.now() >= pilotPos.takeoffAt) return fail("That plane is taking off.");
    if (pilotPos.boarders.some((b) => b.wallet === wallet)) return fail("You are already aboard.");
    if (pilotPos.boarders.length >= MAX_ABOARD) return fail("That plane is full.");
    if (await store.getPosition(wallet, season)) return fail("Land your own plane before you board someone else's.");
    if (await store.boardingSeat(wallet, season)) return fail("You are already aboard a plane on the ground.");
    try {
      await store.addBoarder(pilotPos.id, wallet, ticket.weight);
    } catch {
      return fail("You are already aboard.");
    }
    return json({ sky: await getSky() });
  });
}
