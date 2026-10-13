import { fail, json } from "@/lib/http";
import { readWallet } from "@/lib/auth";
import { tierOf } from "@/lib/plane";
import { seasonBounds } from "@/lib/season";
import { getStore } from "@/lib/store";
import { withLock } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  const wallet = await readWallet();
  if (!wallet) return fail("Connect a wallet first.", 401);
  return withLock(wallet, async () => {
    const season = seasonBounds().id;
    const store = getStore();
    const pilot = await store.getPilot(wallet, season);
    if (!pilot) return fail("No paper account yet.", 404);
    if (await store.getPosition(wallet, season)) return fail("Land the open plane before resetting.");
    const tier = await tierOf(wallet);
    const allowance = tier.resets ?? Number.POSITIVE_INFINITY;
    if (pilot.resetsUsed >= allowance) {
      return fail(tier.tier === "paper" ? "Paper tier gets one reset. Hold 250K $PLANE for more." : "No resets left this season.");
    }
    await store.resetSeason(wallet, season);
    return json({ ok: true, resetsUsed: pilot.resetsUsed + 1 });
  });
}
