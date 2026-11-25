"use client";

import { useEffect, useState } from "react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const daysIn = (y: number, m: number) => new Date(y || 2000, m, 0).getDate(); // m is 1-12; leap year when year unknown

function parse(v?: string) {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) } : { y: "", m: "", d: "" };
}

/**
 * Day / Month / Year dropdowns — much easier than a calendar for dates far in the past
 * (birthdays) or future (expiry). Value is "YYYY-MM-DD" once all three are chosen, else "".
 */
export function DateSelect({
  value,
  onChange,
  fromYear = 1900,
  toYear = new Date().getFullYear(),
  showAge = false,
  id,
}: {
  value?: string;
  onChange: (v: string) => void;
  fromYear?: number;
  toYear?: number;
  showAge?: boolean;
  id?: string;
}) {
  const [parts, setParts] = useState(() => parse(value));

  // Follow outside changes (e.g. details filled from a scanned ID card).
  useEffect(() => {
    const p = parse(value);
    if (value && (p.y !== parts.y || p.m !== parts.m || p.d !== parts.d)) setParts(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function update(next: Partial<typeof parts>) {
    const p = { ...parts, ...next };
    // Keep the day valid for the chosen month (e.g. 31 → 30 for April).
    if (p.d && p.m) {
      const max = daysIn(Number(p.y), Number(p.m));
      if (Number(p.d) > max) p.d = String(max);
    }
    setParts(p);
    onChange(p.y && p.m && p.d ? `${p.y}-${p.m.padStart(2, "0")}-${p.d.padStart(2, "0")}` : "");
  }

  const years: number[] = [];
  for (let y = toYear; y >= fromYear; y--) years.push(y);
  const maxDay = parts.m ? daysIn(Number(parts.y), Number(parts.m)) : 31;

  let age: number | null = null;
  if (showAge && value) {
    const b = new Date(value);
    const now = new Date();
    age = now.getFullYear() - b.getFullYear() - (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
  }

  const sel = "input cursor-pointer appearance-none bg-[length:12px] bg-[right_0.6rem_center] bg-no-repeat pr-7";
  const arrow = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%2364748b' stroke-width='1.6'/%3E%3C/svg%3E\")",
  };

  return (
    <div>
      <div className="grid grid-cols-[1fr_1.6fr_1.3fr] gap-2">
        <select id={id} aria-label="Day" className={sel} style={arrow} value={parts.d} onChange={(e) => update({ d: e.target.value })}>
          <option value="">Day</option>
          {Array.from({ length: maxDay }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
          ))}
        </select>
        <select aria-label="Month" className={sel} style={arrow} value={parts.m} onChange={(e) => update({ m: e.target.value })}>
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1)}>{name}</option>
          ))}
        </select>
        <select aria-label="Year" className={sel} style={arrow} value={parts.y} onChange={(e) => update({ y: e.target.value })}>
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
      {age !== null && age >= 0 && <p className="mt-1 text-xs text-muted">{age} years old</p>}
    </div>
  );
}

export const GENDERS = ["Male", "Female", "Other"];

export function GenderSelect({ value, onChange, id }: { value?: string; onChange: (v: string) => void; id?: string }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gender" id={id}>
      {GENDERS.map((g) => {
        const on = (value ?? "").toLowerCase() === g.toLowerCase();
        return (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? "" : g)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              on ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" : "border-border bg-background hover:bg-black/3 dark:hover:bg-white/5"
            }`}
          >
            {g === "Male" ? "👨 " : g === "Female" ? "👩 " : "🧑 "}
            {g}
          </button>
        );
      })}
    </div>
  );
}
