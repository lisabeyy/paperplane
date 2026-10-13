import { fail, json, withLock } from "@/lib/http";
import { readWallet } from "@/lib/auth";
import { getBook } from "@/lib/prices";
import { seasonBounds } from "@/lib/season";
import { getStore } from "@/lib/store";
import { closeAt, scratch } from "@/lib/loop";

export const dynamic = "force-dynamic";

export async function POST() {
  const wallet = await readWallet();
  if (!wallet) return fail("Connect a wallet to fly.", 401);
  return withLock(wallet, async () => {
    const season = seasonBounds().id;
    const store = getStore();
    const pos = await store.getPosition(wallet, season);
    if (!pos) return fail("No plane on the sheet.");
    if (pos.phase === "boarding") {
      const cash = await scratch(pos);
      if (cash == null) return fail("That fold already left the ground.");
      return json({ scratched: true, cash });
    }
    let mark: number;
    try {
      mark = (await getBook(0))[pos.market].price;
    } catch {
      return fail("Live price is unavailable.", 503);
    }
    const flight = await closeAt(pos, "land", mark);
    if (!flight) return fail("That plane already landed.");
    const pilot = await store.getPilot(wallet, season);
    return json({ flight, cash: pilot?.cash ?? null });
  });
}
