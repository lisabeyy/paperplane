import { fail, json } from "@/lib/http";
import { readWallet } from "@/lib/auth";
import { buildBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const league = new URL(req.url).searchParams.get("league") || "open";
  if (league !== "open" && league !== "hype" && league !== "crash") return fail("unknown league");
  const { earned, ...board } = await buildBoard(league);
  const wallet = await readWallet();
  const index = wallet ? board.rows.findIndex((r) => r.wallet === wallet) : -1;
  return json({
    ...board,
    rows: board.rows.slice(0, 50),
    you: index >= 0 ? board.rows[index] : null,
    youRank: index >= 0 ? index + 1 : null,
    youSol: wallet ? (earned.get(wallet) ?? 0) : null,
  });
}
