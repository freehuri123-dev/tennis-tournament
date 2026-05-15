"use client";

import { useEffect, useState } from "react";
import type { ClubSlug } from "@/lib/domain/club";

const introImages: Record<ClubSlug, string> = {
  stc: "/stc_intro.png",
  otc: "/otc_intro.png"
};

export function SplashScreen({ clubSlug = "stc" }: { clubSlug?: ClubSlug }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const storageKey = `splash-seen:${clubSlug}`;
    if (window.sessionStorage.getItem(storageKey) === "yes") return;

    setVisible(true);
    const leaveTimer = window.setTimeout(() => setLeaving(true), 2600);
    const hideTimer = window.setTimeout(() => {
      window.sessionStorage.setItem(storageKey, "yes");
      setVisible(false);
    }, 3200);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [clubSlug]);

  if (!visible) return null;

  return (
    <div className={`splash-screen ${leaving ? "leaving" : ""}`}>
      <img alt="테니스 월례대회 시작 화면" src={introImages[clubSlug]} />
    </div>
  );
}
