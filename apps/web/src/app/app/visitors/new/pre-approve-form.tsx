"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Car, KeyRound, PackageOpen, UserRound, Users, Wrench } from "lucide-react";
import { createPreApproval, type PreApproveState } from "@/lib/actions/visitors";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { AddHelpDialog } from "@/components/app/household-dialogs";
import { PlatformPicker } from "@/components/app/platform-picker";
import { cn } from "@/lib/utils";
import { MAX_PASS_DAYS, shiftPassDate } from "@/lib/visitor-pass-rules";

const types = [
  { value: "guest", label: "Guest", icon: UserRound },
  { value: "delivery", label: "Delivery", icon: PackageOpen },
  { value: "cab", label: "Cab", icon: Car },
  { value: "vendor", label: "Vendor", icon: Wrench },
  { value: "daily_help", label: "Daily help", icon: Users },
] as const;

type VisitorType = (typeof types)[number]["value"];
const sectionClass = "space-y-3 border-t border-line pt-5";
const legendClass = "text-section font-semibold text-ink";

export function PreApproveForm({ today, initialType, daily }: { today: string; initialType?: string; daily: boolean }) {
  const [state, action, pending] = useActionState<PreApproveState, FormData>(createPreApproval, {});
  const [type, setType] = useState<VisitorType>(types.find((item) => item.value === initialType)?.value ?? "guest");
  const [recurring, setRecurring] = useState(initialType === "cab" && daily);
  const [companyChoice, setCompanyChoice] = useState("");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [keepParcel, setKeepParcel] = useState(false);
  const [validFrom, setValidFrom] = useState(today);
  const [validTo, setValidTo] = useState(initialType === "cab" && daily ? shiftPassDate(today, 6) : today);
  const [preset, setPreset] = useState(initialType === "cab" && daily ? "7 days" : "Today");
  const isDailyCab = type === "cab" && recurring;
  const dateRange = type === "guest" || isDailyCab;
  const maxEnd = shiftPassDate(validFrom, MAX_PASS_DAYS - 1);

  function chooseDates(label: string, start: string, days: number) {
    setValidFrom(start);
    setValidTo(shiftPassDate(start, days - 1));
    setPreset(label);
  }

  function selectType(value: VisitorType) {
    setType(value);
    setCompanyChoice("");
    setNotes("");
    setKeepParcel(false);
    setRecurring(false);
    chooseDates("Today", today, 1);
  }

  return (
    <form action={action} className="space-y-5">
      <fieldset disabled={pending} className="min-w-0">
        <legend className={legendClass}>Who are you expecting?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {types.map(({ value, label, icon: Icon }) => (
            <label key={value} className={cn("min-w-0 cursor-pointer", value === "daily_help" && "col-span-2 sm:col-span-1")}>
              <input className="peer sr-only" type="radio" name="type" value={value} checked={type === value} onChange={() => selectType(value)} />
              <span className="flex min-h-12 items-center gap-2 rounded-control border border-line px-3 py-2 text-body font-semibold text-ink-soft peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 sm:flex-col sm:justify-center sm:px-1.5">
                <Icon aria-hidden="true" className="size-4 shrink-0" /> {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {type === "daily_help" ? (
        <section className={sectionClass} aria-labelledby="daily-help-registration">
          <h2 id="daily-help-registration" className={legendClass}>Register daily help</h2>
          <p className="text-body leading-relaxed text-ink-soft">Add a housekeeper, cook or driver to your household. Once security verifies their profile, they can give their phone number at the gate to check in and out each day.</p>
          <p className="text-body leading-relaxed text-ink-soft">You can see their attendance and leave a private rating and review in My home.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <AddHelpDialog primary />
            <Link href="/app/my-home#help" className="inline-flex min-h-11 items-center gap-1.5 text-body font-semibold text-brand-700 hover:text-brand-800">Manage daily help <ArrowRight aria-hidden="true" className="size-4" /></Link>
          </div>
        </section>
      ) : (
        <>
          {type === "guest" ? (
            <section className={sectionClass} aria-labelledby="guest-details">
              <h2 id="guest-details" className={legendClass}>Guest details</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Guest name" error={state.fieldErrors?.name}><Input name="name" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={80} required placeholder="e.g. Rohit Sharma" /></Field>
                <Field label="Phone number (optional)" error={state.fieldErrors?.phone}><Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" maxLength={30} placeholder="+91…" /></Field>
              </div>
            </section>
          ) : (
            <section className={sectionClass} aria-labelledby="visit-details">
              <h2 id="visit-details" className={legendClass}>{type === "delivery" ? "Delivery details" : type === "cab" ? "Cab details" : "Service details"}</h2>
              <p className="text-body leading-relaxed text-ink-soft">Security will record the visitor’s name and phone number{type === "cab" ? ", along with the cab registration," : ""} at the gate.</p>
              {type === "vendor" ? <Field label="Company (optional)" error={state.fieldErrors?.company}><Input name="company" value={companyChoice} onChange={(e) => setCompanyChoice(e.target.value)} maxLength={100} placeholder="e.g. CoolCare" /></Field> :
                <div>
                  <label htmlFor="companyChoice" className="mb-1.5 block text-body font-medium text-ink">{type === "cab" ? "Cab service" : "Delivery platform"} (optional)</label>
                  <PlatformPicker key={type} type={type} value={companyChoice} onChange={setCompanyChoice} />
                </div>}
              {type === "cab" ? (
                <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <legend className="mb-1.5 text-body font-medium text-ink">Pickup frequency</legend>
                  {[["once", "One visit"], ["daily", "Daily pickup"]].map(([value, label]) => (
                    <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 text-body font-medium text-ink has-checked:border-brand-500 has-checked:bg-brand-50">
                      <input type="radio" name="recurringCab" value={value} checked={recurring === (value === "daily")} onChange={() => {
                        setRecurring(value === "daily");
                        chooseDates(value === "daily" ? "7 days" : "Today", today, value === "daily" ? 7 : 1);
                      }} className="size-4 accent-brand-600" />
                      {label}
                    </label>
                  ))}
                </fieldset>
              ) : null}
            </section>
          )}

          <section className={sectionClass} aria-labelledby="visit-validity">
            <h2 id="visit-validity" className={legendClass}>{dateRange ? "Pass validity" : "Visit date"}</h2>
            <p className="text-caption leading-relaxed text-muted">{isDailyCab ? "One pickup per day. Share the same code with the driver." : dateRange ? "The guest can enter once on any date within this window." : "Valid for one visit on the selected date."}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Date presets">
              {(isDailyCab ? [["7 days", today, 7], ["14 days", today, 14], ["30 days", today, 30]] as const : dateRange ?
                [["Today", today, 1], ["Tomorrow", shiftPassDate(today, 1), 1], ["Next 7 days", today, 7]] as const :
                [["Today", today, 1], ["Tomorrow", shiftPassDate(today, 1), 1]] as const).map(([label, start, days]) => (
                <button key={label} type="button" aria-pressed={preset === label} onClick={() => chooseDates(label, start, days)} className={cn("min-h-11 rounded-control border px-3 text-body font-medium", preset === label ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line-strong text-ink-soft hover:bg-canvas")}>{label}</button>
              ))}
            </div>
            <div className={cn("grid grid-cols-1 gap-3", dateRange && "sm:grid-cols-2")}>
              <Field label={dateRange ? "Valid from" : "Date"} error={state.fieldErrors?.validFrom} className="min-w-0">
                <Input name="validFrom" type="date" min={today} required value={validFrom} className="min-w-0" onChange={(e) => {
                  const start = e.target.value;
                  setPreset("");
                  setValidFrom(start);
                  if (start && (validTo < start || validTo > shiftPassDate(start, MAX_PASS_DAYS - 1))) setValidTo(start);
                }} />
              </Field>
              {dateRange ? <Field label="Valid to" error={state.fieldErrors?.validTo} className="min-w-0"><Input name="validTo" type="date" required min={validFrom || today} max={maxEnd || undefined} value={validTo} className="min-w-0" onChange={(e) => { setPreset(""); setValidTo(e.target.value); }} /></Field> : null}
            </div>
          </section>

          {type === "delivery" ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-control border border-line bg-canvas p-3.5">
              <input type="checkbox" name="leaveAtGate" checked={keepParcel} onChange={(e) => setKeepParcel(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-brand-600" />
              <span><span className="block text-body font-semibold text-ink">Leave the parcel at the gate</span><span className="mt-1 block text-caption text-muted">Security will keep it for you and send a pickup code.</span></span>
            </label>
          ) : null}
          <details className="rounded-control border border-line px-3.5">
            <summary className="min-h-11 cursor-pointer py-2.5 text-body font-medium text-ink">Notes for security <span className="text-muted">(optional)</span></summary>
            <div className="pb-3"><Field label="Gate instructions" error={state.fieldErrors?.notes}><Textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="e.g. Use the main gate" /></Field></div>
          </details>

          {state.error ? <p role="alert" className="text-body font-medium text-[#b83244]">{state.error}</p> : null}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto"><KeyRound aria-hidden="true" className="size-4" />{pending ? "Creating pass…" : isDailyCab ? "Create daily pickup pass" : "Create gate pass"}</Button>
            <p className="text-caption text-muted">You’ll get a six-digit code to share.</p>
          </div>
        </>
      )}
    </form>
  );
}
