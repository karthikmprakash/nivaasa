"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareNoticeButton({ title, text }: { title: string; text: string }) {
  const [shared, setShared] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShared(true);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast.success("Link copied");
    } catch {
      // A cancelled native share sheet is not an error.
    }
  }

  return (
    <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-caption font-semibold text-ink-soft hover:border-brand-200 hover:text-brand-700">
      {shared ? <Check className="size-4 text-mint-600" /> : <Share2 className="size-4" />} {shared ? "Shared" : "Share"}
    </button>
  );
}
