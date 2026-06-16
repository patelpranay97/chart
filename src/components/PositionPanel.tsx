"use client";

import { fmtPrice, fmtShares, fmtSignedUSD } from "@/lib/format";
import { useDerived, useGame } from "@/store/gameStore";

export default function PositionPanel() {
  const position = useGame((s) => s.position);
  const orders = useGame((s) => s.orders);
  const stats = useDerived();
  if (!stats) return null;

  // A protective stop for the open position is an opposite-side stop order.
  const protectiveStop = position
    ? orders
        .filter((o) => o.kind === "stop" && o.side === (position.dir === 1 ? "sell" : "buy"))
        .map((o) => o.price)
        .sort((a, b) => (position.dir === 1 ? b - a : a - b))[0]
    : undefined;

  const up = position ? stats.unrealizedPnL >= 0 : false;
  const cols: { label: string; value: string; tone?: string }[] = [
    {
      label: "Type",
      value: position ? (position.dir === 1 ? "▲ Long" : "▼ Short") : "n/a",
      tone: position ? (position.dir === 1 ? "text-up" : "text-down") : undefined,
    },
    { label: "Shares", value: position ? fmtShares(position.shares) : "n/a" },
    { label: "Cost Basis", value: position ? fmtPrice(position.avgPrice) : "n/a" },
    { label: "Market", value: position ? fmtPrice(stats.price) : "n/a" },
    { label: "Stop", value: position && protectiveStop != null ? fmtPrice(protectiveStop) : "n/a" },
    {
      label: "Unreal. P/L",
      value: position ? fmtSignedUSD(stats.unrealizedPnL, true) : "n/a",
      tone: position ? (up ? "text-up" : "text-down") : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-3">
      {cols.map((c) => (
        <div key={c.label} className="flex min-w-0 flex-col">
          <span className="truncate text-[10px] uppercase tracking-wide text-muted">{c.label}</span>
          <span className={`truncate font-mono text-sm ${c.tone ?? "text-fg"}`}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}
