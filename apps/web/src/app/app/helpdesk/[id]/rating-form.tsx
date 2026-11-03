"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { rateTicket } from "@/lib/actions/helpdesk";
import { SubmitButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

export function RatingForm({ ticketId }: { ticketId: string }) {
  const [rating, setRating] = useState(0);
  return (
    <form action={rateTicket} className="mt-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="p-0.5">
            <Star className={cn("size-5", n <= rating ? "fill-[#d9a23a] text-[#d9a23a]" : "text-line-strong")} />
          </button>
        ))}
      </div>
      <textarea name="feedback" rows={2} placeholder="Anything we should know? (optional)" className="mt-2 w-full rounded-xl border border-line-strong px-3 py-2 text-caption focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
      <SubmitButton size="sm" className="mt-2" disabled={!rating}>Submit feedback</SubmitButton>
    </form>
  );
}
