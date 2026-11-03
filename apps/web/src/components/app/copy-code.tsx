"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyCode({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          toast.success("Pickup code copied");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Could not copy — note it down instead.");
        }
      }}
      className={className ?? "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10px] font-semibold text-ink-soft hover:border-brand-200 hover:text-brand-700"}
    >
      {copied ? <Check className="size-3 text-mint-600" /> : <Copy className="size-3" />} {copied ? "Copied" : "Copy"}
    </button>
  );
}
