// Market-data loading and random-round selection.
import type { Candle, RawBar, Ticker, TickerData } from "./types";

export const TICKERS: Ticker[] = ["SPY", "QQQ", "VOO"];

// How many candles are visible at the start of a round, and how many future
// bars the player can advance through before the round must end.
export const INITIAL_BARS = 80;
export const MAX_FUTURE = 60;
const WINDOW = INITIAL_BARS + MAX_FUTURE;

const cache = new Map<Ticker, TickerData>();

export function toCandle(b: RawBar): Candle {
  return { time: b[0], open: b[1], high: b[2], low: b[3], close: b[4], volume: b[5] };
}

export async function loadTicker(symbol: Ticker): Promise<TickerData> {
  const cached = cache.get(symbol);
  if (cached) return cached;
  const res = await fetch(`/data/${symbol}.json`);
  if (!res.ok) throw new Error(`Failed to load data for ${symbol}`);
  const data = (await res.json()) as TickerData;
  cache.set(symbol, data);
  return data;
}

export interface Round {
  symbol: Ticker;
  candles: Candle[]; // full window (initial + future), in order
  initialBars: number; // number revealed at start
}

function randInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

// Loads a random ticker and slices out a random contiguous window.
export async function buildRandomRound(): Promise<Round> {
  const symbol = TICKERS[randInt(TICKERS.length)];
  const data = await loadTicker(symbol);
  const n = data.bars.length;
  // Leave a little padding off the very start so there is real price history.
  const minStart = 10;
  const maxStart = Math.max(minStart + 1, n - WINDOW);
  const start = minStart + randInt(maxStart - minStart);
  const slice = data.bars.slice(start, start + WINDOW).map(toCandle);
  return { symbol, candles: slice, initialBars: INITIAL_BARS };
}
