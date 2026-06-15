"use client";

import ProfitChart from "./ProfitChart";
import { fmtPct, fmtSignedUSD } from "@/lib/format";
import { ratePerformance } from "@/lib/rating";
import { useGame } from "@/store/gameStore";

export default function EndGameScreen() {
  const result = useGame((s) => s.result);
  const trades = useGame((s) => s.trades);
  const startGame = useGame((s) => s.startGame);
  const toSetup = useGame((s) => s.toSetup);
  if (!result) return null;

  const rating = ratePerformance(result.returnPct, result.returnPct - result.buyHoldPct);
  const win = result.profit >= 0;
  const beatHold = result.returnPct >= result.buyHoldPct;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10">
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">
          Game over
        </div>
        <h1 className={`mt-1 text-3xl font-bold ${win ? "text-up" : "text-down"}`}>
          {rating.label}
        </h1>
        <p className="mt-1 text-muted">{rating.blurb}</p>
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

        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              beatHold ? "bg-up/15 text-up" : "bg-down/15 text-down"
            }`}
          >
            {beatHold ? "Beat buy & hold" : "Lagged buy & hold"} by{" "}
            {fmtPct(result.returnPct - result.buyHoldPct)}
          </span>
          <span className="text-muted">· {result.trades} trade{result.trades === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Cumulative profit */}
      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-2 text-sm font-semibold text-muted">Cumulative profit per trade</h2>
        <ProfitChart trades={trades} />
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
