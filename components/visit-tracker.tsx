"use client";

import { useEffect } from "react";

export function VisitTracker() {
  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
    const key = "alojetcep-visit-day";
    try {
      if (window.sessionStorage.getItem(key) === today) return;
      window.sessionStorage.setItem(key, today);
    } catch {
      // If browser storage is unavailable, keep the site usable and skip counting.
      return;
    }
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
