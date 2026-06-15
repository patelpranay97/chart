"use client";

import { create } from "zustand";

type Theme = "dark" | "light";
const KEY = "cg_theme";

interface ThemeState {
  theme: Theme;
  init: () => void;
  toggle: () => void;
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "dark",
  init: () => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "dark";
    set({ theme: stored });
    apply(stored);
  },
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    apply(next);
    if (typeof window !== "undefined") localStorage.setItem(KEY, next);
  },
}));
