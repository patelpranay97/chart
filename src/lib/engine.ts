// Pure share-fill engine, isolated from the store so it can be unit-tested.
// Applies a buy/sell of `shares` at `price` on bar `index`, supporting opens,
// adds, partial closes, full closes and flips.
import type { Direction, MarkerEvent, OrderSide, Position, Trade } from "./types";

export interface FillInput {
  cash: number;
  position: Position | null;
  positionEntryBar: number | null;
  realizedPnL: number;
  trades: Trade[];
  events: MarkerEvent[];
  nextTradeId: number;
}

export type FillSlice = FillInput;

// Per-side transaction cost (slippage/spread). Buys fill a touch above and
// sells a touch below the close, so every round-trip pays a real cost and the
// frictionless buy & hold benchmark is genuinely hard to beat by overtrading.
export const SLIPPAGE = 0.0005; // 5 bps

// --- Real-world margin mechanics -------------------------------------------
// A broker force-liquidates when account equity falls below this fraction of
// position value (the "maintenance margin"). Kept below 1/maxLeverage (the
// richest preset is 5x → 20% equity at entry) so every leverage preset can
// still be opened, while higher leverage liquidates on a smaller adverse move.
export const MAINTENANCE_MARGIN = 0.15;

// Annualized interest charged on the financed (margin) balance, accrued daily.
export const MARGIN_RATE_ANNUAL = 0.08;
const TRADING_DAYS_PER_YEAR = 252;

// The portion of a position's notional financed beyond the trader's own equity
// — i.e. the margin actually borrowed. Correct for both longs and shorts.
export function marginUsed(exposure: number, equity: number): number {
  return Math.max(0, exposure - equity);
}

// One trading day's interest cost on a given margin balance.
export function dailyMarginInterest(margin: number): number {
  return Math.max(0, margin) * (MARGIN_RATE_ANNUAL / TRADING_DAYS_PER_YEAR);
}

// The price at which equity falls to the maintenance requirement
// (equity = MAINTENANCE_MARGIN * exposure) — past it the broker liquidates.
// equity = cash + dir*shares*p, exposure = shares*p, so the breach price is
// p = cash / (shares * (MAINTENANCE_MARGIN - dir)). For an unlevered long
// (cash ≥ 0) this is ≤ 0, i.e. it can never be hit — correct.
export function liquidationPrice(cash: number, position: Position): number {
  return cash / (position.shares * (MAINTENANCE_MARGIN - position.dir));
}

export function computeFill(
  s: FillInput,
  side: OrderSide,
  shares: number,
  price: number,
  index: number,
  slippage: number = SLIPPAGE,
): FillSlice | null {
  if (shares < 1) return null;
  // Worse-than-market execution: pay up to buy, give up a bit to sell.
  const fillPrice = side === "buy" ? price * (1 + slippage) : price * (1 - slippage);
  const signed = s.position ? s.position.dir * s.position.shares : 0;
  const avg = s.position ? s.position.avgPrice : 0;
  const delta = side === "buy" ? shares : -shares;
  const newSigned = signed + delta;
  const cash = s.cash - delta * fillPrice; // buy spends cash, sell receives cash

  let realizedPnL = s.realizedPnL;
  let trades = s.trades;
  let nextTradeId = s.nextTradeId;
  const events = [...s.events];

  const closing = signed !== 0 && Math.sign(delta) !== Math.sign(signed);
  if (closing) {
    const dir = Math.sign(signed) as Direction;
    const closeShares = Math.min(shares, Math.abs(signed));
    const pnl = dir * closeShares * (fillPrice - avg);
    realizedPnL += pnl;
    trades = [
      ...trades,
      {
        id: nextTradeId,
        dir,
        entryPrice: avg,
        exitPrice: fillPrice,
        shares: closeShares,
        pnl,
        pnlPct: dir * ((fillPrice - avg) / avg) * 100,
        entryBar: s.positionEntryBar ?? index,
        exitBar: index,
      },
    ];
    nextTradeId += 1;
    events.push({ bar: index, type: "exit", dir });
  }

  const adding = signed !== 0 && Math.sign(delta) === Math.sign(signed);
  const flipped = closing && Math.abs(delta) > Math.abs(signed);
  if (signed === 0 || adding || flipped) {
    events.push({ bar: index, type: "entry", dir: Math.sign(newSigned) as Direction });
  }

  let position: Position | null = null;
  let positionEntryBar = s.positionEntryBar;
  if (newSigned !== 0) {
    const dir = Math.sign(newSigned) as Direction;
    let newAvg: number;
    if (signed === 0 || flipped) {
      newAvg = fillPrice;
      positionEntryBar = index;
    } else if (adding) {
      newAvg = (Math.abs(signed) * avg + shares * fillPrice) / Math.abs(newSigned);
    } else {
      newAvg = avg; // reduced, basis unchanged
    }
    position = { dir, shares: Math.abs(newSigned), avgPrice: newAvg };
  } else {
    positionEntryBar = null;
  }

  return { cash, position, positionEntryBar, realizedPnL, trades, events, nextTradeId };
}
