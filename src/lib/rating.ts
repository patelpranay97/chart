// Maps a game's performance to a rating label, chartgame-style.

export interface Rating {
  tier: number; // higher = better
  label: string;
  blurb: string;
}

// Score is simply profit — return on the account this game. The difficulty
// comes from the market you're dealt (it chops, trends up, or trends down),
// not from any benchmark.
//
// returnPct = total P/L as % of starting cash.
export function ratePerformance(returnPct: number): Rating {
  if (returnPct >= 25)
    return { tier: 6, label: "Masterful Run", blurb: "Huge profit — elite tape reading." };
  if (returnPct >= 12)
    return { tier: 5, label: "Big Winner", blurb: "Strong, profitable trading." };
  if (returnPct >= 4)
    return { tier: 4, label: "Profitable", blurb: "Green and steady — nice work." };
  if (returnPct >= -2)
    return { tier: 3, label: "Roughly Flat", blurb: "About break-even this round." };
  if (returnPct >= -10)
    return { tier: 2, label: "Down Round", blurb: "Red. The market got the better of you." };
  return { tier: 1, label: "Wiped Out", blurb: "Brutal. Reset and run it back." };
}
