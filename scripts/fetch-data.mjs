// Fetches split/dividend-adjusted daily OHLCV for the supported tickers from
// Yahoo Finance and writes compact JSON to public/data/. Run with: npm run fetch-data
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

// A multi-asset roster so "ETF" isn't one personality: broad US equity, small
// caps, rotating sectors, gold, oil/energy, long bonds, and emerging markets.
const TICKERS = [
  "SPY", "QQQ", "VOO", // broad US equity
  "IWM", // small caps — choppier, fails more
  "XLF", "XLK", "XLU", "XLV", "XLE", // sectors that rotate independently
  "GLD", // gold — mean-reverting, long flat stretches
  "USO", // oil — boom/bust, violent
  "TLT", // long Treasuries — inverse to rates, multi-year bear
  "EEM", "FXI", // emerging markets / China — long stretches sideways/down
];

function round(n, d = 4) {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

async function fetchTicker(symbol) {
  const now = Math.floor(Date.now() / 1000);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
    `?period1=0&period2=${now}&interval=1d&events=div%2Csplit`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`${symbol}: no result`);

  const ts = result.timestamp || [];
  const q = result.indicators.quote[0];
  const adj = result.indicators.adjclose?.[0]?.adjclose;

  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i], v = q.volume[i];
    if (o == null || h == null || l == null || c == null) continue;
    // Back-adjust OHLC by the adjusted/raw close ratio so splits & dividends
    // produce one smooth continuous series (better for a chart-reading game).
    const factor = adj && adj[i] != null && c ? adj[i] / c : 1;
    const date = new Date(ts[i] * 1000).toISOString().slice(0, 10);
    bars.push([
      date,
      round(o * factor),
      round(h * factor),
      round(l * factor),
      round(c * factor),
      v == null ? 0 : Math.round(v),
    ]);
  }
  return { symbol, bars };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = [];
  const failed = [];
  for (const symbol of TICKERS) {
    process.stdout.write(`Fetching ${symbol}... `);
    try {
      const data = await fetchTicker(symbol);
      await writeFile(join(OUT_DIR, `${symbol}.json`), JSON.stringify(data));
      manifest.push({
        symbol,
        bars: data.bars.length,
        start: data.bars[0][0],
        end: data.bars[data.bars.length - 1][0],
      });
      console.log(`${data.bars.length} bars (${data.bars[0][0]} -> ${data.bars[data.bars.length - 1][0]})`);
    } catch (e) {
      failed.push(symbol);
      console.log(`FAILED — ${e.message}`);
    }
  }
  if (failed.length) console.warn(`\n⚠️  ${failed.length} failed: ${failed.join(", ")}`);
  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("Wrote", join(OUT_DIR, "manifest.json"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
