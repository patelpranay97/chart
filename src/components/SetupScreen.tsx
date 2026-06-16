"use client";

import { useState } from "react";
import { fmtPct, fmtSignedUSD, fmtUSD, fmtUSDCompact } from "@/lib/format";
import { canTakeLoan, LOAN_THRESHOLD, STARTING_CAPITAL } from "@/lib/lifetime";
import { useGame, useLifetimeStats } from "@/store/gameStore";

const LEVERAGE_PRESETS = [1, 2, 3, 5];

function NetWorthBadge({ netWorth }: { netWorth: number }) {
  const pct = ((netWorth - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;
  const up = netWorth >= STARTING_CAPITAL;
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted">Net worth</span>
      <span className={`font-mono text-3xl font-bold ${up ? "text-up" : "text-down"}`}>
        {fmtUSD(netWorth)}
      </span>
      <span className={`text-xs ${up ? "text-up" : "text-down"}`}>
        {fmtPct(pct)} lifetime
      </span>
    </div>
  );
}

export default function SetupScreen() {
  const config = useGame((s) => s.config);
  const setConfig = useGame((s) => s.setConfig);
  const startGame = useGame((s) => s.startGame);
  const loading = useGame((s) => s.loading);
  const lifetime = useGame((s) => s.lifetime);
  const stats = useLifetimeStats();
  const addLoan = useGame((s) => s.addLoan);
  const resetAccount = useGame((s) => s.resetAccount);
  const [confirmReset, setConfirmReset] = useState(false);

  const recent = lifetime
    .filter((e) => e.kind === "game")
    .slice(-6)
    .reverse();
  const loanable = canTakeLoan(stats);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Swing Trader</h1>
        <p className="mt-1 text-muted">
          Opens to a random day in SPY, QQQ or VOO history — symbol and date
          hidden — for up to 100 trading days. Some markets chop, some trend up,
          some fall. Read it right and book the profit.
        </p>
      </div>

      {/* Account summary */}
      <div className="rounded-xl border border-line bg-panel p-5">
        <div className="flex items-start justify-between">
          <NetWorthBadge netWorth={stats.netWorth} />
          <div className="grid grid-cols-2 gap-3 text-right">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">Cash</div>
              <div className="font-mono text-sm font-semibold">{fmtUSD(stats.cash)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">Loans</div>
              <div className={`font-mono text-sm font-semibold ${stats.loans > 0 ? "text-down" : ""}`}>
                {fmtUSD(stats.loans)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">Games</div>
              <div className="font-mono text-sm font-semibold">{stats.gamesPlayed}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loan prompt */}
      {loanable && (
        <div className="flex items-center justify-between rounded-xl border border-down/40 bg-down/5 p-4">
          <div>
            <div className="font-semibold text-down">Cash is low</div>
            <div className="text-xs text-muted">
              You can borrow $100k to keep trading (≤ {fmtUSDCompact(LOAN_THRESHOLD)} cash).
              Loans aren&apos;t repaid and weigh on net worth until they age out.
            </div>
          </div>
          <button
            onClick={addLoan}
            className="shrink-0 rounded-lg bg-down px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Borrow $100k
          </button>
        </div>
      )}

      {/* Leverage + start */}
      <div className="rounded-xl border border-line bg-panel p-5">
        <label className="block text-sm font-semibold text-muted">Leverage (margin)</label>
        <div className="mt-2 flex gap-2">
          {LEVERAGE_PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => setConfig({ leverage: v })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                config.leverage === v
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line bg-panel-2 text-fg hover:border-accent"
              }`}
            >
              {v}×
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Buying power ={" "}
          <span className="font-semibold text-fg">
            {fmtUSDCompact(Math.max(0, stats.cash) * config.leverage)}
          </span>
        </p>

        <button
          onClick={() => startGame()}
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-accent py-3 text-base font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Dealing a chart…" : "Play SwingTrader"}
        </button>
      </div>

      {/* Recent games */}
      {recent.length > 0 && (
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold text-muted">Recent games</h2>
          <div className="mt-3 flex flex-col divide-y divide-line">
            {recent.map((g, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">{g.kind === "game" ? g.symbol : ""}</span>
                  <span className="text-xs text-muted">
                    {g.kind === "game" && `${g.startDate} → ${g.endDate}`}
                  </span>
                  {g.kind === "game" && g.skipped && (
                    <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] uppercase text-muted">
                      skipped
                    </span>
                  )}
                </div>
                {g.kind === "game" && !g.skipped && (
                  <span className={g.profit >= 0 ? "text-up" : "text-down"}>
                    {fmtSignedUSD(g.profit)}{" "}
                    <span className="text-xs opacity-70">{fmtPct(g.returnPct)}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <div className="text-center">
        {confirmReset ? (
          <div className="inline-flex items-center gap-2 text-sm">
            <span className="text-muted">Reset account to {fmtUSDCompact(STARTING_CAPITAL)}?</span>
            <button
              onClick={() => {
                resetAccount();
                setConfirmReset(false);
              }}
              className="rounded-md bg-down px-3 py-1 font-semibold text-white"
            >
              Reset
            </button>
            <button onClick={() => setConfirmReset(false)} className="rounded-md border border-line px-3 py-1">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="text-xs text-muted underline-offset-2 hover:underline"
          >
            Reset account
          </button>
        )}
      </div>
    </div>
  );
}
