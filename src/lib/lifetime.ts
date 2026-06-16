// The persistent "lifetime" account model.
//
// You pick a starting net worth (default $1,000,000) to match your real
// portfolio size. Each swing game's profit accrues to that base; net worth,
// cash and stats are all computed from it. Loans scale with the chosen size and
// hand you tradeable cash that weighs on net worth until it ages out. Changing
// your starting net worth begins a fresh account at the new size.
import type { Ticker } from "./types";

export const DEFAULT_STARTING_CAPITAL = 1_000_000;
export const STARTING_CAPITAL_PRESETS = [10_000, 50_000, 100_000, 1_000_000];
export const MIN_STARTING_CAPITAL = 1_000;
export const MAX_STARTING_CAPITAL = 100_000_000;
export const LIFETIME_DAYS = 18_250;
export const SWING_DAYS = 100;

// Loans scale with account size so the mechanic stays proportional at any port
// size: borrow 10% of the base, offered once cash falls to ≤ 2.5% of the base.
const LOAN_FRACTION = 0.1;
const LOAN_THRESHOLD_FRACTION = 0.025;
export function loanAmount(base: number): number {
  return Math.max(1000, Math.round((base * LOAN_FRACTION) / 1000) * 1000);
}
export function loanThreshold(base: number): number {
  return Math.round(base * LOAN_THRESHOLD_FRACTION);
}
export function clampStartingCapital(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_STARTING_CAPITAL;
  return Math.min(MAX_STARTING_CAPITAL, Math.max(MIN_STARTING_CAPITAL, Math.round(n)));
}

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
  amount: number; // loanAmount(base) at the time it was taken
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

export function lifetimeStats(
  events: LifetimeEvent[],
  base: number = DEFAULT_STARTING_CAPITAL,
): LifetimeStats {
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
  const netWorth = base + profit;
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

export function canTakeLoan(
  stats: LifetimeStats,
  base: number = DEFAULT_STARTING_CAPITAL,
): boolean {
  return stats.cash <= loanThreshold(base);
}
