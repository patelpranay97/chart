"use client";

import { create } from "zustand";
import { buildRandomRound, type Round } from "@/lib/data";
import { ratePerformance } from "@/lib/rating";
import type {
  Direction,
  GameConfig,
  GamePhase,
  GameResult,
  IndicatorSettings,
  MarkerEvent,
  Position,
  Trade,
} from "@/lib/types";

const HISTORY_KEY = "cg_history";
const CONFIG_KEY = "cg_config";

const DEFAULT_CONFIG: GameConfig = { startingCash: 100_000, leverage: 1 };

const DEFAULT_INDICATORS: IndicatorSettings = {
  flags: true,
  orderLine: true,
  sma: true,
  smaPeriod: 20,
  sma2: false,
  sma2Period: 50,
  ema: false,
  emaPeriod: 9,
  vwap: false,
};

interface GameState {
  phase: GamePhase;
  loading: boolean;
  config: GameConfig;

  round: Round | null;
  revealed: number; // number of candles currently visible
  startingCash: number; // frozen for the active round

  cash: number;
  realizedPnL: number;
  position: Position | null;
  positionEntryBar: number | null;
  trades: Trade[];
  events: MarkerEvent[];
  nextTradeId: number;

  sizePct: number; // fraction of buying power deployed per entry
  indicators: IndicatorSettings;

  result: GameResult | null;
  history: GameResult[];

  init: () => void;
  setConfig: (c: Partial<GameConfig>) => void;
  setSizePct: (p: number) => void;
  startGame: () => Promise<void>;
  toSetup: () => void;
  nextBar: () => void;
  enter: (dir: Direction) => void;
  closePosition: () => void;
  endGame: () => void;
  setIndicators: (patch: Partial<IndicatorSettings>) => void;
}

export interface DerivedStats {
  index: number;
  price: number;
  atEnd: boolean;
  unrealizedPnL: number;
  equity: number;
  buyingPower: number;
  borrowed: number;
  positionValue: number;
  returnPct: number;
  realizedPct: number;
  buyHoldPct: number;
}

// Pure: compute live account stats at the current revealed bar.
export function derive(s: GameState): DerivedStats | null {
  if (!s.round) return null;
  const index = s.revealed - 1;
  const price = s.round.candles[index].close;
  const atEnd = s.revealed >= s.round.candles.length;
  const exposure = s.position ? s.position.shares * price : 0;
  const unrealizedPnL = s.position
    ? s.position.dir * s.position.shares * (price - s.position.avgPrice)
    : 0;
  const equity = s.cash + (s.position ? s.position.dir * s.position.shares * price : 0);
  const buyingPower = Math.max(0, equity * s.config.leverage - exposure);
  const borrowed = Math.max(0, -s.cash);
  const start = s.startingCash;
  return {
    index,
    price,
    atEnd,
    unrealizedPnL,
    equity,
    buyingPower,
    borrowed,
    positionValue: exposure,
    returnPct: ((equity - start) / start) * 100,
    realizedPct: (s.realizedPnL / start) * 100,
    buyHoldPct: ((price - s.round.candles[0].close) / s.round.candles[0].close) * 100,
  };
}

function loadHistory(): GameResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadConfig(): GameConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export const useGame = create<GameState>((set, get) => ({
  phase: "setup",
  loading: false,
  config: DEFAULT_CONFIG,

  round: null,
  revealed: 0,
  startingCash: DEFAULT_CONFIG.startingCash,

  cash: 0,
  realizedPnL: 0,
  position: null,
  positionEntryBar: null,
  trades: [],
  events: [],
  nextTradeId: 1,

  sizePct: 1,
  indicators: DEFAULT_INDICATORS,

  result: null,
  history: [],

  init: () => set({ history: loadHistory(), config: loadConfig() }),

  setConfig: (c) => {
    const config = { ...get().config, ...c };
    set({ config });
    if (typeof window !== "undefined") {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
  },

  setSizePct: (p) => set({ sizePct: p }),

  startGame: async () => {
    set({ loading: true });
    const round = await buildRandomRound();
    const startingCash = get().config.startingCash;
    set({
      loading: false,
      phase: "playing",
      round,
      revealed: round.initialBars,
      startingCash,
      cash: startingCash,
      realizedPnL: 0,
      position: null,
      positionEntryBar: null,
      trades: [],
      events: [],
      nextTradeId: 1,
      result: null,
    });
  },

  toSetup: () => set({ phase: "setup", result: null, round: null }),

  nextBar: () => {
    const s = get();
    if (!s.round) return;
    if (s.revealed < s.round.candles.length) set({ revealed: s.revealed + 1 });
  },

  enter: (dir) => {
    const s = get();
    const d = derive(s);
    if (!s.round || !d) return;
    if (s.position && s.position.dir !== dir) return; // must close first
    const price = d.price;
    const shares = Math.floor((s.sizePct * d.buyingPower) / price);
    if (shares < 1) return;

    const cashDelta = dir === 1 ? -shares * price : shares * price;
    let position: Position;
    let positionEntryBar = s.positionEntryBar;
    if (s.position) {
      const total = s.position.shares + shares;
      const avgPrice =
        (s.position.shares * s.position.avgPrice + shares * price) / total;
      position = { dir, shares: total, avgPrice };
    } else {
      position = { dir, shares, avgPrice: price };
      positionEntryBar = d.index;
    }
    set({
      cash: s.cash + cashDelta,
      position,
      positionEntryBar,
      events: [...s.events, { bar: d.index, type: "entry", dir }],
    });
  },

  closePosition: () => {
    const s = get();
    const d = derive(s);
    if (!s.round || !d || !s.position) return;
    const price = d.price;
    const { dir, shares, avgPrice } = s.position;
    const cashDelta = dir === 1 ? shares * price : -shares * price;
    const pnl = dir * shares * (price - avgPrice);
    const pnlPct = dir * ((price - avgPrice) / avgPrice) * 100;
    const trade: Trade = {
      id: s.nextTradeId,
      dir,
      entryPrice: avgPrice,
      exitPrice: price,
      shares,
      pnl,
      pnlPct,
      entryBar: s.positionEntryBar ?? d.index,
      exitBar: d.index,
    };
    set({
      cash: s.cash + cashDelta,
      realizedPnL: s.realizedPnL + pnl,
      position: null,
      positionEntryBar: null,
      trades: [...s.trades, trade],
      events: [...s.events, { bar: d.index, type: "exit", dir }],
      nextTradeId: s.nextTradeId + 1,
    });
  },

  endGame: () => {
    const s = get();
    if (!s.round) return;
    if (s.position) get().closePosition();
    const after = get();
    const d = derive(after)!;
    const start = after.startingCash;
    const profit = after.realizedPnL;
    const returnPct = (profit / start) * 100;
    const buyHoldPct = d.buyHoldPct;
    const rating = ratePerformance(returnPct, returnPct - buyHoldPct);
    const result: GameResult = {
      symbol: after.round!.symbol,
      startDate: after.round!.candles[0].time,
      endDate: after.round!.candles[d.index].time,
      profit,
      returnPct,
      buyHoldPct,
      trades: after.trades.length,
      ratingLabel: rating.label,
      ratingTier: rating.tier,
      playedAt: Date.now(),
    };
    const history = [result, ...after.history].slice(0, 50);
    if (typeof window !== "undefined") {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
    set({ phase: "ended", result, history });
  },

  setIndicators: (patch) => set({ indicators: { ...get().indicators, ...patch } }),
}));
