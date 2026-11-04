import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PreApproveForm } from "./pre-approve-form";
import { requireResident } from "@/lib/queries";
import { todayISO } from "@/lib/utils";

export const metadata: Metadata = { title: "Pre-approve a visitor" };

export default async function NewVisitorPage({ searchParams }: { searchParams: Promise<{ type?: string; mode?: string }> }) {
  const { unit } = await requireResident();
  const { type, mode } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/visitors" className="mb-4 inline-flex min-h-11 items-center gap-2 text-caption font-semibold text-brand-700 hover:text-brand-800"><ArrowLeft aria-hidden="true" className="size-4" /> Visitors</Link>
      <h1 className="text-title font-semibold leading-tight tracking-[-0.03em] text-ink">Pre-approve a visitor</h1>
      <p className="mt-2 text-body leading-relaxed text-ink-soft">Create a gate pass for Home {unit.number}, or register someone who works at your home regularly.</p>
      <div className="mt-6 rounded-panel border border-line bg-white p-4 sm:p-6">
        <PreApproveForm today={todayISO()} initialType={type} daily={mode === "daily"} />
      </div>
    </div>
  );
}
