"use client";

import { INITIAL_BARS, MAX_FUTURE } from "@/lib/data";
import { fmtPrice, fmtVolume } from "@/lib/format";
import { useGame } from "@/store/gameStore";

// Compact OHLCV strip above the chart (chartgame-style), for the current bar.
export default function OhlcHeader() {
  const round = useGame((s) => s.round);
  const revealed = useGame((s) => s.revealed);
  if (!round) return null;
  const c = round.candles[revealed - 1];
  const up = c.close >= c.open;
  const day = Math.max(0, revealed - INITIAL_BARS);

  const Field = ({ k, v, tone }: { k: string; v: string; tone?: string }) => (
    <span className="text-muted">
      {k} <span className={`font-mono ${tone ?? "text-fg"}`}>{v}</span>
    </span>
  );

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-xs">
      <span className="font-semibold">
        Day {day} <span className="text-muted">/ {MAX_FUTURE}</span>
      </span>
      <Field k="O" v={fmtPrice(c.open)} />
      <Field k="H" v={fmtPrice(c.high)} />
      <Field k="L" v={fmtPrice(c.low)} />
      <Field k="C" v={fmtPrice(c.close)} tone={up ? "text-up" : "text-down"} />
      <Field k="Vol" v={fmtVolume(c.volume)} />
    </div>
  );
}
