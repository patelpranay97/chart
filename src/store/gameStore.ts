"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { buildRandomRound, type Round } from "@/lib/data";
import {
  computeFill,
  dailyMarginInterest,
  liquidationPrice,
  marginUsed,
} from "@/lib/engine";
import {
  canTakeLoan,
  clampStartingCapital,
  DEFAULT_STARTING_CAPITAL,
  lifetimeStats,
  loanAmount,
  SWING_DAYS,
  type LifetimeEvent,
  type LifetimeStats,
} from "@/lib/lifetime";
import { ratePerformance } from "@/lib/rating";
import type {
  CandleType,
  Direction,
  GameConfig,
  GamePhase,
  GameResult,
  IndicatorSettings,
  MarkerEvent,
  Order,
  OrderSide,
  Position,
  Trade,
} from "@/lib/types";

const LIFETIME_KEY = "cg_lifetime";
const CONFIG_KEY = "cg_config";
const CAPITAL_KEY = "cg_starting_capital";

const DEFAULT_CONFIG: GameConfig = { leverage: 1 };

const DEFAULT_INDICATORS: IndicatorSettings = {
  flags: true,
  orderLine: true,
  tradeLines: true,
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

  lifetime: LifetimeEvent[];
  startingCapital: number; // chosen account base — your "starting net worth"

  round: Round | null;
  revealed: number; // number of candles currently visible
  startingCash: number; // tradeable cash brought in (net worth + loans) — buying power
  startingEquity: number; // own capital brought in (net worth, excl. loans) — return %

  cash: number;
  realizedPnL: number;
  position: Position | null;
  positionEntryBar: number | null;
  trades: Trade[];
  events: MarkerEvent[];
  nextTradeId: number;

  advanced: boolean;
  orders: Order[]; // resting limit/stop orders
  nextOrderId: number;
  liquidated: boolean;

  sizePct: number; // fraction of buying power deployed per entry
  indicators: IndicatorSettings;
  candleType: CandleType;
  advanceOnTrade: boolean; // reveal the next day when a simple trade fills

  result: GameResult | null;

  init: () => void;
  setConfig: (c: Partial<GameConfig>) => void;
  setStartingCapital: (amount: number) => void; // sets the base & resets account
  setSizePct: (p: number) => void;
  setAdvanced: (v: boolean) => void;
  setCandleType: (t: CandleType) => void;
  setAdvanceOnTrade: (v: boolean) => void;
  startGame: () => Promise<void>;
  skipGame: () => Promise<void>;
  toSetup: () => void;
  nextBar: () => void;
  enter: (dir: Direction) => boolean;
  closePosition: () => boolean;
  placeOrder: (o: { side: OrderSide; kind: "market" | "limit" | "stop"; price: number; shares: number }) => void;
  cancelOrder: (id: number) => void;
  endGame: () => void;
  addLoan: () => void;
  resetAccount: () => void;
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
  // Margin used = financed notional beyond your own equity (works for shorts too,
  // whose sale proceeds keep cash positive yet still run on margin).
  const borrowed = marginUsed(exposure, equity);
  const startCash = s.startingCash || s.startingCapital; // tradeable basis (incl. loans)
  const startEquity = s.startingEquity || s.startingCapital; // own-equity basis
  return {
    index,
    price,
    atEnd,
    unrealizedPnL,
    equity,
    buyingPower,
    borrowed,
    positionValue: exposure,
    // % is measured on your own equity, not on equity + the broker's loan.
    returnPct: ((equity - startCash) / startEquity) * 100,
    realizedPct: (s.realizedPnL / startEquity) * 100,
    buyHoldPct: ((price - s.round.candles[0].close) / s.round.candles[0].close) * 100,
  };
}

// Convenience selector for the persistent account.
export function selectLifetime(s: GameState): LifetimeStats {
  return lifetimeStats(s.lifetime, s.startingCapital);
}

function loadLifetime(): LifetimeEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LIFETIME_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLifetime(events: LifetimeEvent[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LIFETIME_KEY, JSON.stringify(events));
  }
}

function loadStartingCapital(): number {
  if (typeof window === "undefined") return DEFAULT_STARTING_CAPITAL;
  const raw = localStorage.getItem(CAPITAL_KEY);
  return raw ? clampStartingCapital(Number(raw)) : DEFAULT_STARTING_CAPITAL;
}

function saveStartingCapital(amount: number) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CAPITAL_KEY, String(amount));
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

const UIPREFS_KEY = "cg_uiprefs";
interface UiPrefs {
  candleType: CandleType;
  advanceOnTrade: boolean;
}
function loadUiPrefs(): UiPrefs {
  const def: UiPrefs = { candleType: "heikin", advanceOnTrade: true };
  if (typeof window === "undefined") return def;
  try {
    const raw = localStorage.getItem(UIPREFS_KEY);
    if (!raw) return def;
    const p = JSON.parse(raw);
    return {
      candleType: p.candleType === "regular" ? "regular" : "heikin",
      advanceOnTrade: p.advanceOnTrade !== false,
    };
  } catch {
    return def;
  }
}
function saveUiPrefs(p: UiPrefs) {
  if (typeof window !== "undefined") {
    localStorage.setItem(UIPREFS_KEY, JSON.stringify(p));
  }
}

export const useGame = create<GameState>((set, get) => ({
  phase: "setup",
  loading: false,
  config: DEFAULT_CONFIG,

  lifetime: [],
  startingCapital: DEFAULT_STARTING_CAPITAL,

  round: null,
  revealed: 0,
  startingCash: DEFAULT_STARTING_CAPITAL,
  startingEquity: DEFAULT_STARTING_CAPITAL,

  cash: 0,
  realizedPnL: 0,
  position: null,
  positionEntryBar: null,
  trades: [],
  events: [],
  nextTradeId: 1,

  advanced: false,
  orders: [],
  nextOrderId: 1,
  liquidated: false,

  sizePct: 0.25,
  indicators: DEFAULT_INDICATORS,
  candleType: "heikin",
  advanceOnTrade: true,

  result: null,

  init: () => {
    const ui = loadUiPrefs();
    set({
      lifetime: loadLifetime(),
      startingCapital: loadStartingCapital(),
      config: loadConfig(),
      candleType: ui.candleType,
      advanceOnTrade: ui.advanceOnTrade,
    });
  },

  setConfig: (c) => {
    const config = { ...get().config, ...c };
    set({ config });
    if (typeof window !== "undefined") {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
  },

  // Changing your starting net worth begins a fresh account at that base —
  // past dollar P/L was earned relative to the old size and can't carry over.
  setStartingCapital: (amount) => {
    const startingCapital = clampStartingCapital(amount);
    saveStartingCapital(startingCapital);
    saveLifetime([]);
    set({ startingCapital, lifetime: [], phase: "setup", result: null, round: null });
  },

  setSizePct: (p) => set({ sizePct: p }),
  setAdvanced: (v) => set({ advanced: v }),
  setCandleType: (t) => {
    set({ candleType: t });
    saveUiPrefs({ candleType: t, advanceOnTrade: get().advanceOnTrade });
  },
  setAdvanceOnTrade: (v) => {
    set({ advanceOnTrade: v });
    saveUiPrefs({ candleType: get().candleType, advanceOnTrade: v });
  },

  startGame: async () => {
    set({ loading: true });
    const round = await buildRandomRound();
    const life = lifetimeStats(get().lifetime, get().startingCapital);
    const startingCash = life.cash; // net worth + any outstanding loans (tradeable)
    const startingEquity = life.netWorth; // own capital (return % + loss floor basis)
    set({
      loading: false,
      phase: "playing",
      round,
      revealed: round.initialBars,
      startingCash,
      startingEquity,
      cash: startingCash,
      realizedPnL: 0,
      position: null,
      positionEntryBar: null,
      trades: [],
      events: [],
      nextTradeId: 1,
      orders: [],
      nextOrderId: 1,
      liquidated: false,
      result: null,
    });
  },

  skipGame: async () => {
    const s = get();
    // Skipping still consumes the trading days.
    if (s.round) {
      const d = derive(s)!;
      const event: LifetimeEvent = {
        kind: "game",
        skipped: true,
        symbol: s.round.symbol,
        startDate: s.round.candles[0].time,
        endDate: s.round.candles[d.index].time,
        profit: 0,
        returnPct: 0,
        buyHoldPct: d.buyHoldPct,
        ratingTier: 0,
        ratingLabel: "Skipped",
        trades: 0,
        liquidated: false,
        days: SWING_DAYS,
        playedAt: Date.now(),
      };
      const lifetime = [...s.lifetime, event];
      saveLifetime(lifetime);
      set({ lifetime });
    }
    await get().startGame();
  },

  toSetup: () => set({ phase: "setup", result: null, round: null }),

  nextBar: () => {
    const s = get();
    if (!s.round) return;
    // Reached the trading-day cap → finish the game automatically.
    if (s.revealed >= s.round.candles.length) {
      if (s.phase === "playing") get().endGame();
      return;
    }
    const index = s.revealed; // newly revealed bar
    const bar = s.round.candles[index];

    // Evaluate resting orders against the new bar's range, filling sequentially.
    let working: GameState = { ...s, revealed: s.revealed + 1 };
    const remaining: Order[] = [];
    for (const o of s.orders) {
      const triggered =
        o.kind === "limit"
          ? o.side === "buy"
            ? bar.low <= o.price
            : bar.high >= o.price
          : o.side === "buy"
            ? bar.high >= o.price
            : bar.low <= o.price;
      if (!triggered) {
        remaining.push(o);
        continue;
      }
      const fill = computeFill(working, o.side, o.shares, o.price, index);
      if (fill) working = { ...working, ...fill };
    }
    working = { ...working, orders: remaining };

    // Carry cost: accrue one day of interest on the financed margin balance, so
    // holding leverage for many days actually costs money (like a real loan).
    if (working.position) {
      const px = bar.close;
      const exp = working.position.shares * px;
      const eq = working.cash + working.position.dir * working.position.shares * px;
      const interest = dailyMarginInterest(marginUsed(exp, eq));
      if (interest > 0) working = { ...working, cash: working.cash - interest };
    }

    // Maintenance-margin liquidation: a real broker force-closes the moment
    // equity falls below the maintenance requirement — well before you're wiped
    // out. Check the bar's adverse extreme (low for longs, high for shorts); if
    // price gapped straight through, fill at the open (the first tradeable price).
    if (working.position) {
      const pos = working.position;
      const liqPx = liquidationPrice(working.cash, pos);
      const breached = pos.dir === 1 ? bar.low <= liqPx : bar.high >= liqPx;
      if (breached) {
        const fillPx = pos.dir === 1 ? Math.min(liqPx, bar.open) : Math.max(liqPx, bar.open);
        const liq = computeFill(working, pos.dir === 1 ? "sell" : "buy", pos.shares, fillPx, index);
        if (liq) working = { ...working, ...liq };
        set({ ...working, orders: [], liquidated: true });
        get().endGame();
        return;
      }
    }

    set(working);
  },

  enter: (dir) => {
    const s = get();
    const d = derive(s);
    if (!s.round || !d) return false;
    const shares = Math.floor((s.sizePct * d.buyingPower) / d.price);
    const fill = computeFill(s, dir === 1 ? "buy" : "sell", shares, d.price, d.index);
    if (!fill) return false;
    set(fill);
    return true;
  },

  closePosition: () => {
    const s = get();
    const d = derive(s);
    if (!s.round || !d || !s.position) return false;
    const fill = computeFill(
      s,
      s.position.dir === 1 ? "sell" : "buy",
      s.position.shares,
      d.price,
      d.index,
    );
    if (!fill) return false;
    set(fill);
    return true;
  },

  placeOrder: ({ side, kind, price, shares }) => {
    const s = get();
    const d = derive(s);
    if (!s.round || !d || shares < 1) return;
    if (kind === "market") {
      const fill = computeFill(s, side, shares, d.price, d.index);
      if (fill) set(fill);
      return;
    }
    const order: Order = { id: s.nextOrderId, side, kind, price, shares };
    set({ orders: [...s.orders, order], nextOrderId: s.nextOrderId + 1 });
  },

  cancelOrder: (id) => set({ orders: get().orders.filter((o) => o.id !== id) }),

  endGame: () => {
    const s = get();
    if (!s.round) return;
    if (s.position) get().closePosition();
    const after = get();
    const d = derive(after)!;
    const startEquity = after.startingEquity || after.startingCapital;
    // Profit = the true change in account value (flat now, so equity = cash) —
    // this captures margin interest, not just trade P&L. Floor a single game's
    // loss at the player's own equity so a gap-through wipes you to $0 net worth
    // rather than into compounding debt (you can blow up, not owe the broker).
    const profit = Math.max(d.equity - after.startingCash, -startEquity);
    const returnPct = (profit / startEquity) * 100;
    const buyHoldPct = d.buyHoldPct;
    const liquidated = after.liquidated;
    const rating = liquidated
      ? { tier: 0, label: "Liquidated" }
      : ratePerformance(returnPct);
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
      liquidated,
      playedAt: Date.now(),
    };
    const event: LifetimeEvent = {
      kind: "game",
      skipped: false,
      symbol: result.symbol,
      startDate: result.startDate,
      endDate: result.endDate,
      profit,
      returnPct,
      buyHoldPct,
      ratingTier: rating.tier,
      ratingLabel: rating.label,
      trades: after.trades.length,
      liquidated,
      days: SWING_DAYS,
      playedAt: result.playedAt,
    };
    const lifetime = [...after.lifetime, event];
    saveLifetime(lifetime);
    set({ phase: "ended", result, lifetime, orders: [] });
  },

  addLoan: () => {
    const s = get();
    if (!canTakeLoan(lifetimeStats(s.lifetime, s.startingCapital), s.startingCapital)) return;
    const lifetime: LifetimeEvent[] = [
      ...s.lifetime,
      { kind: "loan", amount: loanAmount(s.startingCapital), days: 0, playedAt: Date.now() },
    ];
    saveLifetime(lifetime);
    set({ lifetime });
  },

  resetAccount: () => {
    saveLifetime([]);
    set({ lifetime: [], phase: "setup", result: null, round: null });
  },

  setIndicators: (patch) => set({ indicators: { ...get().indicators, ...patch } }),
}));

// `derive` and `lifetimeStats` build a fresh object on every call, which would
// make the store snapshot never compare equal and trigger an infinite render
// loop. These hooks hand components a stable reference instead.
//
// derive() returns a flat object → useShallow stabilizes it by shallow-equality.
export function useDerived(): DerivedStats | null {
  return useGame(useShallow(derive));
}

// lifetimeStats() contains a nested `windowed` array, so shallow-equality won't
// stabilize it; instead subscribe to the (stable) lifetime array and memoize.
export function useLifetimeStats(): LifetimeStats {
  const lifetime = useGame((s) => s.lifetime);
  const startingCapital = useGame((s) => s.startingCapital);
  return useMemo(() => lifetimeStats(lifetime, startingCapital), [lifetime, startingCapital]);
}
