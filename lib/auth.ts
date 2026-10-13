import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { seasonBounds } from "./season";
import { getStore } from "./store";
import { shortWallet } from "./format";

const COOKIE = "pp_session";

export function newId(): string {
  return randomBytes(16).toString("hex");
}

export async function issueNonce(wallet: string) {
  if (!isWallet(wallet)) throw new Error("bad wallet");
  const nonce = randomBytes(16).toString("hex");
  const season = seasonBounds();
  const message = `Paperplane wants you to sign in.\n\nSeason: ${season.id}\nWallet: ${wallet}\nNonce: ${nonce}\n\nSigning proves you own this wallet. It does not send a transaction or spend funds.`;
  await getStore().putNonce(wallet, nonce, message, Date.now() + 10 * 60 * 1000);
  return { nonce, message };
}

export function isWallet(wallet: string): boolean {
  try {
    const raw = bs58.decode(wallet);
    return raw.length === 32;
  } catch {
    return false;
  }
}

export async function verifyAndSession(wallet: string, nonce: string, signatureB64: string) {
  const store = getStore();
  const message = await store.takeNonce(wallet, nonce);
  if (!message) throw new Error("nonce expired");
  const sig = Buffer.from(signatureB64, "base64");
  const ok = nacl.sign.detached.verify(new TextEncoder().encode(message), sig, bs58.decode(wallet));
  if (!ok) throw new Error("bad signature");
  const token = randomBytes(32).toString("hex");
  await store.putSession(token, wallet, Date.now() + 7 * 24 * 60 * 60 * 1000);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  await store.ensurePilot(wallet, seasonBounds().id, shortWallet(wallet));
  return wallet;
}

export async function readWallet(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return getStore().sessionWallet(token);
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await getStore().dropSession(token);
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function validCallsign(name: string): boolean {
  return /^[a-zA-Z0-9_.]{3,16}$/.test(name);
}
