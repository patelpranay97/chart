"use client";

import { useMemo } from "react";
import ProfitChart from "./ProfitChart";
import { debrief, type InsightTone, type Regime } from "@/lib/coach";
import { fmtPct, fmtSignedUSD, fmtUSD, fmtUSDCompact } from "@/lib/format";
import { canTakeLoan, loanAmount } from "@/lib/lifetime";
import { ratePerformance } from "@/lib/rating";
import { useGame, useLifetimeStats } from "@/store/gameStore";

const REGIME_LABEL: Record<Regime, string> = {
  bull: "Up-trend",
  bear: "Down-trend",
  chop: "Sideways",
};
const TONE_CLS: Record<InsightTone, string> = {
  good: "bg-up/15 text-up",
  warn: "bg-down/15 text-down",
  info: "bg-panel-2 text-muted",
};
const TONE_ICON: Record<InsightTone, string> = { good: "✓", warn: "!", info: "i" };

export default function EndGameScreen() {
  const result = useGame((s) => s.result);
  const trades = useGame((s) => s.trades);
  const round = useGame((s) => s.round);
  const revealed = useGame((s) => s.revealed);
  const startGame = useGame((s) => s.startGame);
  const toSetup = useGame((s) => s.toSetup);
  const stats = useLifetimeStats();
  const startingCapital = useGame((s) => s.startingCapital);
  const addLoan = useGame((s) => s.addLoan);

  const coach = useMemo(() => {
    if (!round || !result) return null;
    return debrief({
      candles: round.candles,
      initialBars: round.initialBars,
      revealed,
      trades,
      returnPct: result.returnPct,
      buyHoldPct: result.buyHoldPct,
      liquidated: result.liquidated,
    });
  }, [round, revealed, trades, result]);

  if (!result) return null;

  const rating = ratePerformance(result.returnPct);
  const label = result.liquidated ? "Liquidated" : rating.label;
  const blurb = result.liquidated
    ? "Your position blew through your cash — forced exit."
    : rating.blurb;
  const win = !result.liquidated && result.profit >= 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10">
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">
          Game over
        </div>
        <h1 className={`mt-1 text-3xl font-bold ${win ? "text-up" : "text-down"}`}>
          {label}
        </h1>
        <p className="mt-1 text-muted">{blurb}</p>
      </div>

      {/* Reveal card */}
      <div className="rounded-xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">Symbol</div>
            <div className="font-mono text-2xl font-bold">{result.symbol}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-muted">Period</div>
            <div className="font-mono text-sm">
              {result.startDate} → {result.endDate}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-panel-2 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Profit</div>
            <div className={`font-mono text-lg font-bold ${win ? "text-up" : "text-down"}`}>
              {fmtSignedUSD(result.profit)}
            </div>
          </div>
          <div className="rounded-lg bg-panel-2 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Return</div>
            <div className={`font-mono text-lg font-bold ${win ? "text-up" : "text-down"}`}>
              {fmtPct(result.returnPct)}
            </div>
          </div>
          <div className="rounded-lg bg-panel-2 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Buy &amp; Hold</div>
            <div className="font-mono text-lg font-bold">{fmtPct(result.buyHoldPct)}</div>
          </div>
        </div>

        <div className="mt-3 text-center text-sm text-muted">
          {result.trades} trade{result.trades === 1 ? "" : "s"} this round
        </div>
      </div>

      {/* Coaching debrief */}
      {coach && (
        <div className="rounded-xl border border-line bg-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Debrief</h2>
            <div className="flex gap-4 text-[11px] text-muted">
              <span>
                Market <span className="font-semibold text-fg">{REGIME_LABEL[coach.regime]}</span>
              </span>
              <span>
                In market{" "}
                <span className="font-semibold text-fg">{Math.round(coach.exposurePct * 100)}%</span>
              </span>
              {trades.length > 0 && (
                <span>
                  Win rate{" "}
                  <span className="font-semibold text-fg">{Math.round(coach.winRate * 100)}%</span>
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm">{coach.headline}</p>
          {coach.insights.length > 0 && (
            <div className="mt-3 flex flex-col divide-y divide-line">
              {coach.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${TONE_CLS[ins.tone]}`}
                  >
                    {TONE_ICON[ins.tone]}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{ins.title}</div>
                    <div className="text-xs text-muted">{ins.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cumulative profit */}
      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-2 text-sm font-semibold text-muted">Cumulative profit per trade</h2>
        <ProfitChart trades={trades} />
      </div>

      {/* Account after this game */}
      <div className="flex items-center justify-between rounded-xl border border-line bg-panel px-5 py-4">
        <div className="flex gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">Net worth</div>
            <div className="font-mono text-lg font-bold">{fmtUSD(stats.netWorth)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">Cash</div>
            <div className="font-mono text-lg font-bold">{fmtUSD(stats.cash)}</div>
          </div>
        </div>
        {canTakeLoan(stats, startingCapital) && (
          <button
            onClick={addLoan}
            className="rounded-lg bg-down px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Borrow {fmtUSDCompact(loanAmount(startingCapital))}
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => toSetup()}
          className="flex-1 rounded-lg border border-line bg-panel py-3 text-sm font-semibold transition hover:border-accent"
        >
          Home
        </button>
        <button
          onClick={() => startGame()}
          className="flex-[2] rounded-lg bg-accent py-3 text-sm font-semibold text-accent-fg transition hover:opacity-90"
        >
          Play Another
        </button>
      </div>
    </div>
  );
}
