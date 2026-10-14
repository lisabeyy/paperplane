import { formatFiat, formatPercent, formatPrice, formatRatio, formatSol } from "@/lib/format";
import { MARKETS, MIN_TRADES_TO_PLACE, STARTING_CASH, type MarketId } from "@/lib/markets";
import { startLive } from "@/lib/ui/live";

type Side = "long" | "short";
type Flight = {
  id: string;
  market: MarketId;
  side: Side;
  leverage: number;
  pnl: number;
  reason: "land" | "liq" | "tp";
};
type Pos = {
  market: MarketId;
  side: Side;
  margin: number;
  leverage: number;
  entry: number;
  liq: number;
  tp: number;
  phase?: "boarding" | "air";
  takeoffAt?: number;
};
type SkyPlane = {
  id: string;
  wallet: string;
  callsign: string;
  market: MarketId;
  side: Side;
  leverage: number;
  phase: "boarding" | "air";
  takeoffAt: number;
  entry: number;
  margin: number;
  liq: number;
  tp: number;
  boarders: { wallet: string; callsign: string }[];
};
type Me = {
  wallet: string;
  callsign: string;
  cash: number;
  trades: number;
  resetsUsed: number;
  position: Pos | null;
  flights: Flight[];
  tier: { tier: string; name: string; balance: number | null; resets: number | null };
};
type Row = {
  wallet: string;
  callsign: string;
  roi: number;
  equity: number;
  trades: number;
  mostly: string;
  eligible: boolean;
  prize: number;
  crashPnl: number | null;
};
type Board = {
  endsAt: string;
  poolSol: number;
  pilots: number;
  flying: number;
  league: string;
  rows: Row[];
  you: Row | null;
  youRank: number | null;
};

const MARKUP = `
<header class="nav"><div class="wrap nav-in">
 <a href="#home" class="logo" data-go="home" aria-label="Paperplane home"><img src="/mark.png" alt="">paperplane</a>
 <nav class="links" aria-label="Main"><a href="#trade" data-go="trade">trade</a><span>·</span><a href="#league" data-go="league">league</a><span>·</span><a href="#plane" data-go="plane">$plane</a><span>·</span><a href="#docs" data-go="docs">docs</a></nav>
 <div class="sp"></div>
 <button type="button" class="btn btn-or btn-sm nav-cta" id="navConnect">Connect wallet</button>
 <button type="button" class="burger" id="burger" aria-label="Open menu" aria-expanded="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></button>
</div></header>
<div class="tape"><div class="wrap"><p id="tapeText">the sky · planes on the ground · reading the season…</p></div></div>
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
 <div style="display:flex;justify-content:space-between;align-items:center"><span class="logo"><img src="/mark.png" alt="">paperplane</span><button type="button" class="burger" style="display:flex" id="menuClose" aria-label="Close menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
 <nav style="margin-top:26px" aria-label="Mobile"><a class="ml" href="#home" data-go="home">home</a><a class="ml" href="#trade" data-go="trade">trade</a><a class="ml" href="#league" data-go="league">league</a><a class="ml" href="#plane" data-go="plane">$plane</a><a class="ml" href="#docs" data-go="docs">docs</a></nav>
 <button type="button" class="btn btn-or" id="menuConnect" style="margin-top:22px">Connect wallet</button>
</div>
<main>
<div class="route" id="r-home">
 <div class="film" id="film">
  <div class="frame">
   <div class="frame-top">
    <div class="chapters" id="chap"><span class="on">fold</span><span>fly</span><span>crash</span><span>rank</span></div>
    <div class="prog"><b class="num" id="pct">0%</b>scroll ↓</div>
   </div>
   <div class="stage3" id="stage">
    <div class="sheet-shadow" id="shd"></div>
    <div class="sheet3" id="sheet">
     <div class="half l"><div class="face front">
      <div class="t">Paper account · founding season</div>
      <div class="big num">$10,000</div>
      <div class="t" style="margin-top:6px">virtual balance · live prices</div>
      <div style="margin-top:clamp(10px,2vw,22px)"><span class="hnote">free to fly →</span></div>
     </div></div>
     <div class="half r" id="halfR"><div class="face front">
      <div class="t">Markets</div>
      <div style="font-family:var(--display);font-weight:800;font-size:clamp(18px,2.6vw,28px);letter-spacing:-.03em;line-height:1.15;margin-top:8px;color:#16130F">HYPE · SOL<br>ETH · BTC</div>
      <div class="t" style="margin-top:8px">filled at the live mark</div>
      <svg viewBox="0 0 200 50" style="width:100%;margin-top:clamp(6px,1.4vw,14px)" aria-hidden="true"><path d="M2 40 L30 34 L52 38 L78 22 L100 26 L126 12 L150 18 L176 6 L198 10" fill="none" stroke="#FF6A2B" stroke-width="3"/></svg>
     </div><div class="face back"></div></div>
    </div>
    <svg class="trail" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><path id="trailPath" d="M -20 470 C 160 450 220 360 340 380 S 520 250 620 280 S 820 140 1020 120" fill="none" stroke="#FF6A2B" stroke-width="3" stroke-linecap="round" style="opacity:0"/></svg>
    <div class="plane3" id="plane" style="opacity:0"><div class="keel" id="keel"></div><div class="wing b" id="wb"></div><div class="wing a" id="wa"></div></div>
    <div class="ball3" id="ball" style="opacity:0"><svg viewBox="0 0 200 200" aria-hidden="true">
     <path d="M100 14 L132 22 L162 46 L182 84 L178 126 L156 162 L120 184 L80 182 L44 160 L22 122 L20 82 L42 42 L70 22 Z" fill="#E7DECD"/>
     <path d="M112 64 L162 46 L182 84 Z" fill="#FFF8EA" opacity=".7"/><path d="M96 110 L44 160 L22 122 Z" fill="#B9AE98" opacity=".6"/><path d="M96 110 L178 126 L156 162 L120 184 Z" fill="#C9BEA8" opacity=".55"/>
     <path d="M100 14 L112 64 L162 46 M112 64 L182 84 M112 64 L96 110 L178 126 M96 110 L120 184 M96 110 L44 160 M96 110 L22 122 M96 110 L48 76 L20 82 M48 76 L42 42 M48 76 L70 22 M112 64 L70 22" stroke="#B5AA94" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
    </svg></div>
    <div class="board3" id="board3" style="opacity:0">
     <div class="pn p1" id="p1"><div class="hd"><b>Founding season · top pilots</b><span class="mono" style="font-size:12px;color:#6B6252">return · prize</span></div></div>
     <div class="pn p2" id="p2"><div id="b3rows"></div></div>
     <div class="pn p3" id="p3"><div class="hd"><span class="mono" style="font-size:12.5px;color:#6B6252">Prize pool · creator fees</span><b class="num" id="filmPool" style="color:var(--orange-d)">—</b></div></div>
    </div>
   </div>
   <div class="frame-bot">
    <h1 class="disp cap-h" id="caps"><span class="on">fold a plane.</span><span>others climb on.</span><span>one price at takeoff.</span><span>a crash stays on the reel.</span></h1>
    <a href="#after" class="skip" id="skip">skip film ↓</a>
   </div>
  </div>
 </div>
 <section class="s" id="homeLive"><div class="wrap">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
   <div><span class="lbl"><i class="livedot"></i>live sky</span><h2 class="disp d-l" style="margin-top:14px">board a plane in one tap.</h2></div>
   <a href="#trade" data-go="trade" class="btn btn-or">Fold your own</a>
  </div>
  <div class="mkts home-ticks" id="homeTicks" role="group" aria-label="Live markets"></div>
  <div class="box" style="padding:4px 18px;margin-top:14px" id="homeSky"></div>
 </div></section>
 <section class="s" id="after"><div class="wrap">
  <span class="lbl">what paperplane is</span>
  <h2 class="disp d-l" style="margin-top:14px;max-width:16ch">your plane. their ticket on.</h2>
  <div class="trio">
   <div class="card"><span class="lbl">fold</span><svg class="cut" viewBox="0 0 56 56" aria-hidden="true"><rect x="6" y="10" width="44" height="36" rx="3" fill="#FF6A2B"/><path d="M6 22 H50" stroke="#EFE7D8" stroke-width="3"/></svg><h3>You set the flight</h3><p>Pick the market, the side, and the leverage. The plane sits on the ground for 90 seconds. Nothing is filled yet.</p></div>
   <div class="card"><span class="lbl">board</span><svg class="cut" viewBox="0 0 56 56" aria-hidden="true"><path d="M4 44 L18 30 L28 36 L50 12" stroke="#FF6A2B" stroke-width="6" fill="none" stroke-linejoin="round"/></svg><h3>Others climb on</h3><p>Any wallet can board before takeoff. After the coin is live, holding 250K $PLANE is the ticket to fold and to board.</p></div>
   <div class="card"><span class="lbl">takeoff</span><svg class="cut" viewBox="0 0 56 56" aria-hidden="true"><path d="M28 4 L35 20 L52 21 L39 32 L43 50 L28 40 L13 50 L17 32 L4 21 L21 20 Z" fill="#FF6A2B"/></svg><h3>One price for the plane</h3><p>Takeoff stamps the live mark for everyone aboard. A landing splits the fee pool. A crash stays on the reel and pays nothing.</p></div>
  </div>
 </div></section>
 <section class="s" style="background:var(--ink-2)"><div class="wrap split">
  <div>
   <span class="lbl">founding season · ends in <span class="num" id="homeEnds">—</span></span>
   <div class="pool num" id="homePool" style="margin-top:16px">—</div>
   <p class="lede" id="homePoolNote" style="margin-top:14px">$PLANE creator fees fill this pool. It pays flights that land. The sky is open before the coin is.</p>
   <div class="row" style="margin-top:24px"><a href="#trade" data-go="trade" class="btn btn-or">Fold a plane</a><a href="#league" data-go="league" class="btn btn-line">See the sky</a></div>
  </div>
  <div class="box mini" style="padding:22px;background:var(--ink)" id="miniBoard"></div>
 </div></section>
 <section class="s"><div class="wrap split">
  <div>
   <span class="lbl">why hold $plane</span>
   <h2 class="disp d-l" style="margin-top:14px">the ticket is the hold.</h2>
   <p class="lede" style="margin-top:16px">Trading $PLANE prints the SOL. Holding it is how you fold a plane and how you climb onto someone else's before it leaves the ground.</p>
   <ul class="list">
    <li><b>You fold it</b><p>The flight is yours: market, side, leverage. It waits 90 seconds.</p></li>
    <li><b>They board it</b><p>Other holders take a seat. Their hold is their weight on the split.</p></li>
    <li><b>Takeoff pays or crashes</b><p>One live price. A landing splits that flight's share of the pool, 30% to the pilot and 70% to the seats. A crash pays nobody.</p></li>
   </ul>
   <div class="row" style="margin-top:22px"><a href="#plane" data-go="plane" class="btn btn-or">Open the press</a><a href="#trade" data-go="trade" class="btn btn-line">Fold a plane</a></div>
  </div>
  <div style="display:grid;place-items:center"><svg viewBox="0 0 420 320" style="width:100%;max-width:460px" aria-hidden="true">
   <g transform="rotate(-6 130 115)"><rect x="20" y="40" width="220" height="150" rx="4" fill="#EFE7D8"/>
   <text x="44" y="92" font-family="Geist Mono, monospace" font-size="12" fill="#6B6252">PAPER · SOL LONG 10x</text>
   <text x="44" y="138" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="38" fill="#16130F">+$1,240</text></g>
   <path d="M230 170 C 290 150 300 220 350 196" stroke="#FF6A2B" stroke-width="3" stroke-dasharray="6 8" fill="none"/>
   <path d="M330 150 L410 190 L346 200 L340 230 Z" fill="#EFE7D8"/><path d="M346 200 L410 190 L340 230 Z" fill="#CFC4AE"/>
   <text x="236" y="292" font-family="Caveat, cursive" font-weight="700" font-size="30" fill="#FF6A2B" transform="rotate(-4 300 280)">post the slip →</text>
  </svg></div>
 </div></section>
</div>
<div class="route" id="r-trade">
 <div class="wrap" style="padding-top:26px;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><h1 class="disp d-m">fold a plane</h1><span class="lbl">90 seconds on the ground · one fill</span></div>
 <div class="wrap tr">
  <div class="box" style="overflow:hidden;min-width:0">
   <div class="acct num">
    <div><small>Equity</small><b id="eq">$10,000.00</b></div>
    <div><small>Open P&amp;L</small><b id="opnl" class="num">—</b></div>
    <div><small>Season return</small><b id="roi" class="num">0.00%</b></div>
    <div><small>League rank</small><b id="rk">unranked</b></div>
   </div>
   <div class="mkts" id="mkts" role="group" aria-label="Market"></div>
   <div class="stage"><canvas id="chart" aria-label="Price chart"></canvas>
    <div class="hud"><small><i class="livedot" id="liveDot"></i><span id="hudMk">SOL-PERP</span></small><span class="px num" id="hudPx">—</span><small id="hudPnl">No plane in the air</small></div>
    <div class="tf" id="tf" role="group" aria-label="Chart window"><button type="button" data-tf="live" aria-pressed="true">Live</button><button type="button" data-tf="3h" aria-pressed="false">3h</button></div>
    <div class="toast" id="toast" hidden></div></div>
   <div class="legend"><span><i style="background:var(--paper)"></i>Entry</span><span><i style="background:var(--orange)"></i>Take-profit</span><span><i style="background:var(--down)"></i>Liquidation</span></div>
  </div>
  <div style="display:flex;flex-direction:column;gap:18px;min-width:0">
   <div class="box pos" id="tradeBoarding" hidden><h3 style="font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px"><i class="livedot"></i>Boarding now</h3><div id="skyNow"></div></div>
   <form class="box ticket" id="ticket" novalidate>
    <div class="seg" role="group" aria-label="Side"><button type="button" class="lg" id="bLong" aria-pressed="true">Long</button><button type="button" class="sh" id="bShort" aria-pressed="false">Short</button></div>
    <div class="field"><label for="amt">Margin <span class="num" id="avail">Available $10,000.00</span></label><div class="inp"><input id="amt" inputmode="decimal" value="500" autocomplete="off"><span>paper USD</span></div></div>
    <div class="field"><span class="lab"><span>Leverage</span><b class="mono num" id="levOut">10x</b></span><input type="range" id="lev" min="1.1" max="250" step="0.1" value="10" aria-label="Leverage"></div>
    <div class="field"><label for="tp">Take-profit <span>% move</span></label><div class="inp"><input id="tp" inputmode="decimal" value="2"><span>%</span></div></div>
    <div class="kv num"><span>Size</span><b id="kSize">—</b><span>Liquidation</span><b id="kLiq">—</b><span>Fee, on open</span><b id="kFee">—</b></div>
    <div class="livepos" id="livePos" hidden><div class="lp-head"><small>Open P&amp;L</small><b class="num" id="lpPnl">—</b></div><div class="kv num"><span>Entry</span><b id="lpEntry">—</b><span>Mark</span><b id="lpMark">—</b><span>Take-profit</span><b id="lpTp">—</b><span>Liquidation</span><b id="lpLiq">—</b></div></div>
    <button type="submit" class="btn btn-or" id="launch">Fold a plane</button>
    <p class="note" id="formErr" role="status"></p>
    <p class="note" id="liveNote">The fold sits for 90 seconds. Other wallets can board. Takeoff uses the live mark, not the price when you folded.</p>
   </form>
   <div class="box pos"><h3 style="font-size:15px;font-weight:600">Flight log</h3><div id="log"><div class="prow" style="grid-template-columns:1fr"><span style="color:var(--paper-3)">No flights yet. Connect a wallet and fold one.</span></div></div></div>
  </div>
 </div>
 <div class="wrap" style="padding-bottom:56px">
  <span class="lbl">the sky</span>
  <h2 class="disp d-m" style="margin:10px 0 8px">planes you can board.</h2>
  <p class="lede">On the ground means the door is open. In the air means the price is already stamped.</p>
  <div id="sky"></div>
 </div>
</div>
<div class="route" id="r-league">
 <section class="s" style="padding-top:clamp(40px,6vw,72px)"><div class="wrap">
  <span class="lbl">founding season · live board</span>
  <h1 class="disp d-l" style="margin-top:14px">the sky.</h1>
  <p class="lede" style="margin-top:14px">Paper scores stay on this board. SOL does not follow the rank. It follows flights that land, split between the pilot who folded and the wallets that boarded.</p>
  <div class="stats3">
   <div class="stat"><small>Prize pool</small><b class="num" id="lgPool">—</b><p id="lgPoolNote">From $PLANE creator fees.</p></div>
   <div class="stat"><small>Pilots</small><b class="num" id="lgPilots">—</b><p>Wallets with a paper account this season.</p></div>
   <div class="stat"><small>Season closes</small><b class="num" id="lgEnds">—</b><p>Monday 00:00 UTC starts the next sheet.</p></div>
  </div>
  <div class="tabs" role="group" aria-label="League" id="tabs"><button type="button" aria-pressed="true" data-lg="open">Open league</button><button type="button" aria-pressed="false" data-lg="hype">HYPE league</button><button type="button" aria-pressed="false" data-lg="crash">Crash reel</button></div>
  <div class="board" id="board"></div>
  <p class="note" style="margin-top:12px">Equity is the paper account's value right now: cash, plus the margin in an open plane, plus that plane's unrealized P&amp;L at the live mark. Everyone starts at $10,000. Return is equity against that start.</p>
  <h2 class="disp d-m" style="margin-top:56px">how a landing is split</h2>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Place</th><th>Share of pool</th><th>Paid in SOL</th></tr></thead><tbody id="splitBody"></tbody></table></div>
 </div></section>
</div>
<div class="route" id="r-plane">
 <section class="s" style="padding-top:clamp(40px,6vw,72px)"><div class="wrap split">
  <div>
   <span class="lbl">$plane · the press</span>
   <h1 class="disp d-xl" style="margin-top:14px">hold to<br>climb on.</h1>
   <p class="lede" style="margin-top:16px">Every buy and sell of $PLANE pays a creator fee in SOL. 80% of what is claimed pays the flights that land. Holding $PLANE is the ticket to fold a plane and to board one.</p>
   <div class="row" style="margin-top:22px"><button type="button" class="btn btn-or" id="toBuy">Trade $PLANE</button><a href="#docs" data-go="docs" class="btn btn-line">Read the rules</a></div>
   <p class="note" id="mintLine">Mint address publishes with the pump.fun launch. Until then every wallet flies as paper tier.</p>
   <p class="note" id="yourTier">Your tier: paper</p>
  </div>
  <div style="display:grid;place-items:center"><div class="tok3d" aria-hidden="true"><div class="disc"></div><div class="ring"></div><img src="/token.png" alt=""></div></div>
 </div></section>
 <section class="s" style="background:var(--ink-2)" id="buy"><div class="wrap">
  <span class="lbl">public accounting</span>
  <h2 class="disp d-l" style="margin-top:14px">the press.</h2>
  <p class="lede" style="margin-top:14px">Treasury balance is read from the creator wallet. The season pool is the SOL assigned from claimed fees. Pilots and flights are read from the league. Empty numbers stay empty until the coin trades.</p>
  <div class="press-grid" id="pressGrid"></div>
  <div class="split" style="margin-top:36px;align-items:start">
   <form class="box ticket" id="buyForm">
    <div class="seg" role="group" aria-label="Trade $PLANE"><button type="button" class="lg" id="buySide" aria-pressed="true">Buy</button><button type="button" class="sh" id="sellSide" aria-pressed="false">Sell</button></div>
    <div class="field"><label for="buyAmt">You pay</label><div class="inp"><input id="buyAmt" inputmode="decimal" value="0.1" autocomplete="off"><span id="buyUnit">SOL</span></div></div>
    <div class="kv num"><span>You receive</span><b id="buyOut">—</b><span>Price impact</span><b id="buyImpact">—</b></div>
    <button type="submit" class="btn btn-or" id="buyGo" disabled>Trading opens at launch</button>
    <p class="note" id="buyErr" role="status"></p>
    <p class="note">Your wallet signs the Jupiter swap. Paperplane never holds the tokens.</p>
    <a class="note" id="buyLink" href="https://pump.fun" target="_blank" rel="noreferrer">Open on pump.fun ↗</a>
   </form>
   <ol class="steps">
    <li class="step"><span class="n">01</span><h3>A trade pays the fee</h3><p>Every buy and sell of $PLANE on pump.fun sends a creator fee, in SOL, to the coin's creator vault.</p></li>
    <li class="step"><span class="n">02</span><h3>The SOL is claimed</h3><p>Fees are claimed from the bonding curve and, after graduation, from the PumpSwap vault, into a public wallet.</p></li>
    <li class="step"><span class="n">03</span><h3>80% joins the season</h3><p>That share is the prize pool. The other 20% runs the servers and the price feed. Both numbers are on this page.</p></li>
    <li class="step"><span class="n">04</span><h3>Landings are paid</h3><p>A flight that lands takes a slice of the pool by the weight aboard. 30% goes to the pilot, 70% to the seats. A crash pays nothing.</p></li>
   </ol>
  </div>
  <p class="note" id="pressWallet" style="margin-top:22px"></p>
 </div></section>
 <section class="s"><div class="wrap">
  <h2 class="disp d-l">pilot tiers</h2>
  <p class="lede" style="margin-top:14px">Until the mint is live, every wallet can fold and board. After launch, 250K $PLANE is the ticket.</p>
  <div class="tiers">
   <div class="tier" data-tier="paper"><span class="nm">paper</span><small>Hold 0</small><ul><li>Watch the sky</li><li>Founding flights, before launch</li><li>1 account reset per season</li></ul></div>
   <div class="tier" data-tier="origami"><span class="nm">origami</span><small>Hold 250K $PLANE</small><ul><li>Fold a plane</li><li>Board someone else's</li><li>3 resets per season</li></ul></div>
   <div class="tier" data-tier="jet"><span class="nm">jet</span><small>Hold 2M $PLANE</small><ul><li>Everything in origami</li><li>Heavier seat on the split</li><li>Unlimited resets</li></ul></div>
   <div class="tier top" data-tier="concorde"><span class="nm">concorde</span><small>Hold 10M $PLANE</small><ul><li>Everything in jet</li><li>Heaviest seat on a plane</li><li>Orange wings on the board</li></ul></div>
  </div>
 </div></section>
 <section class="s"><div class="wrap">
  <h2 class="disp d-l">where the prizes come from</h2>
  <p class="lede" style="margin-top:14px">pump.fun pays creator fees on every $PLANE trade. Paperplane routes them to the season prize pool, in public, in SOL.</p>
  <div class="flow-wrap"><svg viewBox="0 0 980 260" role="img" aria-label="$PLANE trades produce creator fees. 80 percent pays landed flights. 20 percent goes to operations.">
   <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#EFE7D8"/></marker></defs>
   <rect x="10" y="90" width="210" height="80" rx="4" fill="#EFE7D8"/><text x="115" y="126" text-anchor="middle" font-family="Geist, sans-serif" font-weight="600" font-size="17" fill="#16130F">$PLANE trades</text><text x="115" y="150" text-anchor="middle" font-family="Geist Mono, monospace" font-size="12.5" fill="#6B6252">on pump.fun</text>
   <path d="M220 130 H300" stroke="#EFE7D8" stroke-width="2.5" marker-end="url(#ar)"/>
   <rect x="310" y="90" width="210" height="80" rx="4" fill="#2A241D" stroke="rgba(239,231,216,.24)"/><text x="415" y="126" text-anchor="middle" font-family="Geist, sans-serif" font-weight="600" font-size="17" fill="#EFE7D8">Creator fees</text><text x="415" y="150" text-anchor="middle" font-family="Geist Mono, monospace" font-size="12.5" fill="#8F8676">paid in SOL</text>
   <path d="M520 130 C 580 130 580 60 640 60" stroke="#FF6A2B" stroke-width="2.5" fill="none" marker-end="url(#ar)"/>
   <path d="M520 130 C 580 130 580 200 640 200" stroke="#8F8676" stroke-width="2.5" fill="none" marker-end="url(#ar)"/>
   <rect x="650" y="25" width="320" height="70" rx="4" fill="#2A241D" stroke="#FF6A2B"/><text x="670" y="55" font-family="Geist, sans-serif" font-weight="600" font-size="16" fill="#EFE7D8">80% · Landed flights</text><text x="670" y="77" font-family="Geist Mono, monospace" font-size="12.5" fill="#8F8676">pilot 30% · seats 70%</text>
   <rect x="650" y="165" width="320" height="70" rx="4" fill="#2A241D" stroke="#8F8676"/><text x="670" y="195" font-family="Geist, sans-serif" font-weight="600" font-size="16" fill="#EFE7D8">20% · Operations</text><text x="670" y="217" font-family="Geist Mono, monospace" font-size="12.5" fill="#8F8676">servers, price feeds, public wallet</text>
  </svg></div>
  <h2 class="disp d-m" style="margin-top:64px">specification</h2>
  <div class="spec">
   <div><span>Network</span><b>Solana, SPL token</b></div><div><span>Launch</span><b>pump.fun, paired with SOL</b></div>
   <div><span>Supply</span><b class="num">1,000,000,000</b></div><div><span>Mint authority</span><b>Revoked at launch</b></div>
   <div><span>Team allocation</span><b>None at launch</b></div><div><span>Prices</span><b>Live market marks</b></div>
   <div><span>Featured market</span><b>HYPE-PERP</b></div><div><span>Prizes</span><b>Weekly, in SOL</b></div>
  </div>
 </div></section>
</div>
<div class="route" id="r-docs">
 <div class="wrap docs">
  <nav class="toc" id="toc" aria-label="Docs"></nav>
  <article class="doc" id="doc">
   <h2 id="d-what">What Paperplane is</h2>
   <p>Paperplane is a sky of other people's planes on Solana. You fold a paper perp on a live mark. Holders who want the same trade climb on before it leaves the ground. Takeoff stamps <strong>one</strong> price for everyone aboard. Creator fees from trading <strong>$PLANE</strong> pay the flights that land. A crash stays on the reel and pays nothing.</p>
   <p>It is not a Papertrade clone and not a house-bot vote game. There is no single account you follow or fade. The product is many pilots, many planes, and a coin that is the ticket onto them.</p>
   <h2 id="d-loop">The loop</h2>
   <ol>
    <li><strong>Trade $PLANE.</strong> Every buy and sell on pump.fun pays a creator fee in SOL.</li>
    <li><strong>Hold the ticket.</strong> After launch, 250K $PLANE lets you fold a plane or board someone else's.</li>
    <li><strong>Fold.</strong> You pick market, side, leverage, and take-profit. The plane sits on the ground for 90 seconds.</li>
    <li><strong>Board.</strong> Other ticket holders climb on. Their hold is their weight when the flight is paid.</li>
    <li><strong>Takeoff.</strong> The server fills at the live mark. Same entry, target, and liquidation for the whole plane.</li>
    <li><strong>Land or crash.</strong> A landing takes a slice of the season pool. A crash, a scratch, or a losing close pays nobody.</li>
   </ol>
   <h2 id="d-fly">How a flight works</h2>
   <h3>Sign in</h3>
   <p>Connect Phantom, Solflare, or Backpack and sign a message. That opens a paper account. The signature does not send SOL or tokens. One wallet, one paper account per season.</p>
   <h3>Fold</h3>
   <ul>
    <li>Markets: HYPE, SOL, ETH, BTC. Side: long or short.</li>
    <li>Margin comes from your $10,000 paper account. Min margin $10. A 6 bps fee is charged on notional at open.</li>
    <li>Leverage caps: 50x on HYPE, 250x on SOL, ETH and BTC.</li>
    <li>Take-profit is a 0.2% to 25% move from entry. Liquidation sits at entry × (1 ∓ 0.92 / leverage).</li>
    <li>You can have one plane of your own on the sheet at a time. You cannot fold while you are already aboard someone else's boarding plane.</li>
   </ul>
   <h3>Boarding window</h3>
   <ul>
    <li>After you fold, the plane waits <strong>90 seconds</strong> on the ground. Nothing is filled yet.</li>
    <li>Any eligible wallet can board. Max 24 seats. The pilot is already on the plane and does not count as a seat.</li>
    <li>You can scratch the fold before takeoff. Paper margin and the open fee return to your account. Boarders are cleared.</li>
    <li>Once takeoff starts, the door is shut. Boarding after the timer is rejected.</li>
   </ul>
   <h3>Takeoff and close</h3>
   <ul>
    <li>At takeoff the server stamps the live mark. Everyone aboard shares that entry, TP, and liquidation.</li>
    <li>The flight closes at the take-profit, at liquidation, or when the pilot lands it by hand.</li>
    <li>A liquidation loses the pilot's paper margin. Boarders do not deposit margin; they lose the prize claim on that flight, not cash from their wallet.</li>
    <li>Paper equity never goes below zero.</li>
   </ul>
   <h2 id="d-ticket">The $PLANE ticket</h2>
   <p>Until the mint is published, every wallet can fold and board so people can try the sky. The season pool stays at zero. After <strong>PLANE_MINT</strong> is set:</p>
   <ul>
    <li>Folding and boarding require at least <strong>250K $PLANE</strong> in the connected wallet.</li>
    <li>Your hold is your weight on a boarded plane. Heavier holds take a larger share of the seats' 70%.</li>
    <li>Tiers: paper (0), origami (250K), jet (2M), concorde (10M). Higher tiers unlock more account resets and a heavier seat.</li>
    <li>In-page buy and sell routes through Jupiter. Your wallet signs the swap. Paperplane never holds the tokens.</li>
   </ul>
   <h2 id="d-prizes">Fees, press, and payouts</h2>
   <h3>Where the SOL comes from</h3>
   <p>pump.fun pays creator fees on every $PLANE trade, in SOL. Fees accrue in the creator vault on the bonding curve, and in the PumpSwap vault after graduation. Claiming those fees into a public wallet is what fills the press.</p>
   <h3>The split</h3>
   <ul>
    <li><strong>80%</strong> of claimed fees join the season prize pool.</li>
    <li><strong>20%</strong> runs servers, price feeds, and the public wallet.</li>
    <li>The pool is split across flights that <strong>land</strong> in that season, by the weight aboard.</li>
    <li>On a plane with passengers: pilot <strong>30%</strong>, seats <strong>70%</strong> split by hold.</li>
    <li>A pilot who flew alone keeps that flight's whole slice.</li>
    <li>Crash, scratch, and losing closes pay <strong>0 SOL</strong>.</li>
   </ul>
   <h3>What the press shows</h3>
   <p>Claimed SOL, season pool, paid out, treasury balance, pilots, and flights. Empty cells stay empty on purpose until the coin trades and fees are claimed. The paper board is a scoreboard only. It does not move SOL.</p>
   <p class="note">Today the pool numbers are published as they are assigned. Automatic on-chain payouts from each landing are on the roadmap below.</p>
   <h2 id="d-season">Seasons and the paper board</h2>
   <ul>
    <li>A season runs Monday 00:00 UTC to Sunday night. Paper accounts start over at $10,000.</li>
    <li>Rank is season return: equity ÷ $10,000 − 1. Open planes are marked to the live price.</li>
    <li>Ties go to the pilot with the smaller peak-to-trough drawdown.</li>
    <li>Account resets are limited by tier. A reset clears flights and cash for the season and spends one reset.</li>
   </ul>
   <h2 id="d-leagues">Leagues</h2>
   <ul>
    <li><strong>Open league</strong> — paper return on the whole account.</li>
    <li><strong>HYPE league</strong> — paper PnL on HYPE-PERP only.</li>
    <li><strong>Crash reel</strong> — worst single closed flight. The clip people post. It is not paid.</li>
   </ul>
   <p>None of those ranks are paid in SOL. SOL follows landings from the fee pool.</p>
   <h2 id="d-fair">Keeping it fair</h2>
   <ul>
    <li>One paper account per wallet. The server stores the fill. The browser does not name the price.</li>
    <li>Takeoff uses the mark when the timer ends, not when you clicked fold.</li>
    <li>You cannot board your own plane, double-board, or board while you already have a plane on the sheet.</li>
    <li>Resets are limited by hold, so a lucky reroll is something the coin unlocks.</li>
    <li>Prices come from live market marks (Binance, with Coinbase / Hyperliquid fallbacks). They are not a Jupiter oracle claim.</li>
   </ul>
   <h2 id="d-build">Where it lives</h2>
   <p>Ranks, open planes, boarders, flights, and sessions are stored in Postgres on Railway. The press reads the treasury wallet and the league. Without <strong>DATABASE_URL</strong> the same API runs in memory for local play only.</p>
   <h2 id="d-roadmap">Roadmap</h2>
   <p>Shipped today: fold, 90s board, takeoff, scratch, sky list, paper leagues, crash reel, press receipts, Jupiter buy/sell when the mint is set, ticket gate at 250K.</p>
   <h3>Next</h3>
   <ul>
    <li><strong>Live pump vault reads.</strong> Show unclaimed creator fees from the bonding-curve and PumpSwap vaults so the press does not depend on a hand-typed collected number.</li>
    <li><strong>Landing payouts.</strong> After a flight lands, compute each seat's SOL share and post the receipt. Start with published splits; then auto-send from the treasury.</li>
    <li><strong>Boarding alerts.</strong> Notify when a plane you care about is on the ground, and when your fold is about to take off.</li>
    <li><strong>Richer slips.</strong> Share cards that show pilot, seats, weight, and whether the flight paid.</li>
   </ul>
   <h3>Later</h3>
   <ul>
    <li><strong>Claimable prizes.</strong> Wallets pull their share instead of a push from ops.</li>
    <li><strong>Season vault.</strong> Fee claims route into a dedicated press wallet with a public history of every claim and every payout.</li>
    <li><strong>More markets.</strong> Extra perps once the sky is busy, still one plane per pilot.</li>
    <li><strong>Live send.</strong> Optional path from a paper winner into a real Jupiter Perps order. Paper remains the game; live is the next fold.</li>
    <li><strong>Custom boarding windows.</strong> Pilots pick a longer door for bigger planes, within a cap.</li>
   </ul>
   <p class="note">Paperplane is independent. It is not affiliated with Papertrade, PaperCall, pump.fun, or Hyperliquid. Not financial advice. Paper fills use live marks; nothing in your wallet moves until you buy $PLANE or claim a prize.</p>
  </article>
 </div>
</div>
</main>
<footer><div class="wrap foot"><span class="logo" style="font-size:18px"><img src="/mark.png" alt="">paperplane</span><span>Fold a plane · board it · one price at takeoff</span><div class="sp"></div><a href="#trade" data-go="trade">trade</a><a href="#league" data-go="league">league</a><a href="#plane" data-go="plane">$plane</a><a href="#docs" data-go="docs">docs</a></div></footer>
<div class="bbar" id="bbar" hidden></div>
<div class="snack" id="snack" role="status" hidden></div>
<div class="wmodal" id="wmodal" hidden>
 <div class="wcard" role="dialog" aria-modal="true" aria-labelledby="wtitle">
  <h2 id="wtitle">Connect a wallet</h2>
  <p>Sign a message to open your paper account. This does not send SOL or tokens.</p>
  <div class="wlist" id="wlist"></div>
  <p class="werr" id="werr"></p>
  <button type="button" class="btn btn-line" id="wclose" style="margin-top:8px;color:#16130F;box-shadow:inset 0 0 0 1.5px rgba(22,19,15,.25)">Close</button>
 </div>
</div>`;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function b64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function countdown(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return "—";
  if (ms <= 0) return "closing";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d ? `${d}d` : "", `${h}h`, `${m}m`].filter(Boolean).join(" ");
}

type Provider = {
  name: string;
  provider: {
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    signMessage: (msg: Uint8Array) => Promise<Uint8Array | { signature: Uint8Array }>;
    signTransaction?: (tx: unknown) => Promise<{ serialize: () => Uint8Array }>;
    disconnect?: () => Promise<void>;
  };
};

function detectWallets(): Provider[] {
  const w = window as unknown as {
    phantom?: { solana?: Provider["provider"] & { isPhantom?: boolean } };
    solflare?: Provider["provider"] & { isSolflare?: boolean };
    backpack?: Provider["provider"] & { isBackpack?: boolean };
    solana?: Provider["provider"];
  };
  const list: Provider[] = [];
  const seen = new Set<unknown>();
  const add = (name: string, provider: Provider["provider"] | undefined) => {
    if (!provider || seen.has(provider)) return;
    seen.add(provider);
    list.push({ name, provider });
  };
  if (w.phantom?.solana?.isPhantom) add("Phantom", w.phantom.solana);
  if (w.solflare?.isSolflare) add("Solflare", w.solflare);
  if (w.backpack?.isBackpack) add("Backpack", w.backpack);
  if (w.solana) add("Browser wallet", w.solana);
  return list;
}

export function mount(root: HTMLElement) {
  root.innerHTML = MARKUP;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>("#" + CSS.escape(id))!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cleanups: Array<() => void> = [];
  const on = (target: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  let me: Me | null = null;
  let walletProvider: Provider["provider"] | null = null;
  let tradeSide: "buy" | "sell" = "buy";
  let mintLive = false;
  let board: Board | null = null;
  let spotlight: Board | null = null;
  let cur: MarketId = "SOL";
  let side: Side = "long";
  let league: "open" | "hype" | "crash" = "open";
  let sky: SkyPlane[] = [];
  let busy = false;
  let seenFlight = "";
  let hist: Record<string, number[]> = {};
  let change: Record<string, number> = {};
  /** 24h open, backed out of the server's change % so the live tick can move it. */
  const open24: Record<string, number> = {};
  /** Latest streamed mark per market. */
  const live: Record<string, { p: number; t: number }> = {};
  /** Sampled stream for the Live chart window. */
  const ticks: Record<string, { t: number; p: number }[]> = {};
  const LIVE_WINDOW = 120_000;
  let tf: "live" | "3h" = "live";
  let dispPx = 0;
  let dispMk = "";
  let lastHudPx = 0;
  let pendingBoard = "";
  let skySig = "";
  const pos = () => me?.position ?? null;

  function last(k: string) {
    const l = live[k];
    if (l && Date.now() - l.t < 15_000) return l.p;
    const a = hist[k];
    return a && a.length ? a[a.length - 1]! : 0;
  }
  function liveChange(k: string) {
    const o = open24[k];
    const px = last(k);
    return o && px ? (px / o - 1) * 100 : (change[k] ?? 0);
  }
  /** Return on margin, in percent, for anything with an entry. Same math the server settles on. */
  function roePct(p: { market: MarketId; side: Side; leverage: number; entry: number } | null) {
    if (!p || !(p.entry > 0)) return null;
    const px = last(p.market);
    if (!(px > 0)) return null;
    return p.leverage * (px / p.entry - 1) * (p.side === "long" ? 1 : -1) * 100;
  }
  function livePnl(p = pos()) {
    const r = roePct(p);
    return p && r != null ? (p.margin * r) / 100 : 0;
  }
  /** The plane you hold a seat on, if any. */
  function seat() {
    const you = me?.wallet;
    if (!you) return null;
    return sky.find((p) => p.boarders.some((b) => b.wallet === you)) ?? null;
  }
  /** What the chart and HUD follow: your own plane first, then your seat. */
  function tracked(): (Pos & { pilot?: string }) | null {
    const own = pos();
    if (own) return own;
    const s = seat();
    if (!s) return null;
    return { market: s.market, side: s.side, margin: s.margin, leverage: s.leverage, entry: s.entry, liq: s.liq, tp: s.tp, phase: s.phase, takeoffAt: s.takeoffAt, pilot: s.callsign };
  }
  function signed(n: number) {
    return `<span class="${n >= 0 ? "up" : "down"}">${formatPercent(n, true)}</span>`;
  }
  function equityNow() {
    if (!me) return STARTING_CASH;
    const p = pos();
    return me.cash + (p ? p.margin + livePnl(p) : 0);
  }

  function setConnectLabel() {
    const label = me ? me.callsign : "Connect wallet";
    $("navConnect").textContent = label;
    $("menuConnect").textContent = me ? "Sign out" : "Connect wallet";
  }

  function paintAccount() {
    const eq = equityNow();
    const roi = eq / STARTING_CASH - 1;
    $("eq").textContent = formatFiat(eq);
    const roiEl = $("roi");
    roiEl.textContent = formatPercent(roi * 100, true);
    roiEl.className = "num " + (roi >= 0 ? "up" : "down");
    const t = tracked();
    const r = roePct(t);
    const opnl = $("opnl");
    if (!t) opnl.innerHTML = "—";
    else if (t.phase === "boarding") opnl.innerHTML = `<span style="color:var(--paper-3)">on the ground</span>`;
    else if (r == null) opnl.innerHTML = "—";
    else if (t.pilot) opnl.innerHTML = `${signed(r)} <small style="display:inline;font-size:12px">seat</small>`;
    else opnl.innerHTML = `<span class="${r >= 0 ? "up" : "down"}">${formatFiat(livePnl(t), "detailed", true)} · ${formatPercent(r, true)}</span>`;
    const trades = me?.trades ?? 0;
    const rank = board?.youRank;
    $("rk").textContent = !me ? "connect to rank" : trades < MIN_TRADES_TO_PLACE ? `${MIN_TRADES_TO_PLACE - trades} flights to place` : rank ? `#${rank}` : "unranked";
    $("avail").textContent = "Available " + formatFiat(me?.cash ?? STARTING_CASH);
    setConnectLabel();
    const tier = me?.tier?.tier ?? "paper";
    root.querySelectorAll<HTMLElement>(".tier").forEach((el) => el.classList.toggle("on", el.dataset.tier === tier));
    const bal = me?.tier?.balance;
    const balText =
      bal == null
        ? ""
        : ` · ${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(bal)} $PLANE`;
    $("yourTier").textContent = me ? `Your tier: ${me.tier.name}${balText}` : "Your tier: connect a wallet to read it";
  }

  function upTicket() {
    const a = parseFloat($<HTMLInputElement>("amt").value) || 0;
    const l = parseFloat($<HTMLInputElement>("lev").value) || 1.1;
    const spec = MARKETS[cur];
    $("levOut").textContent = formatRatio(l);
    const px = last(cur);
    $("kSize").textContent = formatFiat(a * l, "detailed") + " notional";
    const liq = side === "long" ? px * (1 - 0.92 / l) : px * (1 + 0.92 / l);
    $("kLiq").textContent = px ? formatPrice(liq) : "—";
    $("kFee").textContent = formatFiat(a * l * spec.fee);
    const max = String(spec.maxLev);
    const lev = $<HTMLInputElement>("lev");
    if (lev.max !== max) lev.max = max;
    if (parseFloat(lev.value) > spec.maxLev) lev.value = max;
    paintAccount();
  }

  function renderMk() {
    const ids = Object.keys(MARKETS) as MarketId[];
    $("mkts").innerHTML = ids
      .map((k) => `<button type="button" class="mk" data-mk="${k}" aria-pressed="${k === cur}"><b>${k}-PERP</b><small class="num"><span data-px="${k}">—</span> · <span data-ch="${k}">—</span></small></button>`)
      .join("");
    $("homeTicks").innerHTML = ids
      .map((k) => `<button type="button" class="mk" data-pick="${k}" aria-label="Fold a ${k} plane"><b>${k}-PERP</b><small class="num"><span data-px="${k}">—</span> · <span data-ch="${k}">—</span></small></button>`)
      .join("");
    updateMk();
  }
  function updateMk() {
    root.querySelectorAll<HTMLElement>("[data-px]").forEach((el) => {
      const px = last(el.dataset.px!);
      el.textContent = px ? formatPrice(px) : "—";
    });
    root.querySelectorAll<HTMLElement>("[data-ch]").forEach((el) => {
      const ch = liveChange(el.dataset.ch!);
      el.textContent = formatPercent(ch, true);
      el.className = ch >= 0 ? "up" : "down";
    });
  }

  function renderLog() {
    const flights = me?.flights ?? [];
    $("log").innerHTML = flights.length
      ? flights
          .map((f) => {
            const up = f.pnl >= 0;
            return `<div class="prow"><span class="pill ${f.side === "long" ? "l" : "s"}">${f.side.toUpperCase()}</span><span>${esc(f.market)} · ${formatRatio(f.leverage)} ${up ? '<span class="up">landed</span>' : '<span class="down">crashed</span>'}</span><span class="mono num ${up ? "up" : "down"}">${formatFiat(f.pnl, "detailed", true)}</span></div>`;
          })
          .join("")
      : `<div class="prow" style="grid-template-columns:1fr"><span style="color:var(--paper-3)">No flights yet. Connect a wallet and fold one.</span></div>`;
    const mine = pos();
    $("launch").textContent = !mine ? "Fold a plane" : mine.phase === "boarding" ? "Scratch the fold" : "Close and land";
  }

  function clock(ms: number) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  type Rel = "yours" | "aboard" | "open" | "shut";
  function relOf(p: SkyPlane, now = Date.now()): Rel {
    const you = me?.wallet;
    if (you != null && p.wallet === you) return "yours";
    if (you != null && p.boarders.some((b) => b.wallet === you)) return "aboard";
    return p.phase === "boarding" && p.takeoffAt > now ? "open" : "shut";
  }
  const onGround = (p: SkyPlane, now = Date.now()) => p.phase === "boarding" && p.takeoffAt > now;

  function skyRow(p: SkyPlane, now: number) {
    const rel = relOf(p, now);
    const seats = p.boarders.length;
    const action =
      rel === "yours"
        ? `<span class="tag">your fold</span>`
        : rel === "aboard"
          ? `<span class="tag" style="color:var(--orange)">you're aboard</span>`
          : rel === "open"
            ? `<button type="button" class="btn btn-or btn-sm" data-board="${esc(p.id)}">Board</button>`
            : `<span class="tag">door shut</span>`;
    return `<div class="prow srow${rel === "yours" || rel === "aboard" ? " mine" : ""}"><span class="pill ${p.side === "long" ? "l" : "s"}">${p.side.toUpperCase()}</span><span style="min-width:0"><b>${esc(p.callsign)}</b><span class="mono sub">${esc(p.market)} ${p.side} ${formatRatio(p.leverage)} · <span data-cd="${esc(p.id)}"></span>${seats ? ` · ${seats} aboard` : ""}</span></span><span class="pct num" data-pnl="${esc(p.id)}"></span>${action}</div>`;
  }

  /** Rebuild sky lists only when the set of planes or your relation to them changes. */
  function paintSky() {
    const now = Date.now();
    const sig = sky.map((p) => `${p.id}:${onGround(p, now) ? 1 : 0}:${p.boarders.length}:${relOf(p, now)}`).join("|") + "#" + (me?.wallet ?? "");
    if (sig !== skySig) {
      skySig = sig;
      $("sky").innerHTML = sky.length
        ? sky.map((p) => skyRow(p, now)).join("")
        : `<div class="empty">The sky is empty. Fold the first plane.</div>`;
      const ground = sky.filter((p) => onGround(p, now));
      const openSeats = ground.filter((p) => relOf(p, now) === "open");
      $("skyNow").innerHTML = openSeats.slice(0, 3).map((p) => skyRow(p, now)).join("");
      $("tradeBoarding").hidden = openSeats.length === 0;
      const homeList = [...ground, ...sky.filter((p) => !onGround(p, now))].slice(0, 6);
      $("homeSky").innerHTML = homeList.length
        ? homeList.map((p) => skyRow(p, now)).join("") +
          (sky.length > homeList.length ? `<div class="prow" style="grid-template-columns:1fr"><a href="#trade" data-go="trade">${sky.length - homeList.length} more in the sky →</a></div>` : "")
        : `<div class="empty">No planes up yet. <a href="#trade" data-go="trade">Fold the first one</a> and others can board it.</div>`;
      const next = openSeats[0];
      $("bbar").innerHTML = next
        ? `<i class="livedot"></i><span class="txt"><b>${openSeats.length === 1 ? "1 plane" : `${openSeats.length} planes`} boarding</b> · ${esc(next.market)} ${next.side} ${formatRatio(next.leverage)} by ${esc(next.callsign)} · <span data-cd="${esc(next.id)}"></span></span><button type="button" class="btn btn-or btn-sm" data-board="${esc(next.id)}">Board</button><a href="#trade" data-go="trade">all</a>`
        : "";
    }
    const route = (location.hash || "#home").slice(1) || "home";
    $("bbar").hidden = !$("bbar").innerHTML || !(route === "home" || route === "league");
    updateSkyLive(now);
  }

  /** Countdowns and live P&L, in place. */
  function updateSkyLive(now = Date.now()) {
    const byId = new Map(sky.map((p) => [p.id, p]));
    root.querySelectorAll<HTMLElement>("[data-cd]").forEach((el) => {
      const p = byId.get(el.dataset.cd!);
      if (!p) return;
      const txt = onGround(p, now) ? `on the ground · ${clock(p.takeoffAt - now)}` : p.phase === "boarding" ? "taking off" : "in the air";
      if (el.textContent !== txt) el.textContent = txt;
    });
    root.querySelectorAll<HTMLElement>("[data-pnl]").forEach((el) => {
      const p = byId.get(el.dataset.pnl!);
      if (!p) return;
      const r = p.phase === "air" ? roePct(p) : null;
      const px = last(p.market);
      el.innerHTML = r != null ? `${signed(r)}<small>P&amp;L</small>` : `<span>${px ? formatPrice(px) : "—"}</span><small>fills at takeoff</small>`;
    });
  }

  function paintBoard() {
    const rows = board?.rows ?? [];
    const crash = board?.league === "crash";
    const head = `<div class="brow h"><span>Rank</span><span>Pilot</span><span>${crash ? "Worst crash" : "Return"}</span><span class="c-x">Trades</span><span class="c-x">Equity</span><span>${crash ? "Reel" : "Prize"}</span></div>`;
    const body = rows.length
      ? rows
          .map((p, i) => {
            const you = me && p.wallet === me.wallet;
            const ret = crash ? formatFiat(p.crashPnl, "detailed", true) : formatPercent(p.roi * 100, true);
            const prize = crash ? "reel" : "paper";
            return `<div class="brow${you ? " you" : ""}"><span class="rank${i < 3 ? " t" : ""}">${i + 1}</span><span class="who"><span class="av" aria-hidden="true"></span><span style="min-width:0"><b>${esc(p.callsign)}</b><span class="mono" style="font-size:12.5px;color:var(--paper-3)">mostly ${esc(p.mostly)}${p.eligible ? "" : " · not eligible yet"}</span></span></span><span class="mono num ${crash || p.roi < 0 ? "down" : "up"}">${ret}</span><span class="c-x mono num">${p.trades}</span><span class="c-x mono num">${formatFiat(p.equity, "compact")}</span><span class="mono num or">${prize}</span></div>`;
          })
          .join("")
      : `<div class="empty">No flights yet. Be the first plane in the air.</div>`;
    const youInList = !!(me && rows.some((r) => r.wallet === me!.wallet));
    const youRow =
      me && !youInList
        ? `<div class="brow you"><span class="rank">${board?.youRank ?? "—"}</span><span class="who"><span class="av" aria-hidden="true" style="background:var(--orange)"></span><span><b>${esc(me.callsign)}</b><span class="mono" style="font-size:12.5px;color:var(--paper-3)">${me.trades < MIN_TRADES_TO_PLACE ? `${MIN_TRADES_TO_PLACE - me.trades} flights to place` : "outside the top 50"}</span></span></span><span class="mono num">${formatPercent((equityNow() / STARTING_CASH - 1) * 100, true)}</span><span class="c-x mono num">${me.trades}</span><span class="c-x mono num">${formatFiat(equityNow(), "compact")}</span><span class="mono num" style="color:var(--paper-3)">—</span></div>`
        : "";
    $("board").innerHTML = head + body + youRow;
    const top = (spotlight?.rows ?? []).slice(0, 3);
    $("b3rows").innerHTML = top.length
      ? top
          .map(
            (p, i) =>
              `<div class="row3"><span class="mono" style="color:#6B6252">${i + 1}</span><b>${esc(p.callsign)}</b><span class="r num">${formatPercent(p.roi * 100, true)}</span><span class="pz num">${p.prize > 0 ? formatSol(p.prize) : "—"}</span></div>`,
          )
          .join("")
      : `<div class="row3"><b>No pilots yet</b></div>`;
    const mini = (spotlight?.rows ?? []).slice(0, 5);
    $("miniBoard").innerHTML =
      `<span class="lbl">paper scores · top 5</span>` +
      (mini.length
        ? mini
            .map(
              (p, i) =>
                `<div class="r"><span class="mono" style="color:var(--paper-3)">${i + 1}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.callsign)}</span><span class="mono num ${p.roi >= 0 ? "up" : "down"}">${formatPercent(p.roi * 100, true)}</span><span class="mono num or">${p.prize > 0 ? formatSol(p.prize) : "—"}</span></div>`,
            )
            .join("")
        : `<div class="empty">The sky is empty. Fold the first trade.</div>`) +
      `<a href="#league" data-go="league" class="btn btn-line btn-sm" style="margin-top:16px">Full league</a>`;
    const season = spotlight || board;
    if (season) {
      $("filmPool").textContent = formatSol(season.poolSol);
      $("homePool").innerHTML = `${formatSol(season.poolSol).replace(" SOL", "")} <span class="or">SOL</span>`;
      $("lgPool").textContent = formatSol(season.poolSol);
      $("lgPilots").textContent = String(season.pilots);
      const ends = countdown(season.endsAt);
      $("homeEnds").textContent = ends;
      $("lgEnds").textContent = ends;
      const note =
        season.poolSol > 0
          ? "This week's pool. It pays flights that land, not the paper rank."
          : "The pool is empty until $PLANE trades. The sky is already open.";
      $("homePoolNote").textContent = note;
      $("lgPoolNote").textContent = season.poolSol > 0 ? "Split across landings this week." : "Waiting on the fair launch.";
      const pool = season.poolSol;
      const share = (n: number) => (pool > 0 ? formatSol(pool * n) : "—");
      $("splitBody").innerHTML = [
        ["Pilot, flew alone", "The whole slice", share(1)],
        ["Pilot, with seats", "30% of that flight", share(0.3)],
        ["Seats", "70%, by hold", share(0.7)],
        ["Crash or scratch", "Nothing", "0 SOL"],
      ]
        .map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td></tr>`)
        .join("");
    }
    paintAccount();
  }

  async function loadBoard() {
    const [res, homeRes] = await Promise.all([
      fetch(`/api/leaderboard?league=${league}`),
      fetch("/api/leaderboard?league=open"),
    ]);
    if (res.ok) board = (await res.json()) as Board;
    if (homeRes.ok) spotlight = (await homeRes.json()) as Board;
    paintBoard();
  }

  async function loadMe() {
    const res = await fetch("/api/me");
    if (res.status === 401) {
      me = null;
      paintAccount();
      renderLog();
      return;
    }
    if (!res.ok) return;
    const next = (await res.json()) as Me;
    const had = pos();
    const newest = next.flights[0];
    if (had && !next.position && newest && newest.id !== seenFlight) {
      seenFlight = newest.id;
      showSlip(newest, next);
    }
    me = next;
    if (newest) seenFlight = newest.id;
    renderLog();
    paintAccount();
    upTicket();
  }

  function showSlip(flight: Flight, who: Me) {
    const up = flight.pnl >= 0;
    const toast = $("toast");
    toast.innerHTML = `<b>${up ? "landed." : "crashed."}</b><p>${formatFiat(flight.pnl, "detailed", true)} paper on ${esc(flight.market)} ${formatRatio(flight.leverage)}.<span id="slipRank"></span> ${up ? "Post the slip." : "The crash reel loves this."}</p><div class="row"><button type="button" class="btn btn-or btn-sm" id="postSlip">Post the slip</button><button type="button" class="btn btn-line btn-sm" id="copySlip">Copy</button></div>`;
    toast.hidden = false;
    // The cached board can be stale or another league, so ask for the open rank after this flight.
    fetch("/api/leaderboard?league=open")
      .then((res) => (res.ok ? (res.json() as Promise<Board>) : null))
      .then((fresh) => {
        const slot = document.getElementById("slipRank");
        if (slot && fresh?.youRank) slot.textContent = ` Rank #${fresh.youRank}.`;
      })
      .catch(() => {});
    const text = `${up ? "landed" : "crashed"} a ${formatRatio(flight.leverage)} ${flight.market} plane on Paperplane\n${formatFiat(flight.pnl, "detailed", true)} paper · ${who.callsign}\n\nFold a plane. Others board it. Takeoff is one price.\n${location.origin}`;
    $<HTMLButtonElement>("postSlip").onclick = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    $<HTMLButtonElement>("copySlip").onclick = () => navigator.clipboard?.writeText(text).then(() => ($("copySlip").textContent = "Copied"));
  }

  async function loadPrices() {
    const res = await fetch("/api/prices");
    if (!res.ok) return;
    const data = (await res.json()) as { markets: Record<string, { price: number; changePct: number; candles: number[] }> };
    for (const k of Object.keys(data.markets)) {
      const m = data.markets[k]!;
      hist[k] = m.candles;
      change[k] = m.changePct;
      if (m.price > 0) open24[k] = m.price / (1 + m.changePct / 100);
    }
    paintLive();
  }

  function paintHud() {
    if (!$("r-trade").classList.contains("on")) return;
    const px = last(cur);
    const hudPx = $("hudPx");
    if (px && px !== lastHudPx) {
      hudPx.textContent = formatPrice(px);
      if (lastHudPx && !reduced) {
        hudPx.classList.remove("tick-up", "tick-down");
        void hudPx.offsetWidth;
        hudPx.classList.add(px > lastHudPx ? "tick-up" : "tick-down");
        window.setTimeout(() => hudPx.classList.remove("tick-up", "tick-down"), 60);
      }
      lastHudPx = px;
    }
    const streaming = !!live[cur] && Date.now() - live[cur]!.t < 10_000;
    $("liveDot").classList.toggle("on", streaming);
    $("hudMk").textContent = `${cur}-PERP · ${streaming ? "live" : "mark"}`;
    const t = tracked();
    const hudPnl = $("hudPnl");
    if (!t) hudPnl.textContent = "No plane on the sheet";
    else if (t.phase === "boarding" && t.takeoffAt) {
      const left = Math.max(0, t.takeoffAt - Date.now());
      const who = t.pilot ? `Aboard ${esc(t.pilot)}'s plane · ` : "On the ground · ";
      hudPnl.innerHTML = left > 0 ? `${who}takes off in ${clock(left)}` : "Taking off";
    } else {
      const r = roePct(t);
      if (r == null) hudPnl.textContent = "In the air";
      else if (t.pilot) hudPnl.innerHTML = `Your seat ${signed(r)} · ${esc(t.pilot)}'s ${t.market} ${t.side} ${formatRatio(t.leverage)}`;
      else {
        const v = livePnl(t);
        hudPnl.innerHTML = `P&amp;L <span class="${v >= 0 ? "up" : "down"}">${formatFiat(v, "detailed", true)} · ${formatPercent(r, true)}</span> · ${t.side} ${formatRatio(t.leverage)}`;
      }
    }
  }

  /** Live readout next to Close and land, for your own plane once it is in the air. */
  function paintPos() {
    const p = pos();
    const box = $("livePos");
    const r = p && p.phase !== "boarding" ? roePct(p) : null;
    box.hidden = r == null;
    if (!p || r == null) return;
    const v = livePnl(p);
    $("lpPnl").innerHTML = `<span class="${v >= 0 ? "up" : "down"}">${formatFiat(v, "detailed", true)} · ${formatPercent(r, true)}</span>`;
    $("lpEntry").textContent = formatPrice(p.entry);
    $("lpMark").textContent = formatPrice(last(p.market));
    $("lpTp").textContent = p.tp > 0 ? formatPrice(p.tp) : "—";
    $("lpLiq").textContent = p.liq > 0 ? formatPrice(p.liq) : "—";
  }

  /** Everything that moves with the price. Cheap, runs a few times a second. */
  function paintLive() {
    updateMk();
    paintHud();
    paintPos();
    upTicket();
    paintSky();
  }

  async function loadConfig() {
    const res = await fetch("/api/config");
    if (!res.ok) return;
    const cfg = (await res.json()) as { mint: string | null; pumpUrl: string | null };
    mintLive = Boolean(cfg.mint);
    const link = $<HTMLAnchorElement>("buyLink");
    if (cfg.pumpUrl && cfg.mint) {
      link.href = cfg.pumpUrl;
      link.textContent = "Open on pump.fun ↗";
      $("mintLine").textContent = `Mint ${cfg.mint}`;
      $<HTMLButtonElement>("buyGo").disabled = false;
      $<HTMLButtonElement>("buyGo").textContent = "Buy $PLANE";
    }
  }

  function stat(label: string, value: string, note: string) {
    return `<div class="stat"><small>${esc(label)}</small><b class="num">${esc(value)}</b><p>${esc(note)}</p></div>`;
  }

  async function loadPress() {
    const res = await fetch("/api/press");
    if (!res.ok) return;
    const press = (await res.json()) as {
      collectedSol: number | null;
      treasurySol: number | null;
      poolSol: number;
      paidSol: number;
      unassignedSol: number | null;
      pilots: number;
      flights: number;
      solPrice: number | null;
      wallet: string | null;
      solscan: string | null;
      pumpUrl: string;
    };
    const usd = (sol: number | null) => (sol != null && press.solPrice ? formatFiat(sol * press.solPrice, "compact") : "—");
    $("pressGrid").innerHTML = [
      stat("SOL collected", press.collectedSol == null ? "—" : formatSol(press.collectedSol), press.collectedSol == null ? "Lifetime fees, published as they are claimed." : `About ${usd(press.collectedSol)} at the SOL mark.`),
      stat("Season pool", formatSol(press.poolSol), "80% of claimed fees, assigned to this week."),
      stat("Paid to pilots", formatSol(press.paidSol), "SOL already sent for closed seasons."),
      stat("Treasury", press.treasurySol == null ? "—" : formatSol(press.treasurySol), press.wallet ? "Live balance of the creator wallet." : "Creator wallet publishes at launch."),
      stat("Not yet assigned", press.unassignedSol == null ? "—" : formatSol(press.unassignedSol), "Collected, not yet in the pool or paid out."),
      stat("Pilots", String(press.pilots), "Paper accounts opened this season."),
      stat("Flights", String(press.flights), "Closed paper trades read from the league."),
      stat("Prize per 1 SOL", "0.8 SOL", "The share of each claimed SOL that joins the pool."),
    ].join("");
    const walletLine = $("pressWallet");
    walletLine.innerHTML = press.solscan
      ? `Creator wallet <a href="${esc(press.solscan)}" target="_blank" rel="noreferrer">${esc(press.wallet || "")}</a>`
      : "Creator wallet publishes with the launch. Until then the treasury cell stays blank on purpose.";
    const collected = press.collectedSol == null ? "—" : formatSol(press.collectedSol);
    $("tapeText").textContent = `the press · sol collected ${collected} · season pool ${formatSol(press.poolSol)} · paid ${formatSol(press.paidSol)} · pilots ${press.pilots} · flights ${press.flights}`;
  }

  let quoteTimer = 0;
  async function quoteTrade() {
    $("buyErr").textContent = "";
    if (!mintLive) {
      $("buyOut").textContent = "—";
      $("buyImpact").textContent = "—";
      return;
    }
    const amount = parseFloat($<HTMLInputElement>("buyAmt").value);
    if (!(amount > 0)) {
      $("buyOut").textContent = "—";
      return;
    }
    const res = await fetch(`/api/swap?side=${tradeSide}&amount=${encodeURIComponent(String(amount))}`);
    const body = (await res.json()) as { out?: number; impactPct?: number; error?: string };
    if (!res.ok || body.out == null) {
      $("buyOut").textContent = "—";
      $("buyErr").textContent = body.error || "No route for that size.";
      return;
    }
    $("buyOut").textContent = tradeSide === "buy" ? `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(body.out)} $PLANE` : formatSol(body.out);
    $("buyImpact").textContent = formatPercent(body.impactPct ?? 0);
  }

  function formError(msg: string) {
    $("formErr").textContent = msg;
  }

  async function connect(provider: Provider["provider"]) {
    $("werr").textContent = "";
    const { publicKey } = await provider.connect();
    walletProvider = provider;
    const wallet = publicKey.toString();
    const nonceRes = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    const nonceBody = (await nonceRes.json()) as { message?: string; nonce?: string; error?: string };
    if (!nonceRes.ok || !nonceBody.message || !nonceBody.nonce) throw new Error(nonceBody.error || "Could not start sign-in.");
    const signed = await provider.signMessage(new TextEncoder().encode(nonceBody.message));
    const sig = signed instanceof Uint8Array ? signed : signed.signature;
    const verify = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet, nonce: nonceBody.nonce, signature: b64(sig) }),
    });
    const verified = (await verify.json()) as { error?: string };
    if (!verify.ok) throw new Error(verified.error || "Sign-in failed.");
    $("wmodal").hidden = true;
    await loadMe();
    await loadBoard();
    await loadSky().catch(() => {});
    if (pendingBoard) {
      const id = pendingBoard;
      pendingBoard = "";
      await boardPlane(id);
    }
    if (!(location.hash || "").includes("trade")) {
      history.replaceState(null, "", "#trade");
      show("trade");
    }
  }

  function openModal() {
    const list = detectWallets();
    $("wlist").innerHTML = list.length
      ? list.map((w, i) => `<button type="button" class="wopt" data-w="${i}">${esc(w.name)}<span>Sign in</span></button>`).join("")
      : `<a class="wopt" href="https://phantom.app/download" target="_blank" rel="noreferrer">Install Phantom<span>↗</span></a><a class="wopt" href="https://solflare.com/download" target="_blank" rel="noreferrer">Install Solflare<span>↗</span></a>`;
    $("werr").textContent = "";
    $("wmodal").hidden = false;
    $("wlist").onclick = (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>("[data-w]");
      if (!btn) return;
      const picked = list[Number(btn.dataset.w)];
      if (!picked) return;
      connect(picked.provider).catch((err: Error) => {
        $("werr").textContent = err?.message || "Wallet closed the prompt.";
      });
    };
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    me = null;
    walletProvider = null;
    paintAccount();
    renderLog();
    paintBoard();
  }

  const R: Record<string, string> = { home: "r-home", trade: "r-trade", league: "r-league", plane: "r-plane", docs: "r-docs" };
  function show(name: string) {
    const n = R[name] ? name : "home";
    for (const k of Object.keys(R)) $(R[k]!).classList.toggle("on", k === n);
    root.querySelectorAll<HTMLAnchorElement>(".links a").forEach((a) => {
      if (a.dataset.go === n) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    setMenu(false);
    window.scrollTo(0, 0);
    onScroll();
    lastHudPx = 0;
    paintSky();
  }
  function setMenu(open: boolean) {
    $("menu").hidden = !open;
    $("burger").setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }

  const film = $("film");
  const sheet = $("sheet");
  const halfR = $("halfR");
  const pl = $("plane");
  const wa = $("wa");
  const wb = $("wb");
  const keel = $("keel");
  const ball = $("ball");
  const bd = $("board3");
  const tp = root.querySelector<SVGPathElement>("#trailPath")!;
  const shd = $("shd");
  const stage = $("stage");
  const caps = [...$("caps").children];
  const chs = [...$("chap").children];
  const TL = tp.getTotalLength();
  const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
  const ease = (x: number) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const io = (x: number) => {
    x = clamp(x, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  function filmAt(p: number) {
    const ch = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3;
    caps.forEach((c, i) => c.classList.toggle("on", i === ch));
    chs.forEach((c, i) => c.classList.toggle("on", i === ch));
    $("pct").textContent = `${Math.round(p * 100)}%`;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const f = io(clamp(p / 0.18, 0, 1));
    const shrink = clamp((p - 0.17) / 0.07, 0, 1);
    halfR.style.transform = `rotateY(${-178 * f}deg)`;
    sheet.style.transform = `translateX(${f * 25}%) rotateX(${16 + f * 22}deg) rotateZ(${-5 + f * 9}deg) scale(${1 - shrink * 0.6})`;
    sheet.style.opacity = String(1 - shrink * shrink * shrink);
    shd.style.opacity = String(1 - shrink);
    const wingK = ease(clamp((p - 0.21) / 0.06, 0, 1));
    const fl = 0.32 + clamp((p - 0.24) / 0.26, 0, 1) * 0.56;
    const crash = io(clamp((p - 0.5) / 0.1, 0, 1));
    pl.style.opacity = String(p > 0.2 && p < 0.58 ? clamp((p - 0.2) / 0.03, 0, 1) : 0);
    wa.style.transform = `rotateX(${wingK * 64}deg)`;
    wb.style.transform = `rotateX(${-wingK * 64}deg)`;
    keel.style.transform = `rotateX(${-wingK * 94}deg)`;
    const a = tp.getPointAtLength(TL * fl);
    const b = tp.getPointAtLength(Math.min(TL, TL * fl + 10));
    let x = (a.x / 1000 - 0.5) * W;
    let y = (a.y / 600 - 0.5) * H;
    let ang = (Math.atan2(((b.y - a.y) * H) / 600, ((b.x - a.x) * W) / 1000) * 180) / Math.PI;
    if (p < 0.3) {
      const k = io(clamp((p - 0.21) / 0.09, 0, 1));
      x *= k;
      y *= k;
      ang = ang * k - 10 * (1 - k);
    }
    x += crash * -W * 0.06;
    y += crash * H * 0.4;
    ang += crash * 75;
    pl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotateX(58deg) rotateZ(${ang.toFixed(1)}deg) scale(${((0.55 + 0.3 * wingK) * Math.min(1, W / 1100) + 0.1).toFixed(3)})`;
    tp.style.opacity = p > 0.22 && p < 0.74 ? "1" : "0";
    tp.style.strokeDasharray = `${(TL * fl).toFixed(1)} ${TL.toFixed(1)}`;
    const bk = clamp((p - 0.58) / 0.16, 0, 1);
    ball.style.opacity = String(p > 0.575 && p < 0.77 ? 1 : 0);
    const by = bk < 0.6 ? H * 0.05 + Math.pow(bk / 0.6, 2) * H * 0.09 : H * 0.14 - Math.abs(Math.sin(((bk - 0.6) / 0.4) * Math.PI)) * H * 0.09;
    ball.style.transform = `translate(${(W * (0.22 - bk * 0.22)).toFixed(1)}px,${by.toFixed(1)}px) rotate(${(bk * 540).toFixed(0)}deg) scale(${1 - clamp((p - 0.74) / 0.06, 0, 1) * 0.6})`;
    const u = clamp((p - 0.76) / 0.2, 0, 1);
    bd.style.opacity = p > 0.76 ? "1" : "0";
    $("p1").style.transform = `rotateX(${((1 - ease(u * 1.7)) * -70).toFixed(1)}deg)`;
    $("p2").style.transform = `rotateX(${((1 - ease(u * 1.7 - 0.3)) * 175).toFixed(1)}deg)`;
    $("p3").style.transform = `rotateX(${((1 - ease(u * 1.7 - 0.6)) * -175).toFixed(1)}deg)`;
    bd.style.transform = `translateY(${((1 - ease(u)) * 40).toFixed(1)}px) rotateX(12deg) scale(${(0.86 + 0.14 * ease(u)).toFixed(3)})`;
  }
  function onScroll() {
    if (!$("r-home").classList.contains("on")) return;
    const r = film.getBoundingClientRect();
    const total = film.offsetHeight - (stage.parentElement?.offsetHeight || 1);
    filmAt(reduced ? 0 : clamp(-r.top / Math.max(1, total), 0, 1));
  }

  const cv = $<HTMLCanvasElement>("chart");
  const cx = cv.getContext("2d")!;
  let raf = 0;
  function drawPlane(x: number, y: number, ang: number, sc: number, col: string) {
    cx.save();
    cx.translate(x, y);
    cx.rotate(ang);
    cx.scale(sc, sc);
    cx.fillStyle = col;
    cx.beginPath();
    cx.moveTo(22, 0);
    cx.lineTo(-16, -14);
    cx.lineTo(-8, 0);
    cx.lineTo(-16, 12);
    cx.closePath();
    cx.fill();
    cx.restore();
  }
  function seriesFor(k: string, now: number): { t: number; p: number }[] {
    const candles = hist[k] ?? [];
    const minute = Math.floor(now / 60_000) * 60_000;
    const fromCandles = (count: number) =>
      candles.slice(-count).map((p, i, a) => ({ t: minute - (a.length - 1 - i) * 60_000, p }));
    if (tf === "3h") {
      const pts = fromCandles(candles.length);
      const px = last(k);
      if (px) pts.push({ t: now, p: px });
      return pts;
    }
    const recent = (ticks[k] ?? []).filter((x) => x.t >= now - LIVE_WINDOW);
    if (recent.length >= 4) return recent;
    // Stream still warming up: lean on the last few candles so the chart is never empty.
    const pts = fromCandles(3).concat(recent);
    const px = last(k);
    if (px) pts.push({ t: now, p: px });
    return pts;
  }

  function hline(y: number, color: string, dash: number[], label: string, W: number) {
    cx.strokeStyle = color;
    cx.setLineDash(dash);
    cx.beginPath();
    cx.moveTo(0, y);
    cx.lineTo(W, y);
    cx.stroke();
    cx.setLineDash([]);
    cx.fillStyle = color;
    cx.fillText(label, 20, y - 6);
  }

  function draw() {
    raf = requestAnimationFrame(draw);
    if (!$("r-trade").classList.contains("on")) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    const now = Date.now();
    const series = seriesFor(cur, now);
    if (series.length < 2) return;
    const target = series[series.length - 1]!.p;
    if (dispMk !== cur || !dispPx || reduced) {
      dispPx = target;
      dispMk = cur;
    } else dispPx += (target - dispPx) * 0.18;
    series[series.length - 1] = { t: now, p: dispPx };

    const t = tracked();
    const levels = t && t.market === cur && t.entry > 0 ? t : null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const x of series) {
      if (x.p < lo) lo = x.p;
      if (x.p > hi) hi = x.p;
    }
    const minSpan = dispPx * 0.0004;
    if (hi - lo < minSpan) {
      const mid = (hi + lo) / 2;
      lo = mid - minSpan / 2;
      hi = mid + minSpan / 2;
    }
    const span = hi - lo;
    // In the Live window, far-off TP/liq would flatten the line; pin those to the edge instead.
    const fits = (v: number) => tf === "3h" || (v > lo - span * 2.5 && v < hi + span * 2.5);
    if (levels) {
      for (const v of [levels.entry, levels.tp, levels.liq]) {
        if (v > 0 && fits(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    }
    const pad = (hi - lo) * 0.12 || 1;
    lo -= pad;
    hi += pad;
    const t0 = tf === "live" ? Math.min(series[0]!.t, now - LIVE_WINDOW) : series[0]!.t;
    const plotR = W - 120;
    const X = (tm: number) => 20 + ((plotR - 20) * (tm - t0)) / Math.max(1, now - t0);
    const Y = (v: number) => 70 + (H - 100) * (1 - (v - lo) / (hi - lo));
    cx.strokeStyle = "rgba(239,231,216,.06)";
    cx.lineWidth = 1;
    cx.font = "12px ui-monospace, monospace";
    for (let g = 0; g < 6; g++) {
      const gy = 70 + ((H - 100) * g) / 5;
      cx.beginPath();
      cx.moveTo(0, gy);
      cx.lineTo(W, gy);
      cx.stroke();
      cx.fillStyle = "#8F8676";
      cx.fillText(formatPrice(hi - ((hi - lo) * g) / 5), W - 108, gy - 5);
    }
    if (levels) {
      const edge = (v: number, color: string, name: string) => {
        const above = v > hi;
        const y = above ? 64 : H - 22;
        cx.fillStyle = color;
        cx.fillText(`${name} ${formatPrice(v)} ${above ? "↑" : "↓"}`, 20, y);
      };
      const lvl = (v: number, color: string, dash: number[], name: string) =>
        v >= lo && v <= hi ? hline(Y(v), color, dash, `${name} ${formatPrice(v)}`, plotR) : edge(v, color, name);
      lvl(levels.liq, "#FF8F7A", [2, 6], "liq");
      lvl(levels.tp, "#FF6A2B", [8, 6], "tp");
      lvl(levels.entry, "rgba(239,231,216,.55)", [4, 6], "entry");
    }
    // Area under the line, tinted by direction since the window opened.
    const up = dispPx >= series[0]!.p;
    cx.beginPath();
    series.forEach((x, i) => (i ? cx.lineTo(X(x.t), Y(x.p)) : cx.moveTo(X(x.t), Y(x.p))));
    cx.lineTo(X(now), H - 30);
    cx.lineTo(X(series[0]!.t), H - 30);
    cx.closePath();
    const grad = cx.createLinearGradient(0, 70, 0, H - 30);
    grad.addColorStop(0, up ? "rgba(142,209,154,.14)" : "rgba(255,143,122,.14)");
    grad.addColorStop(1, "rgba(22,19,15,0)");
    cx.fillStyle = grad;
    cx.fill();
    cx.beginPath();
    series.forEach((x, i) => (i ? cx.lineTo(X(x.t), Y(x.p)) : cx.moveTo(X(x.t), Y(x.p))));
    cx.strokeStyle = "#EFE7D8";
    cx.lineWidth = 2;
    cx.lineJoin = "round";
    cx.stroke();
    const lx = X(now);
    const ly = Y(dispPx);
    // Current-price line and tag on the axis.
    cx.strokeStyle = up ? "rgba(142,209,154,.5)" : "rgba(255,143,122,.5)";
    cx.setLineDash([1, 4]);
    cx.beginPath();
    cx.moveTo(lx, ly);
    cx.lineTo(W, ly);
    cx.stroke();
    cx.setLineDash([]);
    cx.fillStyle = up ? "#8ED19A" : "#FF8F7A";
    cx.fillRect(W - 112, ly - 11, 108, 22);
    cx.fillStyle = "#16130F";
    cx.fillText(formatPrice(dispPx), W - 106, ly + 4);
    const back = series[Math.max(0, series.length - 6)]!;
    const ang = Math.atan2(ly - Y(back.p), lx - X(back.t));
    if (t && t.market === cur) drawPlane(lx, ly + (reduced ? 0 : Math.sin(now / 300) * 3), ang, 1.15, "#FF6A2B");
    else {
      cx.beginPath();
      cx.arc(lx, ly, 5, 0, 6.29);
      cx.fillStyle = "#FF6A2B";
      cx.fill();
    }
  }

  const hs = [...root.querySelectorAll<HTMLElement>("#doc h2")];
  $("toc").innerHTML = hs.map((h) => `<a href="#docs" data-doc="${h.id}">${esc(h.textContent || "")}</a>`).join("");

  on($("navConnect"), "click", () => (me ? signOut() : openModal()));
  on($("menuConnect"), "click", () => (me ? signOut() : openModal()));
  on($("wclose"), "click", () => ($("wmodal").hidden = true));
  on($("wmodal"), "click", (e) => {
    if (e.target === $("wmodal")) $("wmodal").hidden = true;
  });
  on($("burger"), "click", () => setMenu(true));
  on($("menuClose"), "click", () => setMenu(false));
  on(document, "keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape") {
      setMenu(false);
      $("wmodal").hidden = true;
      $("toast").hidden = true;
    }
  });
  on(root, "click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>("[data-go]");
    if (!a) return;
    e.preventDefault();
    const go = a.dataset.go || "home";
    history.replaceState(null, "", "#" + go);
    show(go);
  });
  on($("skip"), "click", (e) => {
    e.preventDefault();
    $("after").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });
  on(window, "scroll", () => onScroll(), { passive: true });
  on(window, "resize", () => onScroll());
  on(window, "hashchange", () => show((location.hash || "").slice(1)));
  on($("mkts"), "click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-mk]");
    if (!b?.dataset.mk || pos()) return;
    cur = b.dataset.mk as MarketId;
    renderMk();
    lastHudPx = 0;
    upTicket();
  });
  on($("bLong"), "click", () => {
    if (pos()) return;
    side = "long";
    $("bLong").setAttribute("aria-pressed", "true");
    $("bShort").setAttribute("aria-pressed", "false");
    upTicket();
  });
  on($("bShort"), "click", () => {
    if (pos()) return;
    side = "short";
    $("bShort").setAttribute("aria-pressed", "true");
    $("bLong").setAttribute("aria-pressed", "false");
    upTicket();
  });
  ["amt", "lev", "tp"].forEach((id) => on($(id), "input", () => upTicket()));
  on($("ticket"), "submit", (e) => {
    e.preventDefault();
    formError("");
    if (!me) {
      openModal();
      return;
    }
    if (busy) return;
    busy = true;
    const run = pos()
      ? fetch("/api/trade/close", { method: "POST" })
      : fetch("/api/trade/open", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            market: cur,
            side,
            margin: parseFloat($<HTMLInputElement>("amt").value),
            leverage: parseFloat($<HTMLInputElement>("lev").value),
            tpPct: parseFloat($<HTMLInputElement>("tp").value),
          }),
        });
    run
      .then(async (res) => {
        const body = (await res.json()) as { error?: string; flight?: Flight };
        if (!res.ok) throw new Error(body.error || "Could not file the flight.");
        if (body.flight) {
          seenFlight = body.flight.id;
          if (me) showSlip(body.flight, me);
        } else $("toast").hidden = true;
        await loadMe();
        await loadBoard();
      })
      .catch((err: Error) => formError(err.message))
      .finally(() => {
        busy = false;
      });
  });
  on($("tabs"), "click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-lg]");
    if (!b?.dataset.lg) return;
    league = b.dataset.lg as typeof league;
    [...$("tabs").children].forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    loadBoard().catch(() => {});
  });
  on($("toBuy"), "click", () => {
    history.replaceState(null, "", "#plane");
    show("plane");
    $("buy").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });
  on($("buySide"), "click", () => {
    tradeSide = "buy";
    $("buySide").setAttribute("aria-pressed", "true");
    $("sellSide").setAttribute("aria-pressed", "false");
    $("buyUnit").textContent = "SOL";
    if (mintLive) $("buyGo").textContent = "Buy $PLANE";
    quoteTrade().catch(() => {});
  });
  on($("sellSide"), "click", () => {
    tradeSide = "sell";
    $("sellSide").setAttribute("aria-pressed", "true");
    $("buySide").setAttribute("aria-pressed", "false");
    $("buyUnit").textContent = "$PLANE";
    if (mintLive) $("buyGo").textContent = "Sell $PLANE";
    quoteTrade().catch(() => {});
  });
  on($("buyAmt"), "input", () => {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(() => quoteTrade().catch(() => {}), 280);
  });
  on($("buyForm"), "submit", (e) => {
    e.preventDefault();
    $("buyErr").textContent = "";
    if (!mintLive) return;
    if (!me || !walletProvider?.signTransaction) {
      openModal();
      return;
    }
    const amount = parseFloat($<HTMLInputElement>("buyAmt").value);
    const signer = walletProvider;
    $<HTMLButtonElement>("buyGo").disabled = true;
    import("@/lib/ui/buy")
      .then(({ sendSwap }) => sendSwap({ signTransaction: (tx) => signer.signTransaction!(tx) }, me!.wallet, tradeSide, amount))
      .then((sig) => {
        $("buyErr").textContent = `Confirmed ${sig.slice(0, 8)}…`;
      })
      .catch((err: Error) => {
        $("buyErr").textContent = err.message || "The wallet closed the swap.";
      })
      .finally(() => {
        $<HTMLButtonElement>("buyGo").disabled = false;
      });
  });
  on($("toc"), "click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>("[data-doc]");
    if (!a?.dataset.doc) return;
    e.preventDefault();
    $(a.dataset.doc).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });

  renderMk();
  show((location.hash || "").slice(1));
  filmAt(0);
  draw();
  loadPrices().catch(() => {});
  loadMe().catch(() => {});
  async function loadSky() {
    const res = await fetch("/api/sky");
    if (!res.ok) return;
    const data = (await res.json()) as { planes: SkyPlane[] };
    sky = data.planes;
    paintSky();
  }

  let snackTimer = 0;
  function snack(html: string) {
    const el = $("snack");
    el.innerHTML = html;
    el.hidden = false;
    window.clearTimeout(snackTimer);
    snackTimer = window.setTimeout(() => (el.hidden = true), 4500);
  }

  async function boardPlane(id: string) {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch("/api/trade/board", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = (await res.json()) as { error?: string; sky?: { planes: SkyPlane[] } };
      if (!res.ok) throw new Error(body.error || "Could not board.");
      if (body.sky) sky = body.sky.planes;
      formError("");
      const p = sky.find((x) => x.id === id);
      if (p && !pos()) {
        cur = p.market;
        renderMk();
        upTicket();
      }
      paintSky();
      snack(p ? `You're aboard <b>${esc(p.callsign)}</b>'s ${esc(p.market)} ${p.side} ${formatRatio(p.leverage)}. Takeoff in ${clock(p.takeoffAt - Date.now())}. <a href="#trade" data-go="trade">Watch it</a>` : "You're aboard.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not board.";
      formError(msg);
      snack(esc(msg));
    } finally {
      busy = false;
    }
  }

  on(root, "click", (e) => {
    const target = e.target as HTMLElement;
    const b = target.closest<HTMLButtonElement>("[data-board]");
    if (b?.dataset.board) {
      if (!me) {
        pendingBoard = b.dataset.board;
        openModal();
        return;
      }
      boardPlane(b.dataset.board).catch(() => {});
      return;
    }
    const pick = target.closest<HTMLElement>("[data-pick]");
    if (pick?.dataset.pick) {
      if (!pos()) cur = pick.dataset.pick as MarketId;
      renderMk();
      history.replaceState(null, "", "#trade");
      show("trade");
      upTicket();
    }
  });
  on($("tf"), "click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-tf]");
    if (!b?.dataset.tf) return;
    tf = b.dataset.tf as typeof tf;
    [...$("tf").children].forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  });
  on($("wclose"), "click", () => (pendingBoard = ""));

  const stopLive = startLive((m, price, at) => {
    live[m] = { p: price, t: at };
    const buf = (ticks[m] ??= []);
    const lastTick = buf[buf.length - 1];
    if (lastTick && at - lastTick.t < 150) lastTick.p = price;
    else buf.push({ t: at, p: price });
    if (buf.length > 1600) buf.splice(0, buf.length - 1200);
  });
  const livePaint = window.setInterval(paintLive, 250);

  loadBoard().catch(() => {});
  loadSky().catch(() => {});
  loadConfig().then(() => quoteTrade()).catch(() => {});
  loadPress().catch(() => {});
  const poll = window.setInterval(() => {
    loadPrices().catch(() => {});
    if (me) loadMe().catch(() => {});
    if (!$("r-docs").classList.contains("on")) loadSky().catch(() => {});
  }, reduced ? 5000 : 3000);
  const boardPoll = window.setInterval(() => {
    if ($("r-home").classList.contains("on") || $("r-league").classList.contains("on") || $("r-plane").classList.contains("on")) {
      loadBoard().catch(() => {});
      loadPress().catch(() => {});
    }
  }, 15000);
  cleanups.push(() => {
    cancelAnimationFrame(raf);
    clearInterval(poll);
    clearInterval(boardPoll);
    clearInterval(livePaint);
    clearTimeout(snackTimer);
    stopLive();
    document.body.style.overflow = "";
  });

  return () => {
    cleanups.forEach((fn) => fn());
    root.innerHTML = "";
  };
}
