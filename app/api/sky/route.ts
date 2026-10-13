import { json } from "@/lib/http";
import { getSky } from "@/lib/sky";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(await getSky());
}
