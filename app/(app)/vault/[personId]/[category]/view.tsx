"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, FileText, ScanLine } from "lucide-react";
import { db } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { Empty } from "@/components/ui";
import { DocTile } from "@/components/DocTile";

export default function FolderPage() {
  const { personId, category } = useParams<{ personId: string; category: string }>();
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const docs = useLiveQuery(
    () => db.documents.where("[personId+category]").equals([personId, category]).reverse().sortBy("createdAt"),
    [personId, category],
  );
  const c = getCategory(category);

  if (person === undefined || docs === undefined) return <div className="h-64 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />;

  return (
    <div className="space-y-6">
      <Link href={`/vault/${personId}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> {person?.fullName ?? "Back"}
      </Link>

      <section className={`relative overflow-hidden rounded-3xl bg-linear-to-br ${c.gradient} p-6 text-white shadow-xl sm:p-8`}>
        <div className="absolute -right-6 -top-6 text-[140px] leading-none opacity-20">{c.emoji}</div>
        <p className="text-sm text-white/80">{person?.fullName}</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold">
          <span>{c.emoji}</span> {c.label}
        </h1>
        <p className="mt-1 text-sm text-white/80">
          {docs.length} document{docs.length === 1 ? "" : "s"}
        </p>
        <Link href={`/scan?person=${personId}&category=${c.id}`} className="btn mt-5 bg-white text-gray-900 shadow-lg hover:bg-white/90">
          <ScanLine size={18} /> Add to this folder
        </Link>
      </section>

      {docs.length === 0 ? (
        <Empty icon={<FileText size={28} />} title="This folder is empty" text={`Scan or upload a ${c.label.toLowerCase()} document for ${person?.fullName}.`} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {docs.map((d) => (
            <DocTile key={d.id} doc={d} ownerName={person?.fullName} />
          ))}
        </div>
      )}
    </div>
  );
}
