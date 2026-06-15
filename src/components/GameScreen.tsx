"use client";

import { useState } from "react";
import Chart from "./Chart";
import ControlPanel from "./ControlPanel";
import IndicatorsTab from "./IndicatorsTab";
import PositionPanel from "./PositionPanel";
import StatsPanel from "./StatsPanel";
import TradesTab from "./TradesTab";
import { useGame } from "@/store/gameStore";

type Tab = "indicators" | "trades";

export default function GameScreen() {
  const [tab, setTab] = useState<Tab>("indicators");
  const tradeCount = useGame((s) => s.trades.length);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Chart */}
      <div className="min-h-0 flex-1 p-2">
        <div className="h-[55vh] overflow-hidden rounded-xl border border-line bg-panel p-2 lg:h-full">
          <Chart />
        </div>
      </div>

      {/* Control panel */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-line p-3 lg:w-[380px] lg:border-l lg:border-t-0">
        <ControlPanel />
        <PositionPanel />
        <StatsPanel />

        <div className="rounded-xl border border-line bg-panel">
          <div className="flex border-b border-line">
            <button
              onClick={() => setTab("indicators")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                tab === "indicators"
                  ? "border-b-2 border-accent text-fg"
                  : "text-muted hover:text-fg"
              }`}
            >
              Indicators
            </button>
            <button
              onClick={() => setTab("trades")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                tab === "trades"
                  ? "border-b-2 border-accent text-fg"
                  : "text-muted hover:text-fg"
              }`}
            >
              Trades{tradeCount > 0 ? ` (${tradeCount})` : ""}
            </button>
          </div>
          <div className="p-3">
            {tab === "indicators" ? <IndicatorsTab /> : <TradesTab />}
          </div>
        </div>
      </aside>
    </div>
  );
}
