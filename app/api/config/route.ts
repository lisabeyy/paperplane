import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const mint = process.env.PLANE_MINT || process.env.NEXT_PUBLIC_PLANE_MINT || null;
  const pool = Number(process.env.PRIZE_POOL_SOL || 0);
  return json({
    mint,
    pumpUrl: mint ? `https://pump.fun/coin/${mint}` : null,
    poolSol: Number.isFinite(pool) ? pool : 0,
    network: "solana",
  });
}
