"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import ProfileView from "@/components/ProfileView";
import { useGame } from "@/store/gameStore";
import { useTheme } from "@/store/theme";

export default function ProfilePage() {
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
        <ProfileView />
      </main>
    </>
  );
}
