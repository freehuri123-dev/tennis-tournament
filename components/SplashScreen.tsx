"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem("splash-seen") === "yes") return;

    setVisible(true);
    const leaveTimer = window.setTimeout(() => setLeaving(true), 1200);
    const hideTimer = window.setTimeout(() => {
      window.sessionStorage.setItem("splash-seen", "yes");
      setVisible(false);
    }, 1700);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`splash-screen ${leaving ? "leaving" : ""}`}>
      <img alt="테니스 월례대회 시작 화면" src="/inrto2.png" />
    </div>
  );
}
