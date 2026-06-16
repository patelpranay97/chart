// Post-game coaching: turn a finished round (the path that played out + how the
// player actually traded it) into a few specific, prioritized lessons. Pure and
// deterministic so it can be unit-tested. Uses only data the game already has.
import type { Candle, Trade } from "./types";

export type InsightTone = "good" | "warn" | "info";
export interface Insight {
  tone: InsightTone;
  title: string;
  detail: string;
  priority: number; // higher = more important; used to pick the top few
}

export type Regime = "bull" | "bear" | "chop";

export interface CoachInput {
  candles: Candle[]; // the full round window
  initialBars: number; // bars revealed before trading started
  revealed: number; // how many bars were ultimately revealed (days played + initial)
  trades: Trade[]; // closed trades
  returnPct: number;
  buyHoldPct: number;
  liquidated: boolean;
}

export interface Debrief {
  headline: string;
  regime: Regime;
  daysPlayed: number;
  exposurePct: number; // share of tradeable days spent in a position
  winRate: number; // 0..1 over closed trades (0 if none)
  longBias: number; // -1 (all short) .. +1 (all long), time-weighted
  insights: Insight[]; // top few, already sorted by priority
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`;

function classifyRegime(startClose: number, endClose: number): Regime {
  const r = (endClose - startClose) / startClose;
  if (r > 0.05) return "bull";
  if (r < -0.05) return "bear";
  return "chop";
}

const regimeWord: Record<Regime, string> = {
  bull: "an up-trend",
  bear: "a down-trend",
  chop: "a choppy, sideways market",
};

export function debrief(input: CoachInput): Debrief {
  const { candles, initialBars, revealed, trades, returnPct, buyHoldPct, liquidated } = input;
  const lastIdx = Math.min(revealed, candles.length) - 1;
  const daysPlayed = Math.max(0, lastIdx - (initialBars - 1));
  const startClose = candles[initialBars - 1]?.close ?? candles[0].close;
  const endClose = candles[lastIdx]?.close ?? startClose;
  const regime = classifyRegime(startClose, endClose);

  // Time in a position (union of trade intervals so adds/partials don't double-count).
  const inPos = new Array(Math.max(0, lastIdx + 1)).fill(false);
  for (const t of trades) {
    for (let i = t.entryBar; i < t.exitBar && i <= lastIdx; i++) inPos[i] = true;
  }
  const barsInPos = inPos.slice(initialBars).filter(Boolean).length;
  const exposurePct = daysPlayed > 0 ? barsInPos / daysPlayed : 0;

  // Time-weighted long/short bias over the bars actually held.
  let longBars = 0;
  let shortBars = 0;
  for (const t of trades) {
    const dur = Math.max(0, t.exitBar - t.entryBar);
    if (t.dir === 1) longBars += dur;
    else shortBars += dur;
  }
  const heldBars = longBars + shortBars;
  const longBias = heldBars > 0 ? (longBars - shortBars) / heldBars : 0;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const closed = wins.length + losses.length;
  const winRate = closed > 0 ? wins.length / closed : 0;
  const avgWinPct = mean(wins.map((t) => t.pnlPct));
  const avgLossPct = Math.abs(mean(losses.map((t) => t.pnlPct)));
  const avgHoldWin = mean(wins.map((t) => t.exitBar - t.entryBar));
  const avgHoldLoss = mean(losses.map((t) => t.exitBar - t.entryBar));
  const edgeVsHold = returnPct - buyHoldPct;

  const out: Insight[] = [];
  const add = (tone: InsightTone, title: string, detail: string, priority: number) =>
    out.push({ tone, title, detail, priority });

  // 1) Liquidation dominates — the most important lesson when it happens.
  if (liquidated) {
    add(
      "warn",
      "Margin call — you blew up",
      "Leverage forced you out at a maintenance breach. A correct read still fails if one move can wipe the account. Size down and risk only a fraction per trade.",
      100,
    );
  }

  // 2) Were you on the right side of the trend?
  if (trades.length === 0) {
    if (regime === "bull")
      add("warn", "You sat out an up-trend", "Price trended higher and you never took it. Sitting out is fine in chop, but a clean uptrend is the easiest money — learn to commit when the trend is clear.", 80);
    else if (regime === "bear")
      add("good", "You sat out a down-trend", "Price fell and you stayed flat — capital preserved. Even better is shorting strength, but not bleeding in a downtrend is a real skill.", 70);
    else
      add("good", "You sat out the chop", "This market went nowhere and you didn't force trades into it. Patience in chop is exactly right.", 70);
  } else if (regime === "bull" && longBias < -0.2) {
    add("warn", "You fought an up-trend", "The market trended higher but you leaned short. Don't fight a clear trend — trade with it or stand aside.", 85);
  } else if (regime === "bear" && longBias > 0.2) {
    add("warn", "You bought a down-trend", "Price was falling and you stayed mostly long — catching a falling knife. In a downtrend, shorting or sitting out beats buying dips.", 85);
  } else if (regime === "bull" && longBias > 0.2) {
    add("good", "You read the up-trend", "You leaned long into a rising market — trading with the trend is the highest-percentage play.", 60);
  } else if (regime === "bear" && longBias < -0.2) {
    add("good", "You read the down-trend", "You leaned short into a falling market — most traders only know how to be long, so this is a real edge.", 65);
  } else if (regime === "chop") {
    add("info", "This was a sideways market", "No real trend to ride — chop is where overtrading does the most damage. Fewer, more patient entries (fade the edges, not the middle) win here.", 50);
  }

  // 3) Cutting winners / holding losers — the classic discipline tell.
  if (losses.length >= 1 && wins.length >= 1) {
    if (avgHoldLoss > avgHoldWin * 1.4) {
      add("warn", "You held losers longer than winners", `Your average loser ran ~${avgHoldLoss.toFixed(0)} days vs ~${avgHoldWin.toFixed(0)} for winners. That's the most common mistake there is — cut losers fast, let winners run.`, 75);
    }
    if (avgLossPct > avgWinPct * 1.3) {
      add("warn", "Your losses outsized your wins", `Avg loss ${pct(-avgLossPct)} vs avg win ${pct(avgWinPct)}. Even a good win rate loses money with that risk/reward — aim for wins at least as big as losses.`, 78);
    } else if (avgWinPct > avgLossPct * 1.3 && wins.length >= 2) {
      add("good", "Good risk/reward", `Your average win (${pct(avgWinPct)}) beat your average loss (${pct(-avgLossPct)}). Asymmetry like that is how you win even below a 50% hit rate.`, 45);
    }
  }

  // 4) Overtrading — round-trips cost the spread every time.
  if (daysPlayed > 0 && trades.length > Math.max(6, daysPlayed / 8) && edgeVsHold < 0) {
    add("warn", "You overtraded", `${trades.length} round-trips in ${daysPlayed} days. Every entry/exit pays the spread; that churn cost you vs. just holding. Be more selective.`, 72);
  }

  // 5) Beat / lagged buy & hold.
  if (trades.length > 0) {
    if (edgeVsHold > 3) {
      add("good", "You beat buy & hold", `Your ${pct(returnPct)} topped a passive ${pct(buyHoldPct)} — your timing actually added value.`, 55);
    } else if (edgeVsHold < -3 && regime === "bull") {
      add("info", "Holding would've beaten you", `Buy & hold returned ${pct(buyHoldPct)} vs your ${pct(returnPct)}. In a clean uptrend, activity often just adds cost — sometimes the trade is to sit in the winner.`, 58);
    }
  }

  // 6) High win rate but still lost — death by a few big losers.
  if (closed >= 4 && winRate >= 0.6 && returnPct < 0) {
    add("info", "Won often, lost anyway", `You were right ${(winRate * 100).toFixed(0)}% of the time but still finished red — a few oversized losers erased many small wins. Protect against the big one.`, 68);
  }

  out.sort((a, b) => b.priority - a.priority);
  const insights = out.slice(0, 4);

  const headline = liquidated
    ? "You got margin-called — the round ended in a forced liquidation."
    : `This was ${regimeWord[regime]}. ${
        returnPct >= 0
          ? `You finished ${pct(returnPct)} vs ${pct(buyHoldPct)} buy & hold.`
          : `You finished ${pct(returnPct)} (buy & hold: ${pct(buyHoldPct)}).`
      }`;

  return { headline, regime, daysPlayed, exposurePct, winRate, longBias, insights };
}
