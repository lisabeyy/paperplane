import { fail, json } from "@/lib/http";
import { isWallet } from "@/lib/auth";
import { jupiterQuote, jupiterSwap } from "@/lib/press";

export const dynamic = "force-dynamic";

function sideOf(value: string | null): "buy" | "sell" {
  return value === "sell" ? "sell" : "buy";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    const quoted = await jupiterQuote(sideOf(url.searchParams.get("side")), Number(url.searchParams.get("amount")));
    return json({ out: quoted.out, impactPct: quoted.impactPct, side: quoted.side });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No route.";
    return fail(message, message.includes("launch") ? 404 : 400);
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { side?: string; amount?: number; wallet?: string } | null;
  const wallet = body?.wallet?.trim() || "";
  if (!isWallet(wallet)) return fail("Connect a wallet first.", 401);
  try {
    const built = await jupiterSwap(sideOf(body?.side || null), Number(body?.amount), wallet);
    return json(built);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not build the swap.";
    return fail(message, message.includes("launch") ? 404 : 400);
  }
}
