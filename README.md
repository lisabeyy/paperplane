# Paperplane

Fold a paper plane. Other holders board it. Takeoff stamps one live price, and `$PLANE` creator fees pay the flights that land.

This is not a clone of Papertrade or PaperCall. There is no house bot and no follow-or-fade vote. The product is a sky of other people's planes.

## The loop

1. **Fold.** You set market, side, leverage, and take-profit. The plane sits on the ground for 90 seconds. Nothing is filled yet.
2. **Board.** Other wallets climb on before takeoff. After the mint is live, holding 250K `$PLANE` is the ticket to fold and to board.
3. **Takeoff.** The server stamps the live mark for everyone aboard. Same entry, target, and liquidation.
4. **Landing.** Creator fees fill a public pool. Each profitable flight that stayed in the air at least 2 minutes earns a slice proportional to its paper profit × the `$PLANE` weight aboard. A flight's slice goes 30% to the pilot and 70% to the seats by hold, or all to the pilot if nobody boarded. Crashes, scratches, losing closes and sub-2-minute scalps pay nothing.

Paper scores still live on the board. SOL does not follow the rank; the board's last column shows what each wallet has earned from landings (`lib/payout.ts`).

Resets are limited by tier (paper 1, origami 3, jet and up unlimited). The Reset button appears only when equity is under $2,000 with no open plane. A reset hides the pilot's flights and forfeits their pool share; passengers on those flights keep theirs.

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
- Landing-based pool split shown on the board. Payouts are still sent by hand; update `PRESS_SOL_PAID` after each one.
- Tier-limited account resets, offered only when an account is nearly empty.
- Public press for claimed SOL, season pool, and treasury.
- In-page Jupiter buy/sell once `PLANE_MINT` is set.
