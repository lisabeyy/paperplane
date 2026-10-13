import { getBook } from "./prices";
import { seasonBounds } from "./season";
import { getStore } from "./store";

const SOL_MINT = "So11111111111111111111111111111111111111112";

function num(value: string | undefined): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function optional(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function planeMint(): string | null {
  const mint = process.env.PLANE_MINT || process.env.NEXT_PUBLIC_PLANE_MINT || "";
  return mint || null;
}

async function solBalance(wallet: string): Promise<number | null> {
  const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [wallet] }),
      cache: "no-store",
    });
    const json = (await res.json()) as { result?: { value?: number } };
    const lamports = json.result?.value;
    return typeof lamports === "number" ? lamports / 1e9 : null;
  } catch (err) {
    console.error("treasury balance", err);
    return null;
  }
}

const decimalsCache = new Map<string, number>();

export async function tokenDecimals(mint: string): Promise<number> {
  const hit = decimalsCache.get(mint);
  if (hit != null) return hit;
  const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [mint, { encoding: "jsonParsed" }],
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: { value?: { data?: { parsed?: { info?: { decimals?: number } } } } } };
  const decimals = json.result?.value?.data?.parsed?.info?.decimals;
  const n = typeof decimals === "number" ? decimals : 6;
  decimalsCache.set(mint, n);
  return n;
}

export async function getPress() {
  const season = seasonBounds();
  const store = getStore();
  const [pilots, flights] = await Promise.all([store.allPilots(season.id), store.allFlights(season.id)]);
  const poolSol = num(process.env.PRIZE_POOL_SOL);
  const collectedSol = optional(process.env.PRESS_SOL_COLLECTED);
  const paidSol = num(process.env.PRESS_SOL_PAID);
  const wallet = process.env.PRESS_WALLET || null;
  const treasurySol = wallet ? await solBalance(wallet) : null;
  let solPrice: number | null = null;
  try {
    solPrice = (await getBook(20_000)).SOL.price;
  } catch {
    solPrice = null;
  }
  const mint = planeMint();
  const unassignedSol = collectedSol == null ? null : Math.max(0, collectedSol - poolSol - paidSol);
  return {
    collectedSol,
    treasurySol,
    poolSol,
    paidSol,
    unassignedSol,
    share: 0.8,
    pilots: pilots.length,
    flights: flights.length,
    solPrice,
    wallet,
    solscan: wallet ? `https://solscan.io/account/${wallet}` : null,
    mint,
    pumpUrl: mint ? `https://pump.fun/coin/${mint}` : "https://pump.fun",
    jupUrl: mint ? `https://jup.ag/swap/SOL-${mint}` : null,
    seasonId: season.id,
    endsAt: season.endsAt.toISOString(),
  };
}

export async function jupiterQuote(side: "buy" | "sell", uiAmount: number) {
  const mint = planeMint();
  if (!mint) throw new Error("Trading opens at launch.");
  if (!Number.isFinite(uiAmount) || uiAmount <= 0 || uiAmount > 10_000) throw new Error("Enter an amount.");
  const decimals = side === "buy" ? 9 : await tokenDecimals(mint);
  const amount = Math.round(uiAmount * 10 ** decimals);
  const inputMint = side === "buy" ? SOL_MINT : mint;
  const outputMint = side === "buy" ? mint : SOL_MINT;
  const url = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=100`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No route for that size.");
  const quote = (await res.json()) as { outAmount?: string; priceImpactPct?: string; error?: string };
  if (!quote.outAmount) throw new Error(quote.error || "No route for that size.");
  const outDecimals = side === "buy" ? await tokenDecimals(mint) : 9;
  return {
    quote,
    out: Number(quote.outAmount) / 10 ** outDecimals,
    impactPct: Number(quote.priceImpactPct || 0) * 100,
    side,
  };
}

export async function jupiterSwap(side: "buy" | "sell", uiAmount: number, wallet: string) {
  const quoted = await jupiterQuote(side, uiAmount);
  const res = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quoted.quote,
      userPublicKey: wallet,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    }),
    cache: "no-store",
  });
  const body = (await res.json()) as { swapTransaction?: string; error?: string };
  if (!res.ok || !body.swapTransaction) throw new Error(body.error || "Could not build the swap.");
  return { transaction: body.swapTransaction, out: quoted.out };
}
