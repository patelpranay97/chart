// Maps a game's performance to a rating label, chartgame-style.

export interface Rating {
  tier: number; // higher = better
  label: string;
  blurb: string;
}

// returnPct = total P/L as % of starting cash.
// edge = returnPct - buyHoldPct (how much you beat just holding).
export function ratePerformance(returnPct: number, edge: number): Rating {
  if (returnPct >= 25)
    return { tier: 6, label: "Masterful Performance", blurb: "Elite tape reading. You crushed it." };
  if (returnPct >= 12)
    return { tier: 5, label: "Excellent Trading", blurb: "Strong, disciplined trades." };
  if (returnPct >= 4)
    return { tier: 4, label: "Solid Session", blurb: "Green and steady — good work." };
  if (returnPct >= -2)
    return {
      tier: 3,
      label: "Roughly Flat",
      blurb: edge >= 0 ? "About even, but you read the trend right." : "Treaded water this round.",
    };
  if (returnPct >= -10)
    return { tier: 2, label: "Rough Round", blurb: "The tape got the better of you." };
  return { tier: 1, label: "Wiped Out", blurb: "Brutal. Reset and run it back." };
}
