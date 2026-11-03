import Link from "next/link";
import { ArrowLeft, MessageSquare, ShieldCheck } from "lucide-react";
import { NewDiscussionForm } from "./new-form";
import { requireResident } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewDiscussionPage() {
  const ctx = await requireResident();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/community?tab=discussions" className="mb-5 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Back to community</Link>
      <p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-600">Community</p>
      <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-ink">Start a discussion</h1>
      <p className="mt-2 max-w-xl text-body leading-relaxed text-ink-soft">A question, a suggestion, something lost or found — this is the place for neighbours to think together.</p>
      <div className="mt-6 rounded-[22px] border border-line bg-white p-5 shadow-soft sm:p-6"><NewDiscussionForm requiresApproval={ctx.society.settings?.discussionApproval ?? true} /></div>
    </div>
  );
}
