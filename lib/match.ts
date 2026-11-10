import type { Person } from "./db";
import type { Extraction } from "./extract-types";

const TITLES = new Set(["mr", "mrs", "ms", "miss", "dr", "rev", "prof", "master", "baby", "hon"]);

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z඀-෿஀-௿\s.]/g, " ")
    .split(/[\s.]+/)
    .filter((t) => t && !TITLES.has(t));
}

/**
 * Scores how likely two names refer to the same person (0..1).
 * Handles initials forms: "P R Perera" ≈ "Pathirage Ranjith Perera".
 */
export function nameScore(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  if (ta.join(" ") === tb.join(" ")) return 1;

  const longA = ta.filter((t) => t.length > 1);
  const longB = tb.filter((t) => t.length > 1);
  const sharedLong = longA.filter((t) => longB.includes(t));
  if (sharedLong.length === 0) return 0;

  const initA = ta.map((t) => t[0]);
  const initB = tb.map((t) => t[0]);
  const [short, long] = initA.length <= initB.length ? [initA, initB] : [initB, initA];
  let hit = 0;
  const pool = [...long];
  for (const c of short) {
    const i = pool.indexOf(c);
    if (i >= 0) { hit++; pool.splice(i, 1); }
  }
  const initialRatio = hit / short.length;
  const longRatio = sharedLong.length / Math.min(longA.length, longB.length);
  const score = 0.45 * longRatio + 0.5 * initialRatio;
  // Same surname but a different initial (S Perera vs P R Perera) is a different person.
  return Math.min(0.99, initialRatio < 1 ? score * 0.7 : score);
}

export function findOwner(people: Person[], ex: Extraction): { person: Person; score: number } | null {
  let best: { person: Person; score: number } | null = null;
  const names = [ex.ownerName, ...ex.ownerNameVariants].filter(Boolean);
  const idNorm = (s?: string) => (s ?? "").replace(/\s/g, "").toUpperCase();
  for (const p of people) {
    let score = 0;
    if (ex.nicNumber && idNorm(p.nicNumber) === idNorm(ex.nicNumber)) score = 1;
    if (ex.documentNumber && p.passportNumber && idNorm(p.passportNumber) === idNorm(ex.documentNumber)) score = 1;
    for (const n of names) score = Math.max(score, nameScore(n, p.fullName));
    if (!best || score > best.score) best = { person: p, score };
  }
  return best && best.score >= 0.6 ? best : null;
}
