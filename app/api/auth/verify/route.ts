import { fail, json } from "@/lib/http";
import { isWallet, verifyAndSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { wallet?: string; nonce?: string; signature?: string } | null;
  const wallet = body?.wallet?.trim() || "";
  if (!isWallet(wallet) || !body?.nonce || !body.signature) return fail("Missing signature.");
  try {
    await verifyAndSession(wallet, body.nonce, body.signature);
    return json({ ok: true, wallet });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sign-in failed";
    return fail(message === "bad signature" ? "Signature did not match this wallet." : "Sign-in expired. Try again.", 401);
  }
}
