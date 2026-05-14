export function normalizeMatchScore(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(6, Math.max(0, Math.trunc(parsed)));
}
