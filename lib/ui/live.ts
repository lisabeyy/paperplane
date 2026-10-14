import { MARKETS, type MarketId } from "@/lib/markets";

/**
 * Browser-side live marks. Binance trade stream first (same source the server fills on),
 * Hyperliquid mids for any market Binance has not ticked recently (geo-blocked regions, HYPE).
 * Display only: fills, liquidations and take-profits are still decided by the server.
 */
export type LiveTick = (market: MarketId, price: number, at: number) => void;

const IDS = Object.keys(MARKETS) as MarketId[];
const STALE_MS = 5000;

export function startLive(onTick: LiveTick): () => void {
  let stopped = false;
  const lastBinance: Partial<Record<MarketId, number>> = {};
  const sockets: { ws: WebSocket | null; timer: number }[] = [];

  function keepOpen(url: string, onOpen: (ws: WebSocket) => void, onMessage: (data: unknown) => void) {
    const slot = { ws: null as WebSocket | null, timer: 0 };
    sockets.push(slot);
    let backoff = 1000;
    const open = () => {
      if (stopped) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        slot.timer = window.setTimeout(open, backoff);
        return;
      }
      slot.ws = ws;
      ws.onopen = () => {
        backoff = 1000;
        onOpen(ws);
      };
      ws.onmessage = (ev) => {
        try {
          onMessage(JSON.parse(String(ev.data)));
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        slot.ws = null;
        if (stopped) return;
        slot.timer = window.setTimeout(open, backoff);
        backoff = Math.min(backoff * 2, 15000);
      };
      ws.onerror = () => ws.close();
    };
    open();
  }

  const bySymbol = new Map(IDS.map((id) => [MARKETS[id].symbol.toLowerCase(), id]));
  const streams = IDS.map((id) => `${MARKETS[id].symbol.toLowerCase()}@aggTrade`).join("/");
  keepOpen(
    `wss://stream.binance.com:9443/stream?streams=${streams}`,
    () => {},
    (msg) => {
      const m = msg as { stream?: string; data?: { p?: string } };
      const id = m.stream ? bySymbol.get(m.stream.split("@")[0]!) : undefined;
      const price = Number(m.data?.p);
      if (!id || !(price > 0)) return;
      const now = Date.now();
      lastBinance[id] = now;
      onTick(id, price, now);
    },
  );

  keepOpen(
    "wss://api.hyperliquid.xyz/ws",
    (ws) => ws.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } })),
    (msg) => {
      const m = msg as { channel?: string; data?: { mids?: Record<string, string> } };
      if (m.channel !== "allMids" || !m.data?.mids) return;
      const now = Date.now();
      for (const id of IDS) {
        if (now - (lastBinance[id] ?? 0) < STALE_MS) continue;
        const price = Number(m.data.mids[id]);
        if (price > 0) onTick(id, price, now);
      }
    },
  );

  return () => {
    stopped = true;
    for (const s of sockets) {
      clearTimeout(s.timer);
      s.ws?.close();
    }
  };
}
