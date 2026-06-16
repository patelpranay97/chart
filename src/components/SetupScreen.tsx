"use client";

import { useState } from "react";
import { fmtPct, fmtSignedUSD, fmtUSD, fmtUSDCompact } from "@/lib/format";
import {
  canTakeLoan,
  clampStartingCapital,
  loanAmount,
  loanThreshold,
  STARTING_CAPITAL_PRESETS,
} from "@/lib/lifetime";
import { useGame, useLifetimeStats } from "@/store/gameStore";

const LEVERAGE_PRESETS = [1, 2, 3, 5];

// Clean labels for the capital presets: $10k, $50k, $100k, $1M.
const capitalLabel = (n: number) =>
  n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${Math.round(n / 1_000)}k`;

function NetWorthBadge({ netWorth, base }: { netWorth: number; base: number }) {
  const pct = ((netWorth - base) / base) * 100;
  const up = netWorth >= base;
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
  const startingCapital = useGame((s) => s.startingCapital);
  const setStartingCapital = useGame((s) => s.setStartingCapital);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingCapital, setPendingCapital] = useState<number | null>(null);
  const [customCapital, setCustomCapital] = useState("");

  const recent = lifetime
    .filter((e) => e.kind === "game")
    .slice(-6)
    .reverse();
  const loanable = canTakeLoan(stats, startingCapital);
  const hasHistory = lifetime.length > 0;

  // Selecting a new size resets the account; confirm first if there's history.
  const requestCapital = (value: number) => {
    const v = clampStartingCapital(value);
    if (v === startingCapital) return;
    if (hasHistory) {
      setPendingCapital(v);
    } else {
      setStartingCapital(v);
      setCustomCapital("");
    }
  };
  const confirmCapital = () => {
    if (pendingCapital != null) setStartingCapital(pendingCapital);
    setPendingCapital(null);
    setCustomCapital("");
  };
  const customNum = Number(customCapital);
  const customValid = customCapital.trim() !== "" && Number.isFinite(customNum) && customNum > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">ETF Practice</h1>
        <p className="mt-1 text-muted">
          Opens to a random day in one of 14 ETFs — equity, sectors, gold, oil,
          bonds, emerging markets — symbol and date hidden, for up to 100 trading
          days. Some chop, some trend, some grind down for years. Read it right
          and book the profit.
        </p>
      </div>

      {/* Account summary */}
      <div className="rounded-xl border border-line bg-panel p-5">
        <div className="flex items-start justify-between">
          <NetWorthBadge netWorth={stats.netWorth} base={startingCapital} />
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

      {/* Starting net worth — match your real portfolio size */}
      <div className="rounded-xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-muted">Starting net worth</label>
          <span className="font-mono text-sm font-semibold">{fmtUSDCompact(startingCapital)}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Set this to your real portfolio size so position sizing and P/L feel true to life.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTING_CAPITAL_PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => requestCapital(v)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                startingCapital === v
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line bg-panel-2 text-fg hover:border-accent"
              }`}
            >
              {capitalLabel(v)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1000}
            value={customCapital}
            onChange={(e) => setCustomCapital(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customValid) requestCapital(customNum);
            }}
            placeholder="Custom amount, e.g. 30000"
            className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => customValid && requestCapital(customNum)}
            disabled={!customValid}
            className="shrink-0 rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm font-medium text-fg transition hover:border-accent disabled:opacity-40"
          >
            Set
          </button>
        </div>
        {pendingCapital != null && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-down/40 bg-down/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted">
              Set starting net worth to{" "}
              <span className="font-semibold text-fg">{fmtUSDCompact(pendingCapital)}</span>? This
              starts a fresh account and clears your {stats.gamesPlayed} game
              {stats.gamesPlayed === 1 ? "" : "s"}.
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={confirmCapital}
                className="rounded-md bg-down px-3 py-1.5 font-semibold text-white"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setPendingCapital(null);
                  setCustomCapital("");
                }}
                className="rounded-md border border-line px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loan prompt */}
      {loanable && (
        <div className="flex items-center justify-between rounded-xl border border-down/40 bg-down/5 p-4">
          <div>
            <div className="font-semibold text-down">Cash is low</div>
            <div className="text-xs text-muted">
              You can borrow {fmtUSDCompact(loanAmount(startingCapital))} to keep trading
              (≤ {fmtUSDCompact(loanThreshold(startingCapital))} cash). Loans aren&apos;t repaid and
              weigh on net worth until they age out.
            </div>
          </div>
          <button
            onClick={addLoan}
            className="shrink-0 rounded-lg bg-down px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Borrow {fmtUSDCompact(loanAmount(startingCapital))}
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
          {loading ? "Dealing a chart…" : "Start Practice"}
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
            <span className="text-muted">Reset account to {fmtUSDCompact(startingCapital)}?</span>
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
