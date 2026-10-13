import nacl from "tweetnacl";
import bs58 from "bs58";

const base = "http://127.0.0.1:3456";

async function signIn() {
  const kp = nacl.sign.keyPair();
  const wallet = bs58.encode(kp.publicKey);
  const nonceRes = await fetch(base + "/api/auth/nonce", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet }),
  });
  const issued = (await nonceRes.json()) as { nonce: string; message: string; error?: string };
  if (!nonceRes.ok) throw new Error("nonce " + JSON.stringify(issued));
  const sig = nacl.sign.detached(new TextEncoder().encode(issued.message), kp.secretKey);
  const verify = await fetch(base + "/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, nonce: issued.nonce, signature: Buffer.from(sig).toString("base64") }),
  });
  const cookie = verify.headers.get("set-cookie")?.split(";")[0];
  if (!verify.ok || !cookie) throw new Error("verify " + (await verify.text()));
  return { wallet, cookie };
}

async function main() {
  const pilot = await signIn();
  const rider = await signIn();
  const open = await fetch(base + "/api/trade/open", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: pilot.cookie },
    body: JSON.stringify({ market: "SOL", side: "long", margin: 200, leverage: 5, tpPct: 5 }),
  });
  const opened = (await open.json()) as { position?: { id: string; phase: string; entry: number }; error?: string };
  if (!open.ok || opened.position?.phase !== "boarding" || opened.position.entry !== 0) {
    throw new Error("open " + JSON.stringify(opened));
  }
  const board = await fetch(base + "/api/trade/board", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: rider.cookie },
    body: JSON.stringify({ id: opened.position.id }),
  });
  const boarded = (await board.json()) as { error?: string; sky?: { planes: { id: string; boarders: { wallet: string }[] }[] } };
  if (!board.ok) throw new Error("board " + JSON.stringify(boarded));
  const plane = boarded.sky?.planes.find((p) => p.id === opened.position!.id);
  if (!plane || plane.boarders.length !== 1 || plane.boarders[0]!.wallet !== rider.wallet) {
    throw new Error("seat " + JSON.stringify(boarded));
  }
  const again = await fetch(base + "/api/trade/board", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: rider.cookie },
    body: JSON.stringify({ id: opened.position.id }),
  });
  if (again.ok) throw new Error("double board should fail");
  const scratch = await fetch(base + "/api/trade/close", { method: "POST", headers: { cookie: pilot.cookie } });
  const scratched = (await scratch.json()) as { scratched?: boolean; error?: string };
  if (!scratch.ok || !scratched.scratched) throw new Error("scratch " + JSON.stringify(scratched));
  const sky = (await (await fetch(base + "/api/sky")).json()) as { planes: { id: string }[] };
  if (sky.planes.some((p) => p.id === opened.position!.id)) throw new Error("scratched plane still in the sky");
  console.log("sky ok", opened.position.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
