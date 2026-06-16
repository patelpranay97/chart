"use client";

import { fmtPct, fmtPrice, fmtShares, fmtSignedUSD } from "@/lib/format";
import { useGame } from "@/store/gameStore";

export default function TradesTab() {
  const trades = useGame((s) => s.trades);

  if (trades.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted">
        No closed trades yet. Open a position and close it to log a trade.
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="sticky top-0 z-10 bg-panel text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="py-1 pr-2 font-medium">L/S</th>
            <th className="py-1 pr-2 text-right font-medium">Enter</th>
            <th className="py-1 pr-2 text-right font-medium">Exit</th>
            <th className="py-1 pr-2 text-right font-medium">Shares</th>
            <th className="py-1 text-right font-medium">P/L</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {trades
            .slice()
            .reverse()
            .map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="py-1.5 pr-2">
                  <span className={t.dir === 1 ? "text-up" : "text-down"}>
                    {t.dir === 1 ? "▲" : "▼"}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-right">{fmtPrice(t.entryPrice)}</td>
                <td className="py-1.5 pr-2 text-right">{fmtPrice(t.exitPrice)}</td>
                <td className="py-1.5 pr-2 text-right">{fmtShares(t.shares)}</td>
                <td className={`py-1.5 text-right ${t.pnl >= 0 ? "text-up" : "text-down"}`}>
                  {fmtSignedUSD(t.pnl)}
                  <span className="ml-1 text-[11px] opacity-70">{fmtPct(t.pnlPct)}</span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
