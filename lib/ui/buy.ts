import { Connection, VersionedTransaction } from "@solana/web3.js";

type Signer = {
  signTransaction: (tx: VersionedTransaction) => Promise<{ serialize: () => Uint8Array }>;
};

export async function sendSwap(provider: Signer, wallet: string, side: "buy" | "sell", amount: number) {
  const res = await fetch("/api/swap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, side, amount }),
  });
  const body = (await res.json()) as { transaction?: string; error?: string };
  if (!res.ok || !body.transaction) throw new Error(body.error || "Could not build the swap.");
  const raw = Uint8Array.from(atob(body.transaction), (c) => c.charCodeAt(0));
  const tx = VersionedTransaction.deserialize(raw);
  const signed = await provider.signTransaction(tx);
  const rpc = "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}
