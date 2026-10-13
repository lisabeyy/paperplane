import { fail, json } from "@/lib/http";
import { issueNonce, isWallet } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { wallet?: string } | null;
  const wallet = body?.wallet?.trim() || "";
  if (!isWallet(wallet)) return fail("That is not a Solana address.");
  const issued = await issueNonce(wallet);
  return json(issued);
}
