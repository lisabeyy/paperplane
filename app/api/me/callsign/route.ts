import { fail, json } from "@/lib/http";
import { readWallet, validCallsign } from "@/lib/auth";
import { seasonBounds } from "@/lib/season";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const wallet = await readWallet();
  if (!wallet) return fail("Connect a wallet first.", 401);
  const body = (await req.json().catch(() => null)) as { callsign?: string } | null;
  const callsign = body?.callsign?.trim() || "";
  if (!validCallsign(callsign)) return fail("Use 3–16 letters, numbers, dots, or underscores.");
  const store = getStore();
  const pilot = await store.getPilot(wallet, seasonBounds().id);
  if (!pilot) return fail("No paper account yet.", 404);
  pilot.callsign = callsign;
  await store.savePilot(pilot);
  return json({ callsign });
}
