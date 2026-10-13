# Paperplane

Fold a paper plane. Other holders board it. Takeoff stamps one live price, and `$PLANE` creator fees pay the flights that land.

This is not a clone of Papertrade or PaperCall. There is no house bot and no follow-or-fade vote. The product is a sky of other people's planes.

## The loop

1. **Fold.** You set market, side, leverage, and take-profit. The plane sits on the ground for 90 seconds. Nothing is filled yet.
2. **Board.** Other wallets climb on before takeoff. After the mint is live, holding 250K `$PLANE` is the ticket to fold and to board.
3. **Takeoff.** The server stamps the live mark for everyone aboard. Same entry, target, and liquidation.
4. **Landing.** Creator fees fill a public pool. A landing splits that flight's slice: 30% to the pilot, 70% to the seats by hold. A crash pays nothing.

Paper scores still live on the board. SOL does not follow the rank.

## Local

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL` the board lives in memory and clears when the server stops.

## Railway

1. Create a project and add a Postgres database.
2. Set `DATABASE_URL` to the Postgres connection string (the plugin variable `${{Postgres.DATABASE_URL}}`).
3. Optional after launch: `PLANE_MINT`, `PRESS_WALLET`, `PRIZE_POOL_SOL`, `PRESS_SOL_COLLECTED`, `PRESS_SOL_PAID`.
4. Deploy. The app listens on `PORT` and checks `/api/health`.

```bash
railway login
railway init
railway add --database postgres
railway up
```

## What is live

- Phantom, Solflare, and Backpack sign-in. The signature does not send a transaction.
- Fold → 90s boarding window → takeoff at the live mark.
- Sky list with a Board button for planes still on the ground.
- Scratch a fold before takeoff and get the paper margin back.
- Open league, HYPE league, and a crash reel for paper scores.
- Public press for claimed SOL, season pool, and treasury.
- In-page Jupiter buy/sell once `PLANE_MINT` is set.
