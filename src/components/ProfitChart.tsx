"use client";

import { useMemo } from "react";
import type { Trade } from "@/lib/types";
import { fmtSignedUSD } from "@/lib/format";

// A small dependency-free SVG line chart of cumulative profit per trade.
export default function ProfitChart({ trades }: { trades: Trade[] }) {
  const points = useMemo(() => {
    const cum: number[] = [0];
    let total = 0;
    for (const t of trades) {
      total += t.pnl;
      cum.push(total);
    }
    return cum;
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="grid h-40 place-items-center text-sm text-muted">
        No trades to chart — you sat this one out.
      </div>
    );
  }

  const W = 520;
  const H = 180;
  const PAD = { l: 8, r: 8, t: 12, b: 18 };
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const span = max - min || 1;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const x = (i: number) => PAD.l + (points.length === 1 ? 0 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - ((v - min) / span) * innerH;
  const zeroY = y(0);

  const linePath = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`;
  const final = points[points.length - 1];
  const up = final >= 0;
  const stroke = up ? "var(--up)" : "var(--down)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative profit per trade">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* zero baseline */}
      <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY} stroke="var(--line)" strokeDasharray="3 3" />
      <path d={areaPath} fill="url(#pg)" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === points.length - 1 ? 3.5 : 2} fill={stroke} />
      ))}
      <text x={W - PAD.r} y={PAD.t} textAnchor="end" className="fill-[var(--fg)] font-mono text-[11px]">
        {fmtSignedUSD(final)}
      </text>
    </svg>
  );
}
