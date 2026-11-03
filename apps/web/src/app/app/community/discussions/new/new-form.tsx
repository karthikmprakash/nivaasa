"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { createDiscussion, type DiscussionState } from "@/lib/actions/community";
import { SubmitButton } from "@/components/ui/client";

export function NewDiscussionForm({ requiresApproval }: { requiresApproval: boolean }) {
  const [state, action] = useActionState<DiscussionState, FormData>(createDiscussion, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-body font-semibold text-ink-soft">Title</label>
        <input id="title" name="title" required placeholder="What would you like to discuss?" className="h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        {state.fieldErrors?.title ? <p className="mt-1 text-caption text-[#c43d4d]">{state.fieldErrors.title}</p> : null}
      </div>
      <div>
        <label htmlFor="category" className="mb-1.5 block text-body font-semibold text-ink-soft">Category</label>
        <select id="category" name="category" className="h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100">
          <option value="general">General</option>
          <option value="suggestion">Suggestion</option>
          <option value="question">Question</option>
          <option value="lost_found">Lost & found</option>
          <option value="safety">Safety</option>
        </select>
      </div>
      <div>
        <label htmlFor="body" className="mb-1.5 block text-body font-semibold text-ink-soft">Details</label>
        <textarea id="body" name="body" required minLength={10} rows={7} placeholder="Share the context so your neighbours can respond thoughtfully…" className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        {state.fieldErrors?.body ? <p className="mt-1 text-caption text-[#c43d4d]">{state.fieldErrors.body}</p> : null}
      </div>
      {state.error ? <div className="rounded-xl border border-[#f3c9cd] bg-[#fdeced] px-3.5 py-2.5 text-body font-medium text-[#b53a48]">{state.error}</div> : null}
      <div className="flex flex-col-reverse items-start justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <p className="flex items-start gap-1.5 text-caption leading-relaxed text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-mint-600" /> {requiresApproval ? "Posts are reviewed by the committee before they go live." : "Your post will be visible to your community immediately."}</p>
        <SubmitButton size="lg" pendingText="Posting…">Post discussion</SubmitButton>
      </div>
    </form>
  );
}
