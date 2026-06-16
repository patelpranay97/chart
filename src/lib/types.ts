// Core domain types for the trading game.

export type Ticker = "SPY" | "QQQ" | "VOO";

export type CandleType = "regular" | "heikin";

// Compact on-disk bar tuple: [date, open, high, low, close, volume]
export type RawBar = [string, number, number, number, number, number];

export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  symbol: Ticker;
  bars: RawBar[];
}

export type Direction = 1 | -1; // 1 = long, -1 = short

export interface Position {
  dir: Direction;
  shares: number; // always positive
  avgPrice: number;
}

// A completed (closed) trade for the trades log.
export interface Trade {
  id: number;
  dir: Direction;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number; // dollars
  pnlPct: number; // % return on the cost basis
  entryBar: number; // index within the round window
  exitBar: number;
}

// An entry/exit event used to draw flags on the chart.
export interface MarkerEvent {
  bar: number; // index within the round window
  type: "entry" | "exit";
  dir: Direction;
}

export type OrderSide = "buy" | "sell";
export type OrderKind = "market" | "limit" | "stop";

// A resting (pending) limit or stop order. Market orders fill immediately and
// are never stored.
export interface Order {
  id: number;
  side: OrderSide;
  kind: "limit" | "stop";
  price: number;
  shares: number;
}

export type GamePhase = "setup" | "playing" | "ended";

export interface GameConfig {
  leverage: number; // 1..5
}

export interface IndicatorSettings {
  flags: boolean;
  orderLine: boolean;
  tradeLines: boolean;
  sma: boolean;
  smaPeriod: number;
  sma2: boolean;
  sma2Period: number;
  ema: boolean;
  emaPeriod: number;
  vwap: boolean;
}

export interface GameResult {
  symbol: Ticker;
  startDate: string;
  endDate: string;
  profit: number;
  returnPct: number;
  buyHoldPct: number;
  trades: number;
  ratingLabel: string;
  ratingTier: number;
  liquidated: boolean;
  playedAt: number; // epoch ms
}
