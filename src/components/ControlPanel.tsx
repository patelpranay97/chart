"use client";

import AdvancedOrder from "./AdvancedOrder";
import { fmtPrice, fmtShares } from "@/lib/format";
import { INITIAL_BARS, MAX_FUTURE } from "@/lib/data";
import { derive, useGame } from "@/store/gameStore";

const SIZE_OPTIONS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "Max", value: 1 },
];

export default function ControlPanel() {
  const stats = useGame(derive);
  const position = useGame((s) => s.position);
  const sizePct = useGame((s) => s.sizePct);
  const revealed = useGame((s) => s.revealed);
  const tradeCount = useGame((s) => s.trades.length);
  const nextBar = useGame((s) => s.nextBar);
  const enter = useGame((s) => s.enter);
  const closePosition = useGame((s) => s.closePosition);
  const endGame = useGame((s) => s.endGame);
  const skipGame = useGame((s) => s.skipGame);
  const setSizePct = useGame((s) => s.setSizePct);
  const advanced = useGame((s) => s.advanced);
  const setAdvanced = useGame((s) => s.setAdvanced);
  const advanceOnTrade = useGame((s) => s.advanceOnTrade);
  if (!stats) return null;

  const canSkip = !position && tradeCount === 0;

  // Reveal the next day after a trade actually fills (chartgame-style loop).
  const afterTrade = (filled: boolean) => {
    if (filled && advanceOnTrade) nextBar();
  };

  const barsAdvanced = revealed - INITIAL_BARS;
  const futureLeft = MAX_FUTURE - barsAdvanced;
  const projectedShares = Math.floor((sizePct * stats.buyingPower) / stats.price);

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg bg-panel-2 p-1">
        {[
          { label: "Simple", value: false },
          { label: "Advanced", value: true },
        ].map((m) => (
          <button
            key={m.label}
            onClick={() => setAdvanced(m.value)}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              advanced === m.value ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Bar progress + price */}
      <div className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-muted">Last close</span>
          <span className="font-mono text-lg font-bold">{fmtPrice(stats.price)}</span>
        </div>
        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wide text-muted">Bars left</span>
          <div className="font-mono text-lg font-bold">{Math.max(0, futureLeft)}</div>
        </div>
      </div>

      {/* Advance */}
      <button
        onClick={nextBar}
        disabled={stats.atEnd}
        className="w-full rounded-lg border border-line bg-panel-2 py-3 text-sm font-semibold transition hover:border-accent disabled:opacity-40"
      >
        {stats.atEnd ? "No more bars — end the game" : "Next Bar ▶"}
      </button>

      {advanced ? (
        <AdvancedOrder />
      ) : (
        <>
          {/* Position size */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
              <span>Order size</span>
              <span className="normal-case">≈ {fmtShares(projectedShares)} sh</span>
            </div>
            <div className="flex gap-1">
              {SIZE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setSizePct(o.value)}
                  className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition ${
                    sizePct === o.value
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-line bg-panel-2 hover:border-accent"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trade actions */}
          {!position ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => afterTrade(enter(1))}
                className="rounded-lg bg-up py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Long
              </button>
              <button
                onClick={() => afterTrade(enter(-1))}
                className="rounded-lg bg-down py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Short
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => afterTrade(enter(position.dir))}
                className="rounded-lg border border-line bg-panel-2 py-3 text-sm font-bold transition hover:border-accent"
              >
                Add {position.dir === 1 ? "Long" : "Short"}
              </button>
              <button
                onClick={() => afterTrade(closePosition())}
                className={`rounded-lg py-3 text-sm font-bold text-white transition hover:opacity-90 ${
                  position.dir === 1 ? "bg-down" : "bg-up"
                }`}
              >
                {position.dir === 1 ? "Sell" : "Cover"}
              </button>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => canSkip && skipGame()}
          disabled={!canSkip}
          title={canSkip ? "Deal a new chart (still costs 90 days)" : "Can't skip after trading this chart"}
          className="rounded-lg border border-line py-2.5 text-sm font-semibold transition hover:border-accent disabled:opacity-40"
        >
          Skip ⟳
        </button>
        <button
          onClick={endGame}
          className="rounded-lg border border-down/50 py-2.5 text-sm font-semibold text-down transition hover:bg-down/10"
        >
          End Game
        </button>
      </div>
    </div>
  );
}
