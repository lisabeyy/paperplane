import { json } from "@/lib/http";
import { clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSession();
  return json({ ok: true });
}
