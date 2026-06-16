"use client";

import { useState } from "react";
import Chart from "./Chart";
import ControlPanel from "./ControlPanel";
import IndicatorsTab from "./IndicatorsTab";
import OhlcHeader from "./OhlcHeader";
import PositionPanel from "./PositionPanel";
import StatsPanel from "./StatsPanel";
import TradesTab from "./TradesTab";
import { useGame } from "@/store/gameStore";

type Tab = "trades" | "indicators";

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-panel ${className}`}>
      <div className="border-b border-line bg-panel-2 px-4 py-2 text-sm font-semibold">{title}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export default function GameScreen() {
  const [tab, setTab] = useState<Tab>("trades");
  const tradeCount = useGame((s) => s.trades.length);
  const advanced = useGame((s) => s.advanced);
  const setAdvanced = useGame((s) => s.setAdvanced);
  const endGame = useGame((s) => s.endGame);

  const tabCls = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium transition ${
      active ? "border-b-2 border-accent text-fg" : "text-muted hover:text-fg"
    }`;

  const modeToggleAndEnd = (
    <div className="order-2 flex items-center justify-between lg:order-1">
      <div className="flex gap-1 rounded-lg bg-panel-2 p-1">
        {[
          { label: "Simple", value: false },
          { label: "Advanced", value: true },
        ].map((m) => (
          <button
            key={m.label}
            onClick={() => setAdvanced(m.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              advanced === m.value ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => endGame()}
        className="rounded-lg border border-down/50 px-4 py-2 text-sm font-semibold text-down transition hover:bg-down/10"
      >
        ◉ End Game
      </button>
    </div>
  );

  return (
    // Mobile: a single scrolling column (chart + orders first, everything else
    // below the fold). Desktop: two columns, chart fills the left height.
    <div className="flex min-h-0 flex-col lg:h-full lg:flex-row">
      {/* Chart + OHLC header (+ stats on desktop). On mobile the chart keeps a
          real height; on desktop it flexes to fill. */}
      <div className="flex min-h-0 flex-col gap-2 p-2 lg:flex-1">
        <OhlcHeader />
        <div className="h-[48vh] max-lg:shrink-0 overflow-hidden rounded-xl border border-line bg-panel p-1 lg:h-auto lg:min-h-0 lg:flex-1">
          <Chart />
        </div>
        {/* Stats sit under the chart on desktop; on mobile they move down-page. */}
        <Section title="Statistics" className="hidden lg:block">
          <StatsPanel />
        </Section>
      </div>

      {/* Right panel on desktop / the scroll-down stack on mobile. Order is set
          per-breakpoint so mobile leads with Orders, desktop with the toggle. */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-line p-3 lg:w-[440px] lg:border-l lg:border-t-0">
        {modeToggleAndEnd}

        <Section title="Position" className="order-3 lg:order-2">
          <PositionPanel />
        </Section>

        <Section title="Orders" className="order-1 lg:order-3">
          <ControlPanel />
        </Section>

        {/* Statistics — mobile only (desktop shows it under the chart). */}
        <Section title="Statistics" className="order-4 lg:hidden">
          <StatsPanel />
        </Section>

        {/* Trades / Indicators */}
        <div className="order-5 rounded-xl border border-line bg-panel lg:order-4">
          <div className="flex border-b border-line">
            <button onClick={() => setTab("trades")} className={tabCls(tab === "trades")}>
              Trades{tradeCount > 0 ? ` (${tradeCount})` : ""}
            </button>
            <button onClick={() => setTab("indicators")} className={tabCls(tab === "indicators")}>
              Indicators
            </button>
          </div>
          <div className="p-3">{tab === "trades" ? <TradesTab /> : <IndicatorsTab />}</div>
        </div>
      </aside>
    </div>
  );
}
