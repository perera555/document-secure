"use client";

import { Lock } from "lucide-react";
import type { Person } from "@/lib/db";
import { Avatar } from "./ui";
import { Tilt3D } from "./Tilt3D";

/**
 * A person's card before their PIN is entered: photo, name and relationship only.
 * Private details (ID numbers, address, documents) stay hidden until the PIN is given.
 */
export function LockedPersonCard({ person, onOpen }: { person: Person; onOpen: () => void }) {
  return (
    <Tilt3D className="h-full" max={9}>
      <button
        onClick={onOpen}
        className="group card relative flex h-full min-h-[290px] w-full flex-col overflow-hidden text-left"
        aria-label={`Open ${person.fullName} with PIN`}
      >
        <div className={`flex items-center gap-2 bg-linear-to-r ${person.color} px-4 py-2.5 text-white`}>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Family ID Card</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{person.relationship || "Member"}</span>
          <Lock size={16} className="ml-auto" />
        </div>
        <div
          className="relative flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
          style={{ backgroundImage: "repeating-linear-gradient(115deg, rgb(127 127 127 / 0.07) 0 1px, transparent 1px 14px)" }}
        >
          <div className="rounded-3xl shadow-xl ring-4 ring-card">
            <Avatar person={person} size={96} />
          </div>
          <div>
            <p className="text-lg font-extrabold uppercase tracking-tight">{person.fullName}</p>
            <p className="text-xs text-muted">{person.relationship || "Family member"}</p>
          </div>
          <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-700 transition group-hover:bg-indigo-500/20 dark:text-indigo-300">
            <Lock size={14} /> Tap to open with PIN
          </span>
        </div>
      </button>
    </Tilt3D>
  );
}
