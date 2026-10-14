import { Pool } from "pg";
import { equity, type OpenPosition, type Side } from "./engine";
import { STARTING_CASH, type MarketId } from "./markets";
import { seasonId } from "./season";

export type Pilot = {
  wallet: string;
  seasonId: string;
  callsign: string;
  cash: number;
  peakEquity: number;
  maxDrawdown: number;
  resetsUsed: number;
};

export type Boarder = { wallet: string; weight: number };

export type PositionRow = OpenPosition & {
  id: string;
  wallet: string;
  seasonId: string;
  openedAt: number;
  /** boarding: on the ground, waiting for other wallets. air: filled. */
  phase: "boarding" | "air";
  takeoffAt: number;
  tpPct: number;
  pilotWeight: number;
  boarders: Boarder[];
};

export type Flight = {
  id: string;
  wallet: string;
  seasonId: string;
  market: MarketId;
  side: Side;
  leverage: number;
  margin: number;
  pnl: number;
  reason: "land" | "liq" | "tp";
  closedAt: number;
  boarders: number;
  weight: number;
  /** Time between takeoff and close. Short hops do not earn from the pool. */
  airMs: number;
  pilotWeight: number;
  /** Wallets that boarded, with the $PLANE hold they flew with. */
  riders: Boarder[];
  /** Hidden by an account reset. Kept so passengers still earn from it. */
  wiped: boolean;
};

export type Store = {
  mode: "postgres" | "memory";
  ready: () => Promise<void>;
  putNonce: (wallet: string, nonce: string, message: string, expiresAt: number) => Promise<void>;
  takeNonce: (wallet: string, nonce: string) => Promise<string | null>;
  putSession: (token: string, wallet: string, expiresAt: number) => Promise<void>;
  sessionWallet: (token: string) => Promise<string | null>;
  dropSession: (token: string) => Promise<void>;
  getPilot: (wallet: string, season: string) => Promise<Pilot | null>;
  ensurePilot: (wallet: string, season: string, callsign: string) => Promise<Pilot>;
  savePilot: (pilot: Pilot) => Promise<void>;
  getPosition: (wallet: string, season: string) => Promise<PositionRow | null>;
  insertPosition: (row: PositionRow) => Promise<void>;
  savePosition: (row: PositionRow) => Promise<void>;
  addBoarder: (positionId: string, wallet: string, weight: number) => Promise<void>;
  dropBoarders: (positionId: string) => Promise<void>;
  /** Position id of a plane this wallet has boarded that is still on the ground. */
  boardingSeat: (wallet: string, season: string) => Promise<string | null>;
  /** Deletes the open position if it still exists. */
  takePosition: (wallet: string, season: string) => Promise<PositionRow | null>;
  addFlight: (flight: Flight) => Promise<void>;
  flightsFor: (wallet: string, season: string, limit?: number) => Promise<Flight[]>;
  tradeCount: (wallet: string, season: string) => Promise<number>;
  allPilots: (season: string) => Promise<Pilot[]>;
  allPositions: (season: string) => Promise<PositionRow[]>;
  /** Every flight in the season, including ones hidden by a reset. Filter on `wiped` for display. */
  allFlights: (season: string) => Promise<Flight[]>;
  resetSeason: (wallet: string, season: string) => Promise<void>;
};

type Mem = {
  nonces: Map<string, { nonce: string; message: string; expiresAt: number }>;
  sessions: Map<string, { wallet: string; expiresAt: number }>;
  pilots: Map<string, Pilot>;
  positions: Map<string, PositionRow>;
  flights: Flight[];
};

function key(wallet: string, season: string) {
  return `${season}:${wallet}`;
}

function memoryStore(): Store {
  const mem: Mem = { nonces: new Map(), sessions: new Map(), pilots: new Map(), positions: new Map(), flights: [] };
  return {
    mode: "memory",
    ready: async () => {},
    async putNonce(wallet, nonce, message, expiresAt) {
      mem.nonces.set(wallet, { nonce, message, expiresAt });
    },
    async takeNonce(wallet, nonce) {
      const row = mem.nonces.get(wallet);
      if (!row || row.nonce !== nonce || row.expiresAt < Date.now()) return null;
      mem.nonces.delete(wallet);
      return row.message;
    },
    async putSession(token, wallet, expiresAt) {
      mem.sessions.set(token, { wallet, expiresAt });
    },
    async sessionWallet(token) {
      const row = mem.sessions.get(token);
      if (!row || row.expiresAt < Date.now()) return null;
      return row.wallet;
    },
    async dropSession(token) {
      mem.sessions.delete(token);
    },
    async getPilot(wallet, season) {
      return mem.pilots.get(key(wallet, season)) ?? null;
    },
    async ensurePilot(wallet, season, callsign) {
      const existing = mem.pilots.get(key(wallet, season));
      if (existing) return existing;
      const pilot: Pilot = {
        wallet,
        seasonId: season,
        callsign,
        cash: STARTING_CASH,
        peakEquity: STARTING_CASH,
        maxDrawdown: 0,
        resetsUsed: 0,
      };
      mem.pilots.set(key(wallet, season), pilot);
      return pilot;
    },
    async savePilot(pilot) {
      mem.pilots.set(key(pilot.wallet, pilot.seasonId), pilot);
    },
    async getPosition(wallet, season) {
      return mem.positions.get(key(wallet, season)) ?? null;
    },
    async insertPosition(row) {
      if (mem.positions.has(key(row.wallet, row.seasonId))) throw new Error("position exists");
      mem.positions.set(key(row.wallet, row.seasonId), { ...row, boarders: row.boarders ?? [] });
    },
    async savePosition(row) {
      const current = mem.positions.get(key(row.wallet, row.seasonId));
      if (!current || current.id !== row.id) return;
      mem.positions.set(key(row.wallet, row.seasonId), { ...current, ...row, boarders: current.boarders });
    },
    async addBoarder(positionId, wallet, weight) {
      const row = [...mem.positions.values()].find((p) => p.id === positionId);
      if (!row) throw new Error("plane gone");
      if (row.boarders.some((b) => b.wallet === wallet)) throw new Error("already aboard");
      row.boarders.push({ wallet, weight });
    },
    async dropBoarders(positionId) {
      const row = [...mem.positions.values()].find((p) => p.id === positionId);
      if (row) row.boarders = [];
    },
    async boardingSeat(wallet, season) {
      const row = [...mem.positions.values()].find(
        (p) => p.seasonId === season && p.phase === "boarding" && p.boarders.some((b) => b.wallet === wallet),
      );
      return row?.id ?? null;
    },
    async takePosition(wallet, season) {
      const k = key(wallet, season);
      const row = mem.positions.get(k) ?? null;
      if (row) mem.positions.delete(k);
      return row;
    },
    async addFlight(flight) {
      mem.flights.unshift({ ...flight, boarders: flight.boarders ?? 0, weight: flight.weight ?? 1, riders: flight.riders ?? [], wiped: false });
    },
    async flightsFor(wallet, season, limit = 12) {
      return mem.flights.filter((f) => f.wallet === wallet && f.seasonId === season && !f.wiped).slice(0, limit);
    },
    async tradeCount(wallet, season) {
      return mem.flights.filter((f) => f.wallet === wallet && f.seasonId === season && !f.wiped).length;
    },
    async allPilots(season) {
      return [...mem.pilots.values()].filter((p) => p.seasonId === season);
    },
    async allPositions(season) {
      return [...mem.positions.values()].filter((p) => p.seasonId === season);
    },
    async allFlights(season) {
      return mem.flights.filter((f) => f.seasonId === season);
    },
    async resetSeason(wallet, season) {
      const pilot = mem.pilots.get(key(wallet, season));
      if (!pilot) return;
      pilot.cash = STARTING_CASH;
      pilot.peakEquity = STARTING_CASH;
      pilot.maxDrawdown = 0;
      pilot.resetsUsed += 1;
      mem.positions.delete(key(wallet, season));
      for (const f of mem.flights) if (f.wallet === wallet && f.seasonId === season) f.wiped = true;
    },
  };
}

function pgStore(pool: Pool): Store {
  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS nonces (
      wallet TEXT PRIMARY KEY,
      nonce TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pilots (
      wallet TEXT NOT NULL,
      season_id TEXT NOT NULL,
      callsign TEXT NOT NULL,
      cash DOUBLE PRECISION NOT NULL,
      peak_equity DOUBLE PRECISION NOT NULL,
      max_drawdown DOUBLE PRECISION NOT NULL,
      resets_used INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (wallet, season_id)
    );
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      season_id TEXT NOT NULL,
      market TEXT NOT NULL,
      side TEXT NOT NULL,
      margin DOUBLE PRECISION NOT NULL,
      leverage DOUBLE PRECISION NOT NULL,
      entry DOUBLE PRECISION NOT NULL,
      liq DOUBLE PRECISION NOT NULL,
      tp DOUBLE PRECISION NOT NULL,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      phase TEXT NOT NULL DEFAULT 'air',
      takeoff_at TIMESTAMPTZ,
      tp_pct DOUBLE PRECISION NOT NULL DEFAULT 2,
      pilot_weight DOUBLE PRECISION NOT NULL DEFAULT 1,
      UNIQUE (wallet, season_id)
    );
    ALTER TABLE positions ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'air';
    ALTER TABLE positions ADD COLUMN IF NOT EXISTS takeoff_at TIMESTAMPTZ;
    ALTER TABLE positions ADD COLUMN IF NOT EXISTS tp_pct DOUBLE PRECISION NOT NULL DEFAULT 2;
    ALTER TABLE positions ADD COLUMN IF NOT EXISTS pilot_weight DOUBLE PRECISION NOT NULL DEFAULT 1;
    CREATE TABLE IF NOT EXISTS boarders (
      position_id TEXT NOT NULL,
      wallet TEXT NOT NULL,
      weight DOUBLE PRECISION NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (position_id, wallet)
    );
    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      season_id TEXT NOT NULL,
      market TEXT NOT NULL,
      side TEXT NOT NULL,
      leverage DOUBLE PRECISION NOT NULL,
      margin DOUBLE PRECISION NOT NULL,
      pnl DOUBLE PRECISION NOT NULL,
      reason TEXT NOT NULL,
      closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      boarders INT NOT NULL DEFAULT 0,
      weight DOUBLE PRECISION NOT NULL DEFAULT 1
    );
    ALTER TABLE flights ADD COLUMN IF NOT EXISTS boarders INT NOT NULL DEFAULT 0;
    ALTER TABLE flights ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION NOT NULL DEFAULT 1;
    ALTER TABLE flights ADD COLUMN IF NOT EXISTS air_ms BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE flights ADD COLUMN IF NOT EXISTS pilot_weight DOUBLE PRECISION NOT NULL DEFAULT 1;
    ALTER TABLE flights ADD COLUMN IF NOT EXISTS riders JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE flights ADD COLUMN IF NOT EXISTS wiped BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS flights_season_idx ON flights (season_id, closed_at DESC);
  `).then(() => undefined);

  const mapPos = (r: Record<string, unknown>): PositionRow => ({
    id: String(r.id),
    wallet: String(r.wallet),
    seasonId: String(r.season_id),
    market: r.market as MarketId,
    side: r.side as Side,
    margin: Number(r.margin),
    leverage: Number(r.leverage),
    entry: Number(r.entry),
    liq: Number(r.liq),
    tp: Number(r.tp),
    openedAt: new Date(String(r.opened_at)).getTime(),
    phase: r.phase === "boarding" ? "boarding" : "air",
    takeoffAt: r.takeoff_at ? new Date(String(r.takeoff_at)).getTime() : 0,
    tpPct: Number(r.tp_pct ?? 2),
    pilotWeight: Number(r.pilot_weight ?? 1),
    boarders: [],
  });

  const attach = async (rows: PositionRow[]): Promise<PositionRow[]> => {
    if (!rows.length) return rows;
    const q = await pool.query(`SELECT position_id, wallet, weight FROM boarders WHERE position_id = ANY($1::text[])`, [rows.map((r) => r.id)]);
    const by = new Map<string, Boarder[]>();
    for (const raw of q.rows) {
      const id = String(raw.position_id);
      const list = by.get(id) ?? [];
      list.push({ wallet: String(raw.wallet), weight: Number(raw.weight) });
      by.set(id, list);
    }
    return rows.map((r) => ({ ...r, boarders: by.get(r.id) ?? [] }));
  };

  const mapFlight = (r: Record<string, unknown>): Flight => ({
    id: String(r.id),
    wallet: String(r.wallet),
    seasonId: String(r.season_id),
    market: r.market as MarketId,
    side: r.side as Side,
    leverage: Number(r.leverage),
    margin: Number(r.margin),
    pnl: Number(r.pnl),
    reason: r.reason as Flight["reason"],
    closedAt: new Date(String(r.closed_at)).getTime(),
    boarders: Number(r.boarders ?? 0),
    weight: Number(r.weight ?? 1),
    airMs: Number(r.air_ms ?? 0),
    pilotWeight: Number(r.pilot_weight ?? 1),
    riders: Array.isArray(r.riders) ? (r.riders as Boarder[]).map((b) => ({ wallet: String(b.wallet), weight: Number(b.weight) })) : [],
    wiped: Boolean(r.wiped),
  });

  const mapPilot = (r: Record<string, unknown>): Pilot => ({
    wallet: String(r.wallet),
    seasonId: String(r.season_id),
    callsign: String(r.callsign),
    cash: Number(r.cash),
    peakEquity: Number(r.peak_equity),
    maxDrawdown: Number(r.max_drawdown),
    resetsUsed: Number(r.resets_used),
  });

  return {
    mode: "postgres",
    ready: () => ready,
    async putNonce(wallet, nonce, message, expiresAt) {
      await ready;
      await pool.query(
        `INSERT INTO nonces (wallet, nonce, message, expires_at) VALUES ($1,$2,$3,$4)
         ON CONFLICT (wallet) DO UPDATE SET nonce = $2, message = $3, expires_at = $4`,
        [wallet, nonce, message, new Date(expiresAt)],
      );
    },
    async takeNonce(wallet, nonce) {
      await ready;
      const q = await pool.query(`DELETE FROM nonces WHERE wallet = $1 AND nonce = $2 AND expires_at > now() RETURNING message`, [wallet, nonce]);
      return q.rowCount ? String(q.rows[0].message) : null;
    },
    async putSession(token, wallet, expiresAt) {
      await ready;
      await pool.query(`INSERT INTO sessions (token, wallet, expires_at) VALUES ($1,$2,$3)`, [token, wallet, new Date(expiresAt)]);
    },
    async sessionWallet(token) {
      await ready;
      const q = await pool.query(`SELECT wallet FROM sessions WHERE token = $1 AND expires_at > now()`, [token]);
      return q.rowCount ? String(q.rows[0].wallet) : null;
    },
    async dropSession(token) {
      await ready;
      await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
    },
    async getPilot(wallet, season) {
      await ready;
      const q = await pool.query(`SELECT * FROM pilots WHERE wallet = $1 AND season_id = $2`, [wallet, season]);
      return q.rowCount ? mapPilot(q.rows[0]) : null;
    },
    async ensurePilot(wallet, season, callsign) {
      await ready;
      const q = await pool.query(
        `INSERT INTO pilots (wallet, season_id, callsign, cash, peak_equity, max_drawdown)
         VALUES ($1,$2,$3,$4,$4,0)
         ON CONFLICT (wallet, season_id) DO UPDATE SET callsign = pilots.callsign
         RETURNING *`,
        [wallet, season, callsign, STARTING_CASH],
      );
      return mapPilot(q.rows[0]);
    },
    async savePilot(pilot) {
      await ready;
      await pool.query(
        `UPDATE pilots SET callsign = $3, cash = $4, peak_equity = $5, max_drawdown = $6, resets_used = $7
         WHERE wallet = $1 AND season_id = $2`,
        [pilot.wallet, pilot.seasonId, pilot.callsign, pilot.cash, pilot.peakEquity, pilot.maxDrawdown, pilot.resetsUsed],
      );
    },
    async getPosition(wallet, season) {
      await ready;
      const q = await pool.query(`SELECT * FROM positions WHERE wallet = $1 AND season_id = $2`, [wallet, season]);
      if (!q.rowCount) return null;
      const [row] = await attach([mapPos(q.rows[0])]);
      return row ?? null;
    },
    async insertPosition(row) {
      await ready;
      await pool.query(
        `INSERT INTO positions (id, wallet, season_id, market, side, margin, leverage, entry, liq, tp, opened_at, phase, takeoff_at, tp_pct, pilot_weight)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          row.id,
          row.wallet,
          row.seasonId,
          row.market,
          row.side,
          row.margin,
          row.leverage,
          row.entry,
          row.liq,
          row.tp,
          new Date(row.openedAt),
          row.phase,
          new Date(row.takeoffAt),
          row.tpPct,
          row.pilotWeight,
        ],
      );
    },
    async savePosition(row) {
      await ready;
      await pool.query(`UPDATE positions SET phase = $2, entry = $3, liq = $4, tp = $5 WHERE id = $1`, [row.id, row.phase, row.entry, row.liq, row.tp]);
    },
    async addBoarder(positionId, wallet, weight) {
      await ready;
      await pool.query(`INSERT INTO boarders (position_id, wallet, weight) VALUES ($1,$2,$3)`, [positionId, wallet, weight]);
    },
    async dropBoarders(positionId) {
      await ready;
      await pool.query(`DELETE FROM boarders WHERE position_id = $1`, [positionId]);
    },
    async boardingSeat(wallet, season) {
      await ready;
      const q = await pool.query(
        `SELECT p.id FROM boarders b JOIN positions p ON p.id = b.position_id
         WHERE b.wallet = $1 AND p.season_id = $2 AND p.phase = 'boarding' LIMIT 1`,
        [wallet, season],
      );
      return q.rowCount ? String(q.rows[0].id) : null;
    },
    async takePosition(wallet, season) {
      await ready;
      const q = await pool.query(`DELETE FROM positions WHERE wallet = $1 AND season_id = $2 RETURNING *`, [wallet, season]);
      if (!q.rowCount) return null;
      const [row] = await attach([mapPos(q.rows[0])]);
      if (row) await pool.query(`DELETE FROM boarders WHERE position_id = $1`, [row.id]);
      return row ?? null;
    },
    async addFlight(flight) {
      await ready;
      await pool.query(
        `INSERT INTO flights (id, wallet, season_id, market, side, leverage, margin, pnl, reason, closed_at, boarders, weight, air_ms, pilot_weight, riders)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          flight.id,
          flight.wallet,
          flight.seasonId,
          flight.market,
          flight.side,
          flight.leverage,
          flight.margin,
          flight.pnl,
          flight.reason,
          new Date(flight.closedAt),
          flight.boarders,
          flight.weight,
          Math.round(flight.airMs),
          flight.pilotWeight,
          JSON.stringify(flight.riders),
        ],
      );
    },
    async flightsFor(wallet, season, limit = 12) {
      await ready;
      const q = await pool.query(
        `SELECT * FROM flights WHERE wallet = $1 AND season_id = $2 AND NOT wiped ORDER BY closed_at DESC LIMIT $3`,
        [wallet, season, limit],
      );
      return q.rows.map(mapFlight);
    },
    async tradeCount(wallet, season) {
      await ready;
      const q = await pool.query(`SELECT count(*)::int AS n FROM flights WHERE wallet = $1 AND season_id = $2 AND NOT wiped`, [wallet, season]);
      return Number(q.rows[0].n);
    },
    async allPilots(season) {
      await ready;
      const q = await pool.query(`SELECT * FROM pilots WHERE season_id = $1`, [season]);
      return q.rows.map(mapPilot);
    },
    async allPositions(season) {
      await ready;
      const q = await pool.query(`SELECT * FROM positions WHERE season_id = $1`, [season]);
      return attach(q.rows.map(mapPos));
    },
    async allFlights(season) {
      await ready;
      const q = await pool.query(`SELECT * FROM flights WHERE season_id = $1`, [season]);
      return q.rows.map(mapFlight);
    },
    async resetSeason(wallet, season) {
      await ready;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM boarders WHERE position_id IN (SELECT id FROM positions WHERE wallet = $1 AND season_id = $2)`, [wallet, season]);
        await client.query(`DELETE FROM positions WHERE wallet = $1 AND season_id = $2`, [wallet, season]);
        await client.query(`UPDATE flights SET wiped = true WHERE wallet = $1 AND season_id = $2`, [wallet, season]);
        await client.query(
          `UPDATE pilots SET cash = $3, peak_equity = $3, max_drawdown = 0, resets_used = resets_used + 1 WHERE wallet = $1 AND season_id = $2`,
          [wallet, season, STARTING_CASH],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

const globalStore = globalThis as unknown as { __ppStore?: Store };

export function getStore(): Store {
  if (globalStore.__ppStore) return globalStore.__ppStore;
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      console.error("DATABASE_URL is missing. Leaderboard will reset whenever the server restarts.");
    }
    globalStore.__ppStore = memoryStore();
    return globalStore.__ppStore;
  }
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") || url.includes(".railway.internal") ? undefined : { rejectUnauthorized: false },
    max: 8,
  });
  globalStore.__ppStore = pgStore(pool);
  return globalStore.__ppStore;
}

export async function markEquity(pilot: Pilot, pos: PositionRow | null, price: number | null) {
  const eq = equity(pilot.cash, pos, price);
  if (eq > pilot.peakEquity) pilot.peakEquity = eq;
  const dd = pilot.peakEquity > 0 ? (pilot.peakEquity - eq) / pilot.peakEquity : 0;
  if (dd > pilot.maxDrawdown) pilot.maxDrawdown = dd;
  await getStore().savePilot(pilot);
  return eq;
}

export function currentSeason() {
  return seasonId();
}
