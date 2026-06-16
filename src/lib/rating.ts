// Maps a game's performance to a rating label, chartgame-style.

export interface Rating {
  tier: number; // higher = better
  label: string;
  blurb: string;
}

// Skill is measured by ALPHA — beating a simple buy & hold — not raw profit.
// An ETF drifts up, so always-long just *matches* the market (a mediocre
// score); real edge comes from sitting out drops, shorting, and good timing.
//
// returnPct = total P/L as % of starting cash (the player).
// edge      = returnPct - buyHoldPct (how much you beat just holding).
export function ratePerformance(returnPct: number, edge: number): Rating {
  if (edge >= 15)
    return { tier: 6, label: "Masterful Alpha", blurb: "You demolished buy & hold. Elite timing." };
  if (edge >= 6)
    return { tier: 5, label: "Sharp Edge", blurb: "Clear, repeatable edge over the market." };
  if (edge >= 1.5)
    return { tier: 4, label: "Beat the Market", blurb: "You added real alpha — nicely done." };
  if (edge >= -1.5)
    return {
      tier: 3,
      label: "Matched the Market",
      blurb:
        returnPct >= 0
          ? "Basically buy & hold. Find an edge: sit out drops, time entries."
          : "Held through the fall instead of stepping aside.",
    };
  if (edge >= -8)
    return { tier: 2, label: "Lagged the Market", blurb: "Your trades cost you vs simply holding." };
  return { tier: 1, label: "Churned & Burned", blurb: "Overtrading or wrong-way bets bled your alpha." };
}
