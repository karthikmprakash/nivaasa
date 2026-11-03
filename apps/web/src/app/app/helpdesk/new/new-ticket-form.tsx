"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Droplets, Dumbbell, ArrowUpDown, ImagePlus, Lightbulb, Lock, Package, ShieldCheck, Sparkles, Trash2, Wifi, Wrench, X } from "lucide-react";
import { createTicket, type TicketState } from "@/lib/actions/helpdesk";
import { SubmitButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

const categories = [
  { value: "Plumbing", icon: Droplets },
  { value: "Electrical", icon: Lightbulb },
  { value: "Lifts", icon: ArrowUpDown },
  { value: "Housekeeping", icon: Sparkles },
  { value: "Security", icon: ShieldCheck },
  { value: "Parking", icon: Package },
  { value: "Common areas", icon: Dumbbell },
  { value: "Intercom", icon: Lock },
  { value: "Internet", icon: Wifi },
  { value: "Other", icon: Wrench },
];

const priorities = [
  { value: "low", label: "Low", hint: "Can wait a few days", tone: "border-line" },
  { value: "medium", label: "Normal", hint: "Within 24 hours", tone: "border-brand-200" },
  { value: "high", label: "High", hint: "Needs attention today", tone: "border-amber-ink/30" },
  { value: "urgent", label: "Urgent", hint: "Safety or severe damage", tone: "border-[#e7b5bb]" },
];

export function NewTicketForm() {
  const [state, action] = useActionState<TicketState, FormData>(createTicket, {});
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [scope, setScope] = useState("personal");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const photosRef = useRef(photos);
  const [photoError, setPhotoError] = useState("");
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)); }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setPhotoError("");
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= 3) break;
      if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type) || file.size > 6 * 1024 * 1024) {
        setPhotoError("Use JPG, PNG, WebP or HEIC images up to 6 MB each.");
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  return (
    <form action={(formData) => {
      formData.delete("photos");
      photos.forEach((photo) => formData.append("photos", photo.file));
      action(formData);
    }} className="space-y-6">
      <div>
        <p className="mb-2 text-body font-semibold text-ink-soft">What kind of issue is it?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {categories.map((c) => (
            <button key={c.value} type="button" aria-pressed={category === c.value} onClick={() => setCategory(c.value)} className={cn("flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors", category === c.value ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white hover:border-brand-200")}>
              <c.icon className={cn("size-4", category === c.value ? "text-brand-600" : "text-muted")} />
              <span className="text-center text-caption font-semibold leading-tight text-ink-soft">{c.value}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={category} />
        {state.fieldErrors?.category ? <p role="alert" className="mt-1 text-caption text-[#c43d4d]">{state.fieldErrors.category}</p> : null}
      </div>

      <div>
        <p className="mb-2 text-body font-semibold text-ink-soft">Where is the issue?</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={scope === "personal"} onClick={() => setScope("personal")} className={cn("rounded-xl border p-3 text-left", scope === "personal" ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white")}><p className="text-caption font-semibold text-ink">Inside my home</p><p className="mt-0.5 text-caption text-muted">Private to your flat — plumbing, electrical, intercom…</p></button>
          <button type="button" aria-pressed={scope === "community"} onClick={() => setScope("community")} className={cn("rounded-xl border p-3 text-left", scope === "community" ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white")}><p className="text-caption font-semibold text-ink">Common area</p><p className="mt-0.5 text-caption text-muted">Lifts, garden, gym, parking, lobbies…</p></button>
        </div>
        <input type="hidden" name="scope" value={scope} />
      </div>

      <div>
        <label htmlFor="subject" className="mb-1.5 block text-body font-semibold text-ink-soft">Subject</label>
        <input id="subject" name="subject" required placeholder="e.g. Kitchen tap is leaking continuously" className="h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        {state.fieldErrors?.subject ? <p role="alert" className="mt-1 text-caption text-[#c43d4d]">{state.fieldErrors.subject}</p> : null}
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-body font-semibold text-ink-soft">Describe the issue</label>
        <textarea id="description" name="description" required rows={5} placeholder="When did it start? What have you tried? Anything the team should know before visiting?" className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        {state.fieldErrors?.description ? <p role="alert" className="mt-1 text-caption text-[#c43d4d]">{state.fieldErrors.description}</p> : null}
      </div>

      <div>
        <p className="mb-2 text-body font-semibold text-ink-soft">Priority</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {priorities.map((p) => (
            <button key={p.value} type="button" aria-pressed={priority === p.value} onClick={() => setPriority(p.value)} className={cn("rounded-xl border px-3 py-2 text-left", priority === p.value ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white")}>
              <span className="flex items-center gap-1 text-caption font-semibold text-ink">{p.value === "urgent" ? <AlertTriangle className="size-4 text-[#c43d4d]" /> : null}{p.label}</span>
              <span className="mt-0.5 block text-caption text-muted">{p.hint}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="priority" value={priority} />
      </div>

      <div>
        <p className="mb-1.5 text-body font-semibold text-ink-soft">Photos <span className="font-normal text-muted">(optional, up to 3)</span></p>
        <input ref={fileRef} type="file" name="photos" aria-label="Attach photos" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.url} className="relative size-16 overflow-hidden rounded-xl border border-line">
              <img src={p.url} alt={`Attachment ${i + 1}`} className="size-full object-cover" />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => { URL.revokeObjectURL(p.url); setPhotos((prev) => prev.filter((x) => x.url !== p.url)); }} className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white"><X className="size-4" /></button>
            </div>
          ))}
          {photos.length < 3 ? <button type="button" onClick={() => fileRef.current?.click()} className="flex size-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong bg-[#fbfcff] text-muted hover:border-brand-300 hover:text-brand-600"><ImagePlus className="size-4" /><span className="text-caption font-semibold">Add photo</span></button> : null}
        </div>
      </div>

      {photoError ? <p role="alert" className="text-caption text-[#b83244]">{photoError}</p> : null}
      {state.error ? <div role="alert" className="rounded-xl border border-[#f3c9cd] bg-[#fdeced] px-3.5 py-2.5 text-body font-medium text-[#b53a48]">{state.error}</div> : null}
      <div className="flex flex-col-reverse items-start justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <p className="flex items-center gap-1.5 text-caption text-muted"><ShieldCheck className="size-4 text-mint-600" /> You&apos;ll get updates and an ETA after the team reviews it.</p>
        <SubmitButton size="lg" pendingText="Raising request…"><Wrench className="size-4" /> Raise request</SubmitButton>
      </div>
    </form>
  );
}
