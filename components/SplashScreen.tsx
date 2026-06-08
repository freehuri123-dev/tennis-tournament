"use client";

import { useEffect, useRef, useState } from "react";
import type { ClubSlug } from "@/lib/domain/club";

const introImages: Record<ClubSlug, string> = {
  stc: "/stc_intro.png",
  otc: "/otc_intro.png",
  joogo: "/joogo_intro.png",
  army: "/army_intro.jpg"
};

export function SplashScreen({ clubSlug = "stc", startLabel = "시작하기" }: { clubSlug?: ClubSlug; startLabel?: string }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const startedRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const storageKey = `splash-started:${clubSlug}`;
    if (window.sessionStorage.getItem(storageKey) === "yes") return;

    startedRef.current = false;
    setVisible(true);

    const autoStartTimer = window.setTimeout(() => {
      startApp();
    }, 5000);

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
    <div className={`splash-screen ${leaving ? "leaving" : ""}`}>
      <img alt="Tennis Tournament Management System intro" src={introImages[clubSlug]} />
      <button className="splash-start-button" onClick={startApp} type="button">
        {startLabel}
      </button>
    </div>
  );
}
