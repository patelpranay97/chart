// Market-data loading and random-round selection.
import type { Candle, RawBar, Ticker, TickerData } from "./types";

export const TICKERS: Ticker[] = ["SPY", "QQQ", "VOO"];

// How many candles are visible at the start of a round, and how many future
// bars the player can advance through before the round must end.
export const INITIAL_BARS = 80;
export const MAX_FUTURE = 100;
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

type Regime = "bull" | "bear" | "chop";

// Classify a window by the forward return of its *tradeable* portion (first
// tradeable close → last close).
function regimeOf(candles: Candle[]): Regime {
  const startClose = candles[INITIAL_BARS - 1].close;
  const endClose = candles[candles.length - 1].close;
  const r = (endClose - startClose) / startClose;
  if (r > 0.05) return "bull";
  if (r < -0.03) return "bear";
  return "chop";
}

// Picks a random contiguous window, balanced across up / down / sideways
// markets via rejection sampling toward a random target regime — so "always
// long" doesn't reliably win and the player has to read the trend, sit out
// drops, or short. Falls back to any window if the target is hard to find.
export async function buildRandomRound(): Promise<Round> {
  const datas = await Promise.all(TICKERS.map(loadTicker));
  const target: Regime = (["bull", "bear", "chop"] as const)[randInt(3)];
  let fallback: Round | null = null;

  for (let attempt = 0; attempt < 80; attempt++) {
    const ti = randInt(TICKERS.length);
    const data = datas[ti];
    const n = data.bars.length;
    const minStart = 10; // a little padding so there's real prior history
    const maxStart = Math.max(minStart + 1, n - WINDOW);
    const start = minStart + randInt(maxStart - minStart);
    const candles = data.bars.slice(start, start + WINDOW).map(toCandle);
    if (candles.length < WINDOW) continue;
    const round: Round = { symbol: TICKERS[ti], candles, initialBars: INITIAL_BARS };
    if (!fallback) fallback = round;
    if (regimeOf(candles) === target) return round;
  }
  return fallback as Round;
}
