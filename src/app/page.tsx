"use client";

import { useEffect } from "react";
import EndGameScreen from "@/components/EndGameScreen";
import GameScreen from "@/components/GameScreen";
import Header from "@/components/Header";
import SetupScreen from "@/components/SetupScreen";
import { useGame } from "@/store/gameStore";
import { useTheme } from "@/store/theme";

export default function Home() {
  const phase = useGame((s) => s.phase);
  const initGame = useGame((s) => s.init);
  const initTheme = useTheme((s) => s.init);

  useEffect(() => {
    initGame();
    initTheme();
  }, [initGame, initTheme]);

  return (
    <>
      <Header />
      <main className="min-h-0 flex-1 overflow-y-auto">
        {phase === "setup" && <SetupScreen />}
        {phase === "playing" && <GameScreen />}
        {phase === "ended" && <EndGameScreen />}
      </main>
    </>
  );
}
