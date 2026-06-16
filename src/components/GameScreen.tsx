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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
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

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Chart + OHLC header — capped height so candles + volume sit in one view */}
      <div className="flex min-h-0 flex-col p-2 lg:flex-1 lg:self-start">
        <OhlcHeader />
        <div className="h-[42vh] overflow-hidden rounded-xl border border-line bg-panel p-1 lg:h-[60vh]">
          <Chart />
        </div>
      </div>

      {/* Right panel — chartgame-style stack */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-line p-3 lg:w-[440px] lg:border-l lg:border-t-0">
        {/* Mode toggle + End Game */}
        <div className="flex items-center justify-between">
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

        <Section title="Position">
          <PositionPanel />
        </Section>

        <Section title="Orders">
          <ControlPanel />
        </Section>

        {/* Trades / Indicators */}
        <div className="rounded-xl border border-line bg-panel">
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

        <Section title="Statistics">
          <StatsPanel />
        </Section>
      </aside>
    </div>
  );
}
