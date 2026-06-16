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

export function computeFill(
  s: FillInput,
  side: OrderSide,
  shares: number,
  price: number,
  index: number,
): FillSlice | null {
  if (shares < 1) return null;
  const signed = s.position ? s.position.dir * s.position.shares : 0;
  const avg = s.position ? s.position.avgPrice : 0;
  const delta = side === "buy" ? shares : -shares;
  const newSigned = signed + delta;
  const cash = s.cash - delta * price; // buy spends cash, sell receives cash

  let realizedPnL = s.realizedPnL;
  let trades = s.trades;
  let nextTradeId = s.nextTradeId;
  const events = [...s.events];

  const closing = signed !== 0 && Math.sign(delta) !== Math.sign(signed);
  if (closing) {
    const dir = Math.sign(signed) as Direction;
    const closeShares = Math.min(shares, Math.abs(signed));
    const pnl = dir * closeShares * (price - avg);
    realizedPnL += pnl;
    trades = [
      ...trades,
      {
        id: nextTradeId,
        dir,
        entryPrice: avg,
        exitPrice: price,
        shares: closeShares,
        pnl,
        pnlPct: dir * ((price - avg) / avg) * 100,
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
      newAvg = price;
      positionEntryBar = index;
    } else if (adding) {
      newAvg = (Math.abs(signed) * avg + shares * price) / Math.abs(newSigned);
    } else {
      newAvg = avg; // reduced, basis unchanged
    }
    position = { dir, shares: Math.abs(newSigned), avgPrice: newAvg };
  } else {
    positionEntryBar = null;
  }

  return { cash, position, positionEntryBar, realizedPnL, trades, events, nextTradeId };
}
