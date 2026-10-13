import nacl from "tweetnacl";
import bs58 from "bs58";

async function main() {
  const base = "http://127.0.0.1:3456";
  const kp = nacl.sign.keyPair();
  const wallet = bs58.encode(kp.publicKey);

  const prices = await fetch(base + "/api/prices");
  const book = (await prices.json()) as { markets: Record<string, { price: number; candles: number[] }> };
  if (!prices.ok) throw new Error("prices " + prices.status);
  for (const id of ["BTC", "ETH", "SOL", "HYPE"]) {
    const p = book.markets[id];
    if (!p || !(p.price > 0) || p.candles.length < 30) throw new Error("bad market " + id);
  }
  console.log(
    "prices",
    Object.fromEntries(Object.entries(book.markets).map(([k, v]) => [k, v.price])),
  );

  const nonceRes = await fetch(base + "/api/auth/nonce", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet }),
  });
  const issued = (await nonceRes.json()) as { nonce: string; message: string };
  if (!nonceRes.ok) throw new Error("nonce " + JSON.stringify(issued));
  const sig = nacl.sign.detached(new TextEncoder().encode(issued.message), kp.secretKey);
  const verify = await fetch(base + "/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, nonce: issued.nonce, signature: Buffer.from(sig).toString("base64") }),
  });
  const cookie = verify.headers.get("set-cookie")?.split(";")[0];
  const verified = await verify.json();
  if (!verify.ok || !cookie) throw new Error("verify " + JSON.stringify(verified));
  console.log("signed in", wallet.slice(0, 6));

  const open = await fetch(base + "/api/trade/open", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ market: "SOL", side: "long", margin: 200, leverage: 5, tpPct: 5 }),
  });
  const opened = (await open.json()) as { position: { phase: string; entry: number; id: string }; error?: string };
  if (!open.ok || opened.position?.phase !== "boarding") throw new Error("open " + JSON.stringify(opened));
  console.log("folded", opened.position.id, "phase", opened.position.phase);

  const me = (await (await fetch(base + "/api/me", { headers: { cookie } })).json()) as { position: unknown };
  if (!me.position) throw new Error("missing position");

  const close = await fetch(base + "/api/trade/close", { method: "POST", headers: { cookie } });
  const closed = (await close.json()) as { scratched?: boolean; error?: string };
  if (!close.ok || !closed.scratched) throw new Error("close " + JSON.stringify(closed));
  console.log("scratched");

  const again = await fetch(base + "/api/trade/close", { method: "POST", headers: { cookie } });
  if (again.status !== 400) throw new Error("expected 400 on second close");
  console.log("smoke ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
