import { tierForBalance, TIERS } from "./engine";

const cache = new Map<string, { at: number; balance: number | null }>();

export async function planeBalance(wallet: string): Promise<number | null> {
  const mint = process.env.PLANE_MINT || process.env.NEXT_PUBLIC_PLANE_MINT || "";
  if (!mint) return null;
  const hit = cache.get(wallet);
  if (hit && Date.now() - hit.at < 60_000) return hit.balance;
  const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [wallet, { mint }, { encoding: "jsonParsed" }],
      }),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      result?: { value?: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }[] };
    };
    let sum = 0;
    for (const row of json.result?.value ?? []) {
      sum += Number(row.account.data.parsed.info.tokenAmount.uiAmount || 0);
    }
    cache.set(wallet, { at: Date.now(), balance: sum });
    return sum;
  } catch (err) {
    console.error("plane balance", err);
    return hit?.balance ?? null;
  }
}

export async function tierOf(wallet: string) {
  const balance = await planeBalance(wallet);
  const tier = tierForBalance(balance);
  return {
    balance,
    tier: tier.id,
    name: tier.name,
    resets: Number.isFinite(tier.resets) ? tier.resets : null,
    mint: process.env.PLANE_MINT || process.env.NEXT_PUBLIC_PLANE_MINT || null,
    ladder: TIERS.map((t) => ({ id: t.id, name: t.name, min: t.min, resets: Number.isFinite(t.resets) ? t.resets : null })),
  };
}
