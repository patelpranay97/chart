"use client";

import { useState } from "react";
import { fmtPrice, fmtShares, fmtUSD } from "@/lib/format";
import type { OrderKind, OrderSide } from "@/lib/types";
import { derive, useGame } from "@/store/gameStore";

const KINDS: OrderKind[] = ["market", "limit", "stop"];

function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T; tone?: "up" | "down" }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => {
        const active = value === o.value;
        const tone =
          o.tone === "up"
            ? active
              ? "bg-up text-white border-up"
              : "border-line hover:border-up text-up"
            : o.tone === "down"
              ? active
                ? "bg-down text-white border-down"
                : "border-line hover:border-down text-down"
              : active
                ? "bg-accent text-accent-fg border-accent"
                : "border-line hover:border-accent";
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-md border py-1.5 text-xs font-semibold capitalize transition ${tone}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdvancedOrder() {
  const stats = useGame(derive);
  const orders = useGame((s) => s.orders);
  const placeOrder = useGame((s) => s.placeOrder);
  const cancelOrder = useGame((s) => s.cancelOrder);

  const [side, setSide] = useState<OrderSide>("buy");
  const [kind, setKind] = useState<OrderKind>("market");
  const [priceStr, setPriceStr] = useState("");
  const [sharesStr, setSharesStr] = useState("");

  if (!stats) return null;

  const price = kind === "market" ? stats.price : Number(priceStr) || stats.price;
  const defaultShares = Math.max(1, Math.floor(stats.buyingPower / stats.price));
  const shares = Math.max(0, Math.floor(Number(sharesStr) || defaultShares));
  const total = price * shares;

  const submit = () => {
    if (shares < 1) return;
    placeOrder({ side, kind, price, shares });
    setSharesStr("");
  };

  return (
    <div className="flex flex-col gap-3">
      <Seg
        options={[
          { label: "Buy", value: "buy", tone: "up" },
          { label: "Sell", value: "sell", tone: "down" },
        ]}
        value={side}
        onChange={setSide}
      />
      <Seg options={KINDS.map((k) => ({ label: k, value: k }))} value={kind} onChange={setKind} />

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Price</span>
          <input
            type="number"
            inputMode="decimal"
            disabled={kind === "market"}
            value={kind === "market" ? fmtPrice(stats.price) : priceStr}
            placeholder={fmtPrice(stats.price)}
            onChange={(e) => setPriceStr(e.target.value)}
            className="rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-60"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Shares</span>
          <input
            type="number"
            inputMode="numeric"
            value={sharesStr}
            placeholder={fmtShares(defaultShares)}
            onChange={(e) => setSharesStr(e.target.value)}
            className="rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>Order total</span>
        <span className="font-mono text-fg">{fmtUSD(total, { cents: true })}</span>
      </div>

      <button
        onClick={submit}
        className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition hover:opacity-90 ${
          side === "buy" ? "bg-up" : "bg-down"
        }`}
      >
        {kind === "market" ? "Place market" : `Place ${kind}`} {side}
      </button>

      {orders.length > 0 && (
        <div className="rounded-lg border border-line">
          <div className="border-b border-line px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted">
            Resting orders
          </div>
          <div className="divide-y divide-line">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-mono">
                  <span className={o.side === "buy" ? "text-up" : "text-down"}>
                    {o.side.toUpperCase()}
                  </span>{" "}
                  {fmtShares(o.shares)} @ {o.kind} {fmtPrice(o.price)}
                </span>
                <button
                  onClick={() => cancelOrder(o.id)}
                  className="text-xs text-muted transition hover:text-down"
                >
                  cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
