"use client";

import { useState } from "react";
import { fmtPct, fmtSignedUSD, fmtUSDCompact } from "@/lib/format";
import { useGame } from "@/store/gameStore";

const CASH_PRESETS = [10_000, 25_000, 100_000, 458_590, 1_000_000];
const LEVERAGE_PRESETS = [1, 2, 3, 5];

export default function SetupScreen() {
  const config = useGame((s) => s.config);
  const setConfig = useGame((s) => s.setConfig);
  const startGame = useGame((s) => s.startGame);
  const loading = useGame((s) => s.loading);
  const history = useGame((s) => s.history);
  const [custom, setCustom] = useState("");

  const setCash = (v: number) => {
    if (v >= 1000) setConfig({ startingCash: Math.round(v) });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Read the chart. Trade the tape.
        </h1>
        <p className="mt-2 text-muted">
          A random historical window of SPY, QQQ or VOO — symbol and date hidden.
          Reveal it one bar at a time, go long or short, and beat buy &amp; hold.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <label className="text-sm font-semibold text-muted">Starting account</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CASH_PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => {
                setCash(v);
                setCustom("");
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                config.startingCash === v
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line bg-panel-2 text-fg hover:border-accent"
              }`}
            >
              {fmtUSDCompact(v)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-muted">$</span>
          <input
            type="number"
            placeholder="Custom amount"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setCash(n);
            }}
            className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <label className="mt-5 block text-sm font-semibold text-muted">
          Leverage (margin)
        </label>
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
          Buying power = account × leverage ={" "}
          <span className="font-semibold text-fg">
            {fmtUSDCompact(config.startingCash * config.leverage)}
          </span>
        </p>

        <button
          onClick={() => startGame()}
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-accent py-3 text-base font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Dealing a chart…" : "Start Game"}
        </button>
      </div>

      {history.length > 0 && (
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold text-muted">Recent games</h2>
          <div className="mt-3 flex flex-col divide-y divide-line">
            {history.slice(0, 6).map((g, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">{g.symbol}</span>
                  <span className="text-xs text-muted">
                    {g.startDate} → {g.endDate}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={g.profit >= 0 ? "text-up" : "text-down"}>
                    {fmtSignedUSD(g.profit)}
                  </span>
                  <span
                    className={`w-16 text-right text-xs ${
                      g.returnPct >= g.buyHoldPct ? "text-up" : "text-muted"
                    }`}
                  >
                    {fmtPct(g.returnPct)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
