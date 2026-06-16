// Indicator math. Each function returns an array aligned 1:1 with the input
// candles; positions without enough lookback are null.
import type { Candle } from "./types";

export function sma(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (period < 1) return out;
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (period < 1 || candles.length === 0) return out;
  const k = 2 / (period + 1);
  // Seed with an SMA of the first `period` closes.
  let seed = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      seed += candles[i].close;
      if (i === period - 1) out[i] = seed / period;
      continue;
    }
    const prev = out[i - 1] as number;
    out[i] = candles[i].close * k + prev * (1 - k);
  }
  return out;
}

// Heikin-Ashi transform. Each output candle smooths the real OHLC; the running
// HA open depends on the prior HA candle, so this must be computed from the
// start of the series. Volume is carried through unchanged. A candle renders
// green when haClose >= haOpen (uptrend) and red otherwise.
export function heikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen =
      i === 0 ? (c.open + c.close) / 2 : (out[i - 1].open + out[i - 1].close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    out.push({ time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose, volume: c.volume });
  }
  return out;
}

// Anchored VWAP: cumulative typical-price * volume / cumulative volume,
// anchored at the first bar of the series.
export function vwap(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typical = (c.high + c.low + c.close) / 3;
    const v = c.volume || 0;
    cumPV += typical * v;
    cumV += v;
    out[i] = cumV > 0 ? cumPV / cumV : c.close;
  }
  return out;
}
