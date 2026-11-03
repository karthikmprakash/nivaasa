"use client";

import { useActionState, useState } from "react";
import { createPreApproval, type PreApproveState } from "@/lib/actions/visitors";
import { Button } from "@/components/ui/primitives";
import { PlatformPicker } from "@/components/app/platform-picker";
import { cn, todayISO } from "@/lib/utils";
import { Car, PackageOpen, UserRound, Users, Wrench, ShieldCheck } from "lucide-react";

const types = [
  { value: "guest", label: "Guest", icon: UserRound, hint: "Friends & family" },
  { value: "delivery", label: "Delivery", icon: PackageOpen, hint: "Food & parcels" },
  { value: "cab", label: "Cab", icon: Car, hint: "Pickup & drop" },
  { value: "vendor", label: "Vendor", icon: Wrench, hint: "Service visit" },
  { value: "domestic_help", label: "Daily help", icon: Users, hint: "Regular help" },
];

const fieldClass = "h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-base text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function PreApproveForm() {
  const [state, action, pending] = useActionState<PreApproveState, FormData>(createPreApproval, {});
  const [type, setType] = useState("guest");
  const [days, setDays] = useState(1);
  const [companyChoice, setCompanyChoice] = useState("");
  return (
    <form action={action} className="space-y-6">
      <div>
        <p className="mb-2 text-body font-semibold text-ink-soft">Who are you expecting?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {types.map((t) => (
            <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => { setType(t.value); setCompanyChoice(""); }} className={cn("flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition-colors", type === t.value ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white hover:border-brand-200")}>
              <t.icon className={cn("size-4", type === t.value ? "text-brand-600" : "text-muted")} />
              <span className="text-caption font-semibold text-ink">{t.label}</span>
              <span className="text-caption leading-none text-muted">{t.hint}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-body font-semibold text-ink-soft">Visitor name <span className="text-blush-500">*</span></label>
          <input id="name" name="name" required placeholder="e.g. Rohit Sharma" className={fieldClass} />
          {state.fieldErrors?.name ? <p className="mt-1 text-caption text-[#c43d4d]">{state.fieldErrors.name}</p> : null}
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-body font-semibold text-ink-soft">Phone number</label>
          <input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" className={fieldClass} />
          {state.fieldErrors?.phone ? <p className="mt-1 text-caption text-[#c43d4d]">{state.fieldErrors.phone}</p> : null}
          <p className="mt-1 text-caption text-muted">Used only for the gate to reach them if needed.</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className={cn("min-w-0", type === "delivery" && "sm:col-span-2")}>
          <label htmlFor="companyChoice" className="mb-1.5 block text-body font-semibold text-ink-soft">{type === "delivery" ? "Delivery platform" : type === "cab" ? "Cab service" : type === "vendor" ? "Company" : "Company / note"}</label>
          {type === "delivery" || type === "cab" ? (
            <PlatformPicker key={type} type={type} value={companyChoice} onChange={setCompanyChoice} />
          ) : <input id="companyChoice" name="company" placeholder="Optional" className={fieldClass} />}
        </div>
        {type !== "delivery" ? <div className="min-w-0">
          <label htmlFor="vehicleNo" className="mb-1.5 block text-body font-semibold text-ink-soft">Vehicle number <span className="font-normal text-muted">(optional)</span></label>
          <input id="vehicleNo" name="vehicleNo" placeholder="KA 01 AB 1234" className={fieldClass} />
        </div> : null}
      </div>

      <div>
        <label htmlFor="purpose" className="mb-1.5 block text-body font-semibold text-ink-soft">Purpose of visit</label>
        <input id="purpose" name="purpose" placeholder={type === "delivery" ? "Food delivery" : type === "guest" ? "Dinner at home" : "Short description"} className={fieldClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="mb-1.5 block text-body font-semibold text-ink-soft">Valid from <span className="text-blush-500">*</span></label>
          <input id="date" name="date" type="date" defaultValue={todayISO()} min={todayISO()} required className={fieldClass} />
          {state.fieldErrors?.date ? <p className="mt-1 text-caption text-[#c43d4d]">{state.fieldErrors.date}</p> : null}
        </div>
        <div>
          <p className="mb-1.5 text-body font-semibold text-ink-soft">Valid for</p>
          <div className="grid grid-cols-2 gap-2">
          {[1, 3, 7, 14].map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={cn("min-h-11 min-w-0 whitespace-nowrap rounded-xl border px-2 text-body font-semibold leading-tight", days === d ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-ink-soft")}>{`${d} ${d === 1 ? "day" : "days"}`}</button>
            ))}
          </div>
          <input type="hidden" name="days" value={days} />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-body font-semibold text-ink-soft">Notes for the guard</label>
        <textarea id="notes" name="notes" rows={3} placeholder="Anything the security team should know?" className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-base leading-relaxed text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
      </div>

      {type === "delivery" ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#fbfcff] p-3.5">
          <input type="checkbox" name="leaveAtGate" className="mt-0.5 size-4 rounded border-line-strong accent-[#3155d8]" />
          <span><span className="block text-caption font-semibold text-ink">Allow leave at gate</span><span className="mt-0.5 block text-caption leading-relaxed text-muted">The guard can keep the delivery at the gate and send you a pickup code instead of sending the delivery executive up.</span></span>
        </label>
      ) : null}

      {state.error ? <div role="alert" className="rounded-xl border border-[#f3c9cd] bg-[#fdeced] px-3.5 py-2.5 text-body font-medium text-[#b53a48]">{state.error}</div> : null}

      <div className="flex flex-col-reverse items-stretch gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-caption text-muted"><ShieldCheck className="size-4 text-mint-600" /> A 6-digit passcode is generated. Share it with your visitor.</p>
        <Button type="submit" disabled={pending} size="lg" className="sm:min-w-44">{pending ? "Generating pass…" : "Generate visitor pass"}</Button>
      </div>
    </form>
  );
}
