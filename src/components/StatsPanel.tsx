"use client";

import { fmtPct, fmtSignedUSD, fmtUSD, fmtUSDCompact } from "@/lib/format";
import { useDerived, useGame } from "@/store/gameStore";

function Stat({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "up" | "down";
  sub?: string;
}) {
  const color =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-fg";
  return (
    <div className="flex flex-col rounded-lg bg-panel-2 px-3 py-2">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`font-mono text-sm font-semibold ${color}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

export default function StatsPanel() {
  const stats = useDerived();
  const cash = useGame((s) => s.cash);
  const realizedPnL = useGame((s) => s.realizedPnL);
  const leverage = useGame((s) => s.config.leverage);
  const startingCash = useGame((s) => s.startingCash);
  if (!stats) return null;

  const tone = (n: number): "up" | "down" | "neutral" =>
    n > 0 ? "up" : n < 0 ? "down" : "neutral";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Stat
        label="Account Value"
        value={fmtUSD(stats.equity, { cents: true })}
        tone={tone(stats.equity - startingCash)}
      />
      <Stat label="Cash" value={fmtUSD(cash, { cents: true })} />
      <Stat label="Buying Power" value={fmtUSDCompact(stats.buyingPower)} sub={`${leverage}× leverage`} />
      <Stat label="Margin Used" value={fmtUSDCompact(stats.borrowed)} tone={stats.borrowed > 0 ? "down" : "neutral"} />
      <Stat
        label="Realized P/L"
        value={fmtSignedUSD(realizedPnL)}
        tone={tone(realizedPnL)}
        sub={fmtPct(stats.realizedPct)}
      />
      <Stat
        label="Buy & Hold"
        value={fmtPct(stats.buyHoldPct)}
        tone={tone(stats.buyHoldPct)}
        sub="from bar 1"
      />
    </div>
  );
}
