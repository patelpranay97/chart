"use client";

import type { IndicatorSettings } from "@/lib/types";
import { useGame } from "@/store/gameStore";

function Toggle({
  checked,
  onChange,
  label,
  swatch,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  swatch?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        {swatch && (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: swatch }}
          />
        )}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}

function PeriodInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      min={1}
      value={value}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n) && n >= 1) onChange(n);
      }}
      className="w-16 rounded-md border border-line bg-panel-2 px-2 py-1 text-right text-sm outline-none focus:border-accent"
    />
  );
}

export default function IndicatorsTab() {
  const ind = useGame((s) => s.indicators);
  const set = useGame((s) => s.setIndicators);
  const candleType = useGame((s) => s.candleType);
  const setCandleType = useGame((s) => s.setCandleType);
  const advanceOnTrade = useGame((s) => s.advanceOnTrade);
  const setAdvanceOnTrade = useGame((s) => s.setAdvanceOnTrade);
  const patch = (p: Partial<IndicatorSettings>) => set(p);

  return (
    <div className="flex flex-col divide-y divide-line">
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm">Candle type</span>
        <div className="flex gap-1">
          {(["heikin", "regular"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setCandleType(t)}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                candleType === t
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line hover:border-accent"
              }`}
            >
              {t === "heikin" ? "Heikin-Ashi" : "Regular"}
            </button>
          ))}
        </div>
      </div>
      <Toggle
        checked={advanceOnTrade}
        onChange={setAdvanceOnTrade}
        label="Reveal next day on trade"
      />
      <Toggle checked={ind.flags} onChange={(v) => patch({ flags: v })} label="Entry / exit flags" />
      <Toggle checked={ind.orderLine} onChange={(v) => patch({ orderLine: v })} label="Cost-basis line" />
      <Toggle checked={ind.tradeLines} onChange={(v) => patch({ tradeLines: v })} label="Trade lines" />
      <Toggle checked={ind.sma} onChange={(v) => patch({ sma: v })} label="SMA" swatch="#f5a623">
        <PeriodInput value={ind.smaPeriod} onChange={(n) => patch({ smaPeriod: n })} />
      </Toggle>
      <Toggle checked={ind.sma2} onChange={(v) => patch({ sma2: v })} label="SMA 2" swatch="#a855f7">
        <PeriodInput value={ind.sma2Period} onChange={(n) => patch({ sma2Period: n })} />
      </Toggle>
      <Toggle checked={ind.ema} onChange={(v) => patch({ ema: v })} label="EMA" swatch="#3b82f6">
        <PeriodInput value={ind.emaPeriod} onChange={(n) => patch({ emaPeriod: n })} />
      </Toggle>
      <Toggle checked={ind.vwap} onChange={(v) => patch({ vwap: v })} label="VWAP (anchored)" swatch="#ec4899" />
      <p className="pt-3 text-xs text-muted">
        MACD, ATR, CCI &amp; Stochastic sub-panes coming soon.
      </p>
    </div>
  );
}
