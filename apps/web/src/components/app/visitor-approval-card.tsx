"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, PackageOpen, X } from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui/primitives";
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
      <div role="status" className={cn("flex items-center gap-3 rounded-2xl border border-line bg-white p-4", compact && "p-3.5")}>
        <span className={cn("grid size-9 place-items-center rounded-full", done === "deny" ? "bg-[#fdeced] text-[#c43d4d]" : "bg-mint-50 text-mint-600")}>
          {done === "deny" ? <X className="size-4" /> : <Check className="size-4" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-ink">{done === "deny" ? "Entry declined" : done === "leave_at_gate" ? "Kept at the gate" : "Visitor approved"}</p>
          <p className="text-caption text-muted">{visitor.name} {done === "leave_at_gate" ? "· collect with code " + visitor.code : "· the guard has been informed"}</p>
        </div>
      </div>
    );
  }

  return (
    <div aria-busy={!!busy} className={cn("rounded-panel border border-line bg-white p-5", compact && "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={visitor.name} color={visitor.photoColor} size={compact ? "sm" : "md"} />
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-ink">{visitor.name}</p>
            <p className="truncate text-caption text-muted">
              {visitor.company ? `${visitor.company} · ` : ""}{visitor.purpose ?? typeLabel[visitor.type] ?? "Visitor"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="warning" dot>At the gate</Badge>
          <span className="text-caption text-muted">{timeAgo(visitor.createdAt)}</span>
        </div>
      </div>
      {visitor.vehicleNo ? <p className="mt-2 rounded-lg bg-canvas px-2.5 py-1.5 text-caption font-medium text-ink-soft">Vehicle · {visitor.vehicleNo}</p> : null}
      {visitor.notes ? <p className="mt-2 line-clamp-2 text-caption leading-relaxed text-muted">{visitor.notes}</p> : null}
      <div className={cn("mt-4 grid gap-2", visitor.type === "delivery" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2")}>
        <Button variant="dangerSoft" size="md"
          onClick={() => respond("deny")}
          disabled={!!busy}
          className="w-full"
        >
          {busy === "deny" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Deny
        </Button>
        <Button variant="primary" size="md"
          onClick={() => respond("approve")}
          disabled={!!busy}
          className="w-full"
        >
          {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve
        </Button>
        {visitor.type === "delivery" ? (
          <Button variant="outline" size="md"
            onClick={() => respond("leave_at_gate")}
            disabled={!!busy}
            className="w-full sm:col-span-2"
          >
            {busy === "leave_at_gate" ? <Loader2 className="size-4 animate-spin" /> : <><PackageOpen className="size-4" /><span>Leave at gate</span></>}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
