"use client";

import { fmtPct, fmtUSD, fmtUSDCompact } from "@/lib/format";
import { computeProfile, type HistogramBucket, type NetWorthPoint } from "@/lib/stats";
import { useGame } from "@/store/gameStore";

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-fg";
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`font-mono text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function NetWorthChart({ series, base }: { series: NetWorthPoint[]; base: number }) {
  if (series.length < 2) {
    return <div className="grid h-44 place-items-center text-sm text-muted">Play a few games to chart your net worth.</div>;
  }
  const W = 560, H = 200, PAD = { l: 8, r: 8, t: 14, b: 18 };
  const xs = [0, ...series.map((p) => p.day)];
  const ys = [base, ...series.map((p) => p.value)];
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const minX = 0, maxX = Math.max(...xs) || 1;
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;
  const x = (v: number) => PAD.l + ((v - minX) / (maxX - minX)) * innerW;
  const y = (v: number) => PAD.t + innerH - ((v - minY) / spanY) * innerH;
  const path = xs.map((vx, i) => `${i === 0 ? "M" : "L"}${x(vx).toFixed(1)},${y(ys[i]).toFixed(1)}`).join(" ");
  const last = ys[ys.length - 1];
  const up = last >= base;
  const stroke = up ? "var(--up)" : "var(--down)";
  const baseY = y(base);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Net worth over time">
      <defs>
        <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PAD.l} y1={baseY} x2={W - PAD.r} y2={baseY} stroke="var(--line)" strokeDasharray="3 3" />
      <path d={`${path} L${x(maxX)},${baseY} L${x(0)},${baseY} Z`} fill="url(#nw)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      <text x={W - PAD.r} y={PAD.t} textAnchor="end" className="fill-[var(--fg)] font-mono text-[11px]">
        {fmtUSDCompact(last)}
      </text>
      <text x={PAD.l} y={baseY - 3} className="fill-[var(--muted)] text-[10px]">
        {fmtUSDCompact(base)}
      </text>
    </svg>
  );
}

function Histogram({ buckets }: { buckets: HistogramBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="flex h-44 items-end gap-1.5">
      {buckets.map((b) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-t ${b.positive ? "bg-up" : "bg-down"}`}
              style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 3 : 0 }}
              title={`${b.label}: ${b.count}`}
            />
          </div>
          <span className="text-[9px] text-muted">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ played, skipped }: { played: number; skipped: number }) {
  const total = played + skipped || 1;
  const r = 42, C = 2 * Math.PI * r;
  const playedLen = (played / total) * C;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="12" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeWidth="12"
          strokeDasharray={`${playedLen} ${C - playedLen}`}
        />
      </svg>
      <div className="text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Played: {played}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-line" /> Skipped: {skipped}
        </div>
      </div>
    </div>
  );
}

export default function ProfileView() {
  const lifetime = useGame((s) => s.lifetime);
  const startingCapital = useGame((s) => s.startingCapital);
  const s = computeProfile(lifetime, startingCapital);
  const tone = (n: number, flip = false): "up" | "down" | undefined =>
    n > 0 ? (flip ? "down" : "up") : n < 0 ? (flip ? "up" : "down") : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Trader profile</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Net worth" value={fmtUSD(s.netWorth)} tone={tone(s.totalProfit)} />
        <StatCard label="Total return" value={fmtPct(s.totalReturnPct)} tone={tone(s.totalReturnPct)} />
        <StatCard label="ACR" value={fmtPct(s.acr)} tone={tone(s.acr)} />
        <StatCard label="Games played" value={String(s.gamesPlayed)} />
        <StatCard label="Win rate" value={`${(s.winRate * 100).toFixed(0)}%`} />
        <StatCard label="Avg return / game" value={fmtPct(s.avgReturnPct)} tone={tone(s.avgReturnPct)} />
        <StatCard label="Max drawdown" value={fmtPct(-s.maxDrawdownPct)} tone={s.maxDrawdownPct > 0 ? "down" : undefined} />
        <StatCard label="Sharpe" value={s.sharpe.toFixed(2)} tone={tone(s.sharpe)} />
        <StatCard label="Std dev" value={`${s.stdReturnPct.toFixed(1)}%`} />
        <StatCard label="Liquidations" value={String(s.liquidations)} tone={s.liquidations > 0 ? "down" : undefined} />
        <StatCard label="Skips" value={String(s.skipped)} />
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-2 text-sm font-semibold text-muted">Net worth</h2>
        <NetWorthChart series={s.netWorthSeries} base={startingCapital} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-3 text-sm font-semibold text-muted">Per-game return distribution</h2>
          <Histogram buckets={s.histogram} />
        </div>
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-3 text-sm font-semibold text-muted">Play vs skip</h2>
          <Donut played={s.gamesPlayed} skipped={s.skipped} />
          <p className="mt-3 text-xs text-muted">Skip rate {(s.skipRate * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted">Badges</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {s.badges.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                b.earned ? "border-accent/40 bg-accent/5" : "border-line opacity-50"
              }`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-full text-lg ${b.earned ? "bg-accent text-accent-fg" : "bg-panel-2"}`}>
                {b.earned ? "★" : "☆"}
              </span>
              <div>
                <div className="text-sm font-semibold">{b.label}</div>
                <div className="text-[11px] text-muted">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
