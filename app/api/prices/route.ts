import { json, fail } from "@/lib/http";
import { getBook } from "@/lib/prices";
import { startEngine } from "@/lib/loop";

export const dynamic = "force-dynamic";

startEngine();

export async function GET() {
  try {
    const book = await getBook();
    const markets = Object.fromEntries(
      Object.entries(book).map(([id, q]) => [id, { price: q.price, changePct: q.changePct, candles: q.candles }]),
    );
    return json({ markets, at: Date.now() });
  } catch (err) {
    console.error(err);
    return fail("prices unavailable", 503);
  }
}
