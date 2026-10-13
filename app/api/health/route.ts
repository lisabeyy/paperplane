import { json } from "@/lib/http";
import { seasonBounds } from "@/lib/season";
import { getStore } from "@/lib/store";
import { startEngine } from "@/lib/loop";

export const dynamic = "force-dynamic";

startEngine();

export async function GET() {
  const store = getStore();
  let db: "postgres" | "memory" | "error" = store.mode;
  try {
    await store.ready();
  } catch (err) {
    console.error(err);
    db = "error";
  }
  return json({ ok: db !== "error", db, season: seasonBounds().id });
}
