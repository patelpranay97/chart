"use client";

import AdvancedOrder from "./AdvancedOrder";
import { INITIAL_BARS, MAX_FUTURE } from "@/lib/data";
import { fmtPrice, fmtShares } from "@/lib/format";
import { useDerived, useGame } from "@/store/gameStore";

const SIZE_OPTIONS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "Max", value: 1 },
];

export default function ControlPanel() {
  const stats = useDerived();
  const position = useGame((s) => s.position);
  const sizePct = useGame((s) => s.sizePct);
  const revealed = useGame((s) => s.revealed);
  const advanced = useGame((s) => s.advanced);
  const advanceOnTrade = useGame((s) => s.advanceOnTrade);
  const nextBar = useGame((s) => s.nextBar);
  const enter = useGame((s) => s.enter);
  const closePosition = useGame((s) => s.closePosition);
  const setSizePct = useGame((s) => s.setSizePct);
  if (!stats) return null;

  // Reveal the next day after a trade actually fills.
  const afterTrade = (filled: boolean) => {
    if (filled && advanceOnTrade) nextBar();
  };

  const futureLeft = MAX_FUTURE - (revealed - INITIAL_BARS);
  const projectedShares = Math.floor((sizePct * stats.buyingPower) / stats.price);

  const nextLabel = stats.atEnd ? "Finish ▶" : "Next Day ▶";
  const nextBtn = (
    <button
      onClick={nextBar}
      className="rounded-lg border border-line bg-panel-2 py-3 text-sm font-semibold transition hover:border-accent"
    >
      {nextLabel}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* price + days left */}
      <div className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-muted">Last close</span>
          <span className="font-mono text-lg font-bold">{fmtPrice(stats.price)}</span>
        </div>
        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wide text-muted">Days left</span>
          <div className="font-mono text-lg font-bold">{Math.max(0, futureLeft)}</div>
        </div>
      </div>

      {advanced ? (
        <>
          {nextBtn}
          <AdvancedOrder />
        </>
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

          {/* Next Day + trade actions */}
          {!position ? (
            <div className="grid grid-cols-3 gap-2">
              {nextBtn}
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
            <div className="grid grid-cols-3 gap-2">
              {nextBtn}
              <button
                onClick={() => afterTrade(enter(position.dir))}
                className="rounded-lg border border-line bg-panel-2 py-3 text-sm font-bold transition hover:border-accent"
              >
                Add
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
    </div>
  );
}
