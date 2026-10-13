import { MARKETS, type MarketId } from "./markets";

export type Quote = {
  price: number;
  changePct: number;
  candles: number[];
  updatedAt: number;
};

type Book = Record<MarketId, Quote>;

const g = globalThis as unknown as { __ppBook?: Book; __ppInflight?: Promise<Book> | null };

const COINBASE: Partial<Record<MarketId, string>> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
};

function quote(price: number, changePct: number, candles: number[]): Quote {
  if (!Number.isFinite(price) || price <= 0 || candles.length < 10) throw new Error("incomplete quote");
  return { price, changePct: Number.isFinite(changePct) ? changePct : 0, candles, updatedAt: Date.now() };
}

async function fromBinance(id: MarketId): Promise<Quote> {
  const symbol = MARKETS[id].symbol;
  const [klineRes, tickerRes] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=180`, { cache: "no-store" }),
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, { cache: "no-store" }),
  ]);
  if (!klineRes.ok || !tickerRes.ok) throw new Error(`binance ${symbol} ${klineRes.status}`);
  const klines = (await klineRes.json()) as unknown[][];
  const ticker = (await tickerRes.json()) as { lastPrice: string; priceChangePercent: string };
  return quote(
    Number(ticker.lastPrice),
    Number(ticker.priceChangePercent),
    klines.map((row) => Number(row[4])),
  );
}

async function fromCoinbase(id: MarketId): Promise<Quote> {
  const product = COINBASE[id];
  if (!product) throw new Error(`no coinbase market for ${id}`);
  const [candleRes, statsRes] = await Promise.all([
    fetch(`https://api.exchange.coinbase.com/products/${product}/candles?granularity=60`, { cache: "no-store" }),
    fetch(`https://api.exchange.coinbase.com/products/${product}/stats`, { cache: "no-store" }),
  ]);
  if (!candleRes.ok || !statsRes.ok) throw new Error(`coinbase ${product} ${candleRes.status}`);
  const rows = (await candleRes.json()) as number[][];
  const stats = (await statsRes.json()) as { last: string; open: string };
  const candles = rows
    .slice(0, 180)
    .reverse()
    .map((row) => Number(row[4]));
  const price = Number(stats.last);
  const open = Number(stats.open);
  return quote(price, open > 0 ? (price / open - 1) * 100 : 0, candles);
}

async function fromHyperliquid(): Promise<Quote> {
  const now = Date.now();
  const body = (req: object) =>
    fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "candleSnapshot", req }),
      cache: "no-store",
    });
  const [minsRes, dayRes] = await Promise.all([
    body({ coin: "HYPE", interval: "1m", startTime: now - 180 * 60_000, endTime: now }),
    body({ coin: "HYPE", interval: "1d", startTime: now - 2 * 86_400_000, endTime: now }),
  ]);
  if (!minsRes.ok) throw new Error(`hyperliquid ${minsRes.status}`);
  const mins = (await minsRes.json()) as { c: string; o: string }[];
  const days = dayRes.ok ? ((await dayRes.json()) as { o: string }[]) : [];
  const candles = mins.map((row) => Number(row.c));
  const price = candles[candles.length - 1] ?? 0;
  const open = Number(days[days.length - 1]?.o ?? candles[0]);
  return quote(price, open > 0 ? (price / open - 1) * 100 : 0, candles);
}

async function one(id: MarketId): Promise<Quote> {
  const loaders = id === "HYPE" ? [fromBinance, fromHyperliquid] : [fromBinance, fromCoinbase];
  const errors: string[] = [];
  for (const load of loaders) {
    try {
      return await load(id);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "price failed");
    }
  }
  throw new Error(`${id}: ${errors.join(" | ")}`);
}

async function pull(): Promise<Book> {
  const entries = await Promise.all((Object.keys(MARKETS) as MarketId[]).map(async (id) => [id, await one(id)] as const));
  return Object.fromEntries(entries) as Book;
}

export async function getBook(maxAgeMs = 2500): Promise<Book> {
  const fresh = g.__ppBook && Date.now() - g.__ppBook.BTC.updatedAt < maxAgeMs;
  if (fresh && g.__ppBook) return g.__ppBook;
  if (!g.__ppInflight) {
    g.__ppInflight = pull()
      .then((book) => {
        g.__ppBook = book;
        return book;
      })
      .finally(() => {
        g.__ppInflight = null;
      });
  }
  try {
    return await g.__ppInflight;
  } catch (err) {
    if (g.__ppBook) return g.__ppBook;
    throw err;
  }
}

export async function mark(market: MarketId): Promise<number> {
  const book = await getBook(0);
  return book[market].price;
}
