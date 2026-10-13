import { fail, json } from "@/lib/http";
import { getPress } from "@/lib/press";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getPress());
  } catch (err) {
    console.error(err);
    return fail("The press is unavailable.", 503);
  }
}
