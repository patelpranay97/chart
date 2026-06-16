"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { ema, heikinAshi, sma, vwap } from "@/lib/indicators";
import type { Candle } from "@/lib/types";
import { useGame } from "@/store/gameStore";
import { useTheme } from "@/store/theme";

const UP = "#26a69a";
const DOWN = "#ef5350";
const UP_LIGHT = "#16a34a";
const DOWN_LIGHT = "#dc2626";

const INDICATOR_COLORS = {
  sma: "#f5a623",
  sma2: "#a855f7",
  ema: "#3b82f6",
  vwap: "#ec4899",
} as const;

function themeColors(theme: "dark" | "light") {
  const dark = theme === "dark";
  return {
    up: dark ? UP : UP_LIGHT,
    down: dark ? DOWN : DOWN_LIGHT,
    bg: "transparent",
    text: dark ? "#8b93a1" : "#6b7280",
    grid: dark ? "#1c2127" : "#eceef2",
    border: dark ? "#2a2f37" : "#e1e4ea",
  };
}

export default function Chart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const indicatorRefs = useRef<Record<string, ISeriesApi<"Line">>>({});
  const priceLineRef = useRef<IPriceLine | null>(null);
  const orderLineRefs = useRef<Record<number, IPriceLine>>({});
  const didFitRoundRef = useRef<string | null>(null);

  const round = useGame((s) => s.round);
  const revealed = useGame((s) => s.revealed);
  const events = useGame((s) => s.events);
  const position = useGame((s) => s.position);
  const orders = useGame((s) => s.orders);
  const indicators = useGame((s) => s.indicators);
  const candleType = useGame((s) => s.candleType);
  const theme = useTheme((s) => s.theme);

  const visible: Candle[] = useMemo(
    () => (round ? round.candles.slice(0, revealed) : []),
    [round, revealed],
  );

  // Candles actually drawn: Heikin-Ashi smooths the real OHLC into a clearer
  // trend view. Trades still execute at the real close (see the store), so the
  // cost-basis line may sit slightly off an HA body — that's inherent to HA.
  const displayCandles: Candle[] = useMemo(
    () => (candleType === "heikin" ? heikinAshi(visible) : visible),
    [visible, candleType],
  );

  // Create the chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    const c = themeColors(useTheme.getState().theme);
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: c.text,
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
      rightPriceScale: {
        borderColor: c.border,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: c.border,
        rightOffset: 2,
        fixLeftEdge: true,
      },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: c.up,
      downColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
      borderVisible: false,
      priceLineVisible: false,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volumeRef.current = volume;
    markersRef.current = createSeriesMarkers(candle, []);

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      markersRef.current = null;
      indicatorRefs.current = {};
      priceLineRef.current = null;
      orderLineRefs.current = {};
      didFitRoundRef.current = null;
    };
  }, []);

  // Theme updates.
  useEffect(() => {
    const chart = chartRef.current;
    const candle = candleRef.current;
    if (!chart || !candle) return;
    const c = themeColors(theme);
    chart.applyOptions({
      layout: { textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
    });
    candle.applyOptions({
      upColor: c.up,
      downColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
    });
  }, [theme]);

  // Candle + volume data.
  useEffect(() => {
    const candle = candleRef.current;
    const volume = volumeRef.current;
    const chart = chartRef.current;
    if (!candle || !volume || !chart || !round) return;
    const c = themeColors(theme);

    candle.setData(
      displayCandles.map((b) => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );
    volume.setData(
      displayCandles.map((b) => ({
        time: b.time as Time,
        value: b.volume,
        color: (b.close >= b.open ? c.up : c.down) + "55",
      })),
    );

    // Fit the whole window once per round, then let it scroll naturally.
    const key = `${round.symbol}-${round.candles[0]?.time}`;
    if (didFitRoundRef.current !== key) {
      chart.timeScale().fitContent();
      didFitRoundRef.current = key;
    }
  }, [displayCandles, round, theme]);

  // Indicator overlays — reconcile against the enabled set.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !round) return;
    const refs = indicatorRefs.current;

    const configs: { key: string; on: boolean; data: (number | null)[] }[] = [
      { key: "sma", on: indicators.sma, data: sma(displayCandles, indicators.smaPeriod) },
      { key: "sma2", on: indicators.sma2, data: sma(displayCandles, indicators.sma2Period) },
      { key: "ema", on: indicators.ema, data: ema(displayCandles, indicators.emaPeriod) },
      { key: "vwap", on: indicators.vwap, data: vwap(displayCandles) },
    ];

    for (const { key, on, data } of configs) {
      if (on) {
        if (!refs[key]) {
          refs[key] = chart.addSeries(LineSeries, {
            color: INDICATOR_COLORS[key as keyof typeof INDICATOR_COLORS],
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
        }
        refs[key].setData(
          displayCandles
            .map((b, i) => ({ time: b.time as Time, value: data[i] }))
            .filter((p) => p.value != null) as { time: Time; value: number }[],
        );
      } else if (refs[key]) {
        chart.removeSeries(refs[key]);
        delete refs[key];
      }
    }
  }, [displayCandles, indicators, round]);

  // Entry/exit flags.
  useEffect(() => {
    const markers = markersRef.current;
    if (!markers || !round) return;
    if (!indicators.flags) {
      markers.setMarkers([]);
      return;
    }
    const c = themeColors(theme);
    const list: SeriesMarker<Time>[] = events
      .filter((e) => e.bar < revealed)
      .map((e) => {
        const time = round.candles[e.bar].time as Time;
        if (e.type === "entry") {
          return e.dir === 1
            ? { time, position: "belowBar" as const, color: c.up, shape: "arrowUp" as const, text: "L" }
            : { time, position: "aboveBar" as const, color: c.down, shape: "arrowDown" as const, text: "S" };
        }
        return {
          time,
          position: e.dir === 1 ? ("aboveBar" as const) : ("belowBar" as const),
          color: theme === "dark" ? "#cbd5e1" : "#64748b",
          shape: "circle" as const,
          text: "X",
        };
      });
    markers.setMarkers(list);
  }, [events, indicators.flags, revealed, round, theme]);

  // Cost-basis order line.
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;
    if (priceLineRef.current) {
      candle.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }
    if (position && indicators.orderLine) {
      const c = themeColors(theme);
      priceLineRef.current = candle.createPriceLine({
        price: position.avgPrice,
        color: position.dir === 1 ? c.up : c.down,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: position.dir === 1 ? "long" : "short",
      });
    }
  }, [position, indicators.orderLine, theme]);

  // Resting limit/stop order lines.
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;
    const c = themeColors(theme);
    const refs = orderLineRefs.current;
    const live = new Set(orders.map((o) => o.id));
    for (const idStr of Object.keys(refs)) {
      const id = Number(idStr);
      if (!live.has(id)) {
        candle.removePriceLine(refs[id]);
        delete refs[id];
      }
    }
    for (const o of orders) {
      if (refs[o.id]) {
        candle.removePriceLine(refs[o.id]);
      }
      refs[o.id] = candle.createPriceLine({
        price: o.price,
        color: o.kind === "stop" ? c.down : c.text,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `${o.kind} ${o.side}`,
      });
    }
  }, [orders, theme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
