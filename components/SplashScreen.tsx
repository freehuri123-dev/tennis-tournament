"use client";

import { useEffect, useRef, useState } from "react";
import type { ClubSlug } from "@/lib/domain/club";

const introImages: Record<ClubSlug, string> = {
  stc: "/stc_intro_summer_coast.webp",
  otc: "/otc_intro_summer_coast.webp",
  joogo: "/joogo_intro_summer_coast.webp",
  army: "/army_intro.jpg",
  queensday: "/queensday_intro_ai_design_1.webp"
};

export function SplashScreen({ clubSlug = "stc", startLabel = "시작하기" }: { clubSlug?: ClubSlug; startLabel?: string }) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const startedRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const storageKey = `splash-started:${clubSlug}`;
    if (window.sessionStorage.getItem(storageKey) === "yes") {
      setVisible(false);
      return;
    }

    startedRef.current = false;
    setVisible(true);

    const autoStartTimer = window.setTimeout(() => {
      startApp();
    }, 10000);

    return () => {
      window.clearTimeout(autoStartTimer);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [clubSlug]);

  if (!visible) return null;

  function startApp() {
    if (startedRef.current) return;
    startedRef.current = true;
    setLeaving(true);
    hideTimerRef.current = window.setTimeout(() => {
      window.sessionStorage.setItem(`splash-started:${clubSlug}`, "yes");
      setVisible(false);
    }, 480);
  }

  return (
    <div className={`splash-screen club-${clubSlug} ${leaving ? "leaving" : ""}`}>
      <img alt="테니스매치업 시작 화면" fetchPriority="high" loading="eager" src={introImages[clubSlug]} />
      <button className="splash-start-button" onClick={startApp} type="button">
        {startLabel}
      </button>
    </div>
  );
}
