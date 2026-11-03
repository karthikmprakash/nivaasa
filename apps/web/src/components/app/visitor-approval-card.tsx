"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, PackageOpen, X } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/primitives";
import { cn, timeAgo } from "@/lib/utils";

type Visitor = {
  id: string;
  name: string;
  company: string | null;
  type: string;
  purpose: string | null;
  photoColor: string | null;
  code: string | null;
  createdAt: string | number | Date;
  notes: string | null;
  vehicleNo: string | null;
};

const typeLabel: Record<string, string> = {
  guest: "Guest", delivery: "Delivery", cab: "Cab", domestic_help: "Daily help", vendor: "Vendor", other: "Visitor",
};

export function VisitorApprovalCard({ visitor, compact = false }: { visitor: Visitor; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<"approve" | "deny" | "leave_at_gate" | null>(null);

  async function respond(action: "approve" | "deny" | "leave_at_gate") {
    setBusy(action);
    try {
      const res = await fetch(`/api/visitors/${visitor.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setDone(action);
      toast.success(action === "deny" ? "Entry declined" : action === "leave_at_gate" ? "The guard will keep it at the gate" : "Visitor approved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the request");
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    return (
      <div className={cn("flex items-center gap-3 rounded-2xl border border-line bg-white p-4", compact && "p-3.5")}>
        <span className={cn("grid size-9 place-items-center rounded-full", done === "deny" ? "bg-[#fdeced] text-[#c43d4d]" : "bg-mint-50 text-mint-600")}>
          {done === "deny" ? <X className="size-4" /> : <Check className="size-4" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-ink">{done === "deny" ? "Entry declined" : done === "leave_at_gate" ? "Kept at the gate" : "Visitor approved"}</p>
          <p className="text-[10.5px] text-muted">{visitor.name} {done === "leave_at_gate" ? "· collect with code " + visitor.code : "· the guard has been informed"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(19,26,42,0.03)]", compact && "p-3.5")}>
      <div className="absolute inset-y-0 left-0 w-[3px] bg-blush-400" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={visitor.name} color={visitor.photoColor} size={compact ? "sm" : "md"} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{visitor.name}</p>
            <p className="truncate text-[10.5px] text-muted">
              {visitor.company ? `${visitor.company} · ` : ""}{visitor.purpose ?? typeLabel[visitor.type] ?? "Visitor"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="pink" dot>At the gate</Badge>
          <span className="text-[9px] text-muted">{timeAgo(visitor.createdAt)}</span>
        </div>
      </div>
      {visitor.vehicleNo ? <p className="mt-2 rounded-lg bg-canvas px-2.5 py-1.5 text-[10px] font-medium text-ink-soft">Vehicle · {visitor.vehicleNo}</p> : null}
      {visitor.notes ? <p className="mt-2 line-clamp-2 text-[10.5px] leading-relaxed text-muted">{visitor.notes}</p> : null}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <button
          onClick={() => respond("deny")}
          disabled={!!busy}
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-[11px] font-semibold text-ink-soft transition-colors hover:border-[#f3c9cd] hover:bg-[#fdeced] hover:text-[#c43d4d] disabled:opacity-50"
        >
          {busy === "deny" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} Deny
        </button>
        {visitor.type === "delivery" ? (
          <button
            onClick={() => respond("leave_at_gate")}
            disabled={!!busy}
            className="flex h-9 flex-col items-center justify-center rounded-xl border border-line bg-white text-[9px] font-semibold leading-tight text-ink-soft transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
          >
            {busy === "leave_at_gate" ? <Loader2 className="size-3.5 animate-spin" /> : <><PackageOpen className="size-3.5" /><span>Leave at gate</span></>}
          </button>
        ) : (
          <div className="flex h-9 items-center justify-center rounded-xl bg-canvas text-[9.5px] font-medium text-muted">Waiting</div>
        )}
        <button
          onClick={() => respond("approve")}
          disabled={!!busy}
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-mint-600 text-[11px] font-semibold text-white transition-colors hover:bg-[#187a4f] disabled:opacity-50"
        >
          {busy === "approve" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Approve
        </button>
      </div>
    </div>
  );
}
