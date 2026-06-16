// The persistent "lifetime" account model.
//
// Every user starts with $1,000,000. Each swing game consumes 90 trading days
// from a rolling 18,250-day (≈50-year) window; once the window is full the
// oldest events scroll off. Net worth, cash and stats always reflect only the
// events still inside that window. Loans ($100k, taken when cash ≤ $25k) hand
// you tradeable cash but weigh on net worth until they age out.
import type { Ticker } from "./types";

export const STARTING_CAPITAL = 1_000_000;
export const LIFETIME_DAYS = 18_250;
export const SWING_DAYS = 100;
export const LOAN_AMOUNT = 100_000;
export const LOAN_THRESHOLD = 25_000;

export interface GameEvent {
  kind: "game";
  skipped: boolean;
  symbol: Ticker;
  startDate: string;
  endDate: string;
  profit: number;
  returnPct: number;
  buyHoldPct: number;
  ratingTier: number;
  ratingLabel: string;
  trades: number;
  liquidated: boolean;
  days: number; // SWING_DAYS
  playedAt: number;
}

export interface LoanEvent {
  kind: "loan";
  amount: number; // LOAN_AMOUNT
  days: 0;
  playedAt: number;
}

export type LifetimeEvent = GameEvent | LoanEvent;

export interface LifetimeStats {
  netWorth: number;
  cash: number; // tradeable: net worth + outstanding loans
  loans: number; // outstanding loan total within the window
  daysUsed: number; // capped at LIFETIME_DAYS
  daysLeft: number;
  gamesPlayed: number;
  windowed: LifetimeEvent[];
}

// Net worth is now a simple all-time cumulative account (the rolling-window
// "lifetime used" tracker was removed), so every event counts.
export function windowEvents(events: LifetimeEvent[]): LifetimeEvent[] {
  return events;
}

export function lifetimeStats(events: LifetimeEvent[]): LifetimeStats {
  const windowed = windowEvents(events);
  let profit = 0;
  let loans = 0;
  let days = 0;
  let games = 0;
  for (const e of windowed) {
    if (e.kind === "game") {
      profit += e.profit;
      days += e.days;
      games += 1;
    } else {
      loans += e.amount;
    }
  }
  const netWorth = STARTING_CAPITAL + profit;
  return {
    netWorth,
    cash: netWorth + loans,
    loans,
    daysUsed: Math.min(days, LIFETIME_DAYS),
    daysLeft: Math.max(0, LIFETIME_DAYS - days),
    gamesPlayed: games,
    windowed,
  };
}

export function canTakeLoan(stats: LifetimeStats): boolean {
  return stats.cash <= LOAN_THRESHOLD;
}
