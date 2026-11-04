"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, LockKeyhole, Users, Vote } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

export function PollCard({ pollId, question, description, options, counts, total, userVote, status, endsLabel, audience, secret, hideResults, canVote, compact = false }: {
  pollId: string;
  question: string;
  description?: string | null;
  options: Option[];
  counts: Record<string, number>;
  total: number;
  userVote?: string | null;
  status: string;
  endsLabel: string;
  audience: string;
  secret?: boolean;
  hideResults?: boolean;
  canVote: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(userVote ?? null);
  const [localCounts, setLocalCounts] = useState(counts);
  const [localTotal, setLocalTotal] = useState(total);
  const [busy, setBusy] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(status !== "active" || (!hideResults && !!userVote));
  const closed = status !== "active";

  async function vote(optionId: string) {
    if (selected || busy || closed) return;
    setBusy(optionId);
    try {
      const res = await fetch("/api/community/poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollId, optionId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record your vote.");
      setSelected(optionId);
      setLocalCounts((c) => ({ ...c, [optionId]: (c[optionId] ?? 0) + 1 }));
      setLocalTotal((t) => t + 1);
      setShowResults(!hideResults);
      toast.success("Vote recorded — thank you");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record your vote.");
    } finally {
      setBusy(null);
    }
  }

  const resultsVisible = status !== "active" || (!hideResults && (showResults || !!selected));
  return (
    <div className={cn("rounded-2xl border border-line bg-white", compact ? "p-4" : "p-5 shadow-[0_1px_2px_rgba(19,26,42,0.03)]")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Vote className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold uppercase tracking-[0.1em] text-brand-600">{closed ? "Poll closed" : "Open poll"} · {audience === "owners" ? "Owners" : "All residents"}</p>
          <p className="mt-1 text-body font-semibold leading-snug text-ink">{question}</p>
          {description ? <p className="mt-1 text-caption leading-relaxed text-muted">{description}</p> : null}
        </div>
        {secret ? <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f3f9] px-2 py-1 text-caption font-semibold text-muted"><LockKeyhole className="size-4" /> Secret</span> : null}
      </div>

      <div className="mt-3 space-y-1.5">
        {options.map((o) => {
          const count = localCounts[o.id] ?? 0;
          const pct = localTotal ? Math.round((count / localTotal) * 100) : 0;
          const isSelected = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => vote(o.id)}
              disabled={!!selected || !!busy || !canVote || closed}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all",
                isSelected ? "border-brand-400 bg-brand-50/50 ring-1 ring-brand-200" : "border-line bg-white",
                !selected && canVote && !closed ? "hover:border-brand-300 hover:bg-brand-50/30" : "",
              )}
            >
              {resultsVisible ? <span className={cn("absolute inset-y-0 left-0 rounded-r-lg", isSelected ? "bg-brand-100/80" : "bg-[#f4f6fb]")} style={{ width: `${pct}%` }} /> : null}
              <span className="relative flex items-center gap-2">
                <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border", isSelected ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong bg-white")}>
                  {isSelected ? <Check className="size-4" strokeWidth={3} /> : null}
                </span>
                <span className="flex-1 text-caption font-medium text-ink">{o.label}</span>
                {resultsVisible ? <span className="text-caption font-semibold text-ink-soft">{pct}%</span> : null}
                {busy === o.id ? <span className="size-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-caption text-muted">
        <span className="inline-flex items-center gap-1"><Users className="size-4" /> {localTotal} {localTotal === 1 ? "vote" : "votes"}{selected ? " · you voted" : ""}</span>
        <span>{endsLabel}</span>
      </div>
      {!canVote && !selected ? <p className="mt-2 rounded-lg bg-canvas px-2.5 py-1.5 text-caption text-muted">{audience === "owners" ? "Only owners can vote in this poll." : audience === "tenants" ? "Only tenants can vote in this poll." : "Voting is closed."}</p> : null}
      {hideResults && !selected && !closed ? null : null}
    </div>
  );
}
