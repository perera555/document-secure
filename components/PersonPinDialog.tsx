"use client";

import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import type { Person } from "@/lib/db";
import { pinInUse, removeMemberPin, setMemberPin } from "@/lib/lock";
import { Modal } from "./ui";
import { toast } from "./Toast";

const pinInput = "input text-center text-2xl tracking-[0.5em]";

/** Admin panel: give a person their own PIN — with it they see only their own documents. */
export function PersonPinDialog({ person, hasPin, onClose, onChanged }: { person: Person | null; hasPin: boolean; onClose: () => void; onChanged: () => void }) {
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setPin("");
    setPin2("");
    setError("");
    onClose();
  };

  return (
    <Modal open={!!person} onClose={close} title={person ? `${person.fullName}'s PIN` : "PIN"}>
      {person && (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (!/^\d{4,8}$/.test(pin)) return setError("PIN must be 4 to 8 numbers.");
            if (pin !== pin2) return setError("The two PINs are different.");
            setBusy(true);
            try {
              if (await pinInUse(pin, person.id)) return setError("This PIN is already used. Choose another one.");
              await setMemberPin(person.id, pin);
              toast(`${person.fullName} can now log in with their PIN`);
              onChanged();
              close();
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm text-muted">
            With this PIN, <b>{person.fullName}</b> sees only their own card and documents (view, add, download, print, remove). They cannot see anyone else.
          </p>
          {hasPin && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">A PIN is set. Forgot it? Type a new PIN below and press Reset PIN.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">{hasPin ? "New PIN" : "PIN"} (4–8 numbers)</span>
              <input className={pinInput} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} autoFocus placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label>
              <span className="label">PIN again</span>
              <input className={pinInput} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="••••" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
            </label>
          </div>
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" disabled={busy}><KeyRound size={16} /> {hasPin ? "Reset PIN" : "Set PIN"}</button>
            {hasPin && (
              <button
                type="button"
                className="btn-ghost text-rose-600"
                onClick={async () => {
                  if (!confirm(`Remove ${person.fullName}'s PIN? They will not be able to log in any more.`)) return;
                  await removeMemberPin(person.id);
                  toast("PIN removed");
                  onChanged();
                  close();
                }}
              >
                <Trash2 size={16} /> Remove PIN
              </button>
            )}
            <button type="button" className="btn-ghost ml-auto" onClick={close}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
