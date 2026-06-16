"use client";

import { fmtPrice, fmtShares, fmtSignedUSD } from "@/lib/format";
import { derive, useGame } from "@/store/gameStore";

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className="font-mono text-sm">{children}</span>
    </div>
  );
}

export default function PositionPanel() {
  const position = useGame((s) => s.position);
  const orders = useGame((s) => s.orders);
  const stats = useGame(derive);
  if (!stats) return null;

  // A protective stop for the open position is an opposite-side stop order.
  const protectiveStop = position
    ? orders
        .filter((o) => o.kind === "stop" && o.side === (position.dir === 1 ? "sell" : "buy"))
        .map((o) => o.price)
        .sort((a, b) => (position.dir === 1 ? b - a : a - b))[0]
    : undefined;

  if (!position) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-sm text-muted">
        Flat — no open position
      </div>
    );
  }

  const long = position.dir === 1;
  const up = stats.unrealizedPnL >= 0;

  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${
            long ? "bg-up/15 text-up" : "bg-down/15 text-down"
          }`}
        >
          {long ? "▲ LONG" : "▼ SHORT"}
        </span>
        <span className={`font-mono text-sm font-semibold ${up ? "text-up" : "text-down"}`}>
          {fmtSignedUSD(stats.unrealizedPnL, true)}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Cell label="Shares">{fmtShares(position.shares)}</Cell>
        <Cell label="Cost">{fmtPrice(position.avgPrice)}</Cell>
        <Cell label="Market">{fmtPrice(stats.price)}</Cell>
        <Cell label="Stop">{protectiveStop != null ? fmtPrice(protectiveStop) : "n/a"}</Cell>
      </div>
    </div>
  );
}
