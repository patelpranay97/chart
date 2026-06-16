// Lifetime performance analytics derived from the windowed game history.
import {
  lifetimeStats,
  STARTING_CAPITAL,
  type GameEvent,
  type LifetimeEvent,
} from "./lifetime";

export interface NetWorthPoint {
  day: number; // cumulative trading days
  value: number; // net worth after this game
}

export interface HistogramBucket {
  label: string;
  count: number;
  positive: boolean;
}

export interface Badge {
  id: string;
  label: string;
  desc: string;
  earned: boolean;
}

export interface ProfileStats {
  netWorth: number;
  totalProfit: number;
  totalReturnPct: number;
  gamesPlayed: number; // non-skipped
  skipped: number;
  skipRate: number; // 0..1
  liquidations: number;
  winRate: number; // 0..1
  avgReturnPct: number;
  stdReturnPct: number;
  sharpe: number;
  maxDrawdownPct: number;
  acr: number; // annualized compound return, as %
  daysUsed: number;
  netWorthSeries: NetWorthPoint[];
  histogram: HistogramBucket[];
  badges: Badge[];
}

const TRADING_DAYS_PER_YEAR = 252;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

const HIST_EDGES = [-20, -10, -5, 0, 5, 10, 20];

function histogram(returns: number[]): HistogramBucket[] {
  const labels = [
    "< -20%",
    "-20 to -10",
    "-10 to -5",
    "-5 to 0",
    "0 to 5",
    "5 to 10",
    "10 to 20",
    "> 20%",
  ];
  const counts = new Array(labels.length).fill(0);
  for (const r of returns) {
    let idx = HIST_EDGES.findIndex((edge) => r < edge);
    if (idx === -1) idx = labels.length - 1;
    counts[idx] += 1;
  }
  return labels.map((label, i) => ({ label, count: counts[i], positive: i >= 4 }));
}

function buildBadges(s: Omit<ProfileStats, "badges">): Badge[] {
  return [
    ["first", "First Blood", "Play your first game", s.gamesPlayed >= 1],
    ["ten", "Regular", "Play 10 games", s.gamesPlayed >= 10],
    ["fifty", "Veteran", "Play 50 games", s.gamesPlayed >= 50],
    ["double", "Double Up", "Reach 100% lifetime return", s.totalReturnPct >= 100],
    ["two_m", "Two Comma+", "Grow net worth past $2M", s.netWorth >= 2_000_000],
    ["sharp", "Sharp", "Sharpe ratio ≥ 1 over 5+ games", s.sharpe >= 1 && s.gamesPlayed >= 5],
    ["picker", "Stock Picker", "60%+ win rate over 10+ games", s.winRate >= 0.6 && s.gamesPlayed >= 10],
    ["iron", "Iron Hands", "10+ games, never liquidated", s.gamesPlayed >= 10 && s.liquidations === 0],
    ["blown", "Blown Up", "Survive a liquidation", s.liquidations >= 1],
  ].map(([id, label, desc, earned]) => ({
    id: id as string,
    label: label as string,
    desc: desc as string,
    earned: Boolean(earned),
  }));
}

export function computeProfile(events: LifetimeEvent[]): ProfileStats {
  const life = lifetimeStats(events);
  const games = life.windowed.filter((e): e is GameEvent => e.kind === "game");
  const played = games.filter((g) => !g.skipped);
  const skipped = games.filter((g) => g.skipped).length;

  const returns = played.map((g) => g.returnPct);
  const wins = played.filter((g) => g.profit > 0).length;
  const liquidations = played.filter((g) => g.liquidated).length;

  // Net-worth path + max drawdown over the windowed games (in order).
  const series: NetWorthPoint[] = [];
  let cumProfit = 0;
  let day = 0;
  let peak = STARTING_CAPITAL;
  let maxDD = 0;
  for (const g of games) {
    cumProfit += g.profit;
    day += g.days;
    const value = STARTING_CAPITAL + cumProfit;
    peak = Math.max(peak, value);
    if (peak > 0) maxDD = Math.max(maxDD, (peak - value) / peak);
    series.push({ day, value });
  }

  const totalReturnPct = ((life.netWorth - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;
  const sd = std(returns);
  const sharpe = sd > 0 ? mean(returns) / sd : 0;
  const acr =
    life.daysUsed > 0 && life.netWorth > 0
      ? ((life.netWorth / STARTING_CAPITAL) ** (TRADING_DAYS_PER_YEAR / life.daysUsed) - 1) * 100
      : 0;

  const base: Omit<ProfileStats, "badges"> = {
    netWorth: life.netWorth,
    totalProfit: life.netWorth - STARTING_CAPITAL,
    totalReturnPct,
    gamesPlayed: played.length,
    skipped,
    skipRate: games.length ? skipped / games.length : 0,
    liquidations,
    winRate: played.length ? wins / played.length : 0,
    avgReturnPct: mean(returns),
    stdReturnPct: sd,
    sharpe,
    maxDrawdownPct: maxDD * 100,
    acr,
    daysUsed: life.daysUsed,
    netWorthSeries: series,
    histogram: histogram(returns),
  };

  return { ...base, badges: buildBadges(base) };
}
