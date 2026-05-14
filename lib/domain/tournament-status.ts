import type { Tournament } from "./types";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTournamentStatusByDate(date: string, today = new Date()): Tournament["status"] {
  const todayKey = toDateKey(today);
  if (date < todayKey) return "completed";
  if (date === todayKey) return "active";
  return "draft";
}

export function withDateStatus<T extends Tournament>(tournament: T, today = new Date()): T {
  return { ...tournament, status: getTournamentStatusByDate(tournament.date, today) };
}
