"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Megaphone, Plus, Trash2, Vote } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { createEvent, createPoll, publishNotice, type CommsState } from "@/lib/actions/communications";
import { todayISO } from "@/lib/utils";

export function PublishNoticeDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<CommsState, FormData>(publishNotice, {});
  useEffect(() => { if (state.ok) { toast.success(state.message ?? "Published"); setOpen(false); router.refresh(); } }, [state.ok, state.message, router]);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Megaphone className="size-4" /> Publish notice</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Publish a notice" description="Reach every resident in-app. Keep it clear, useful and kind." className="max-w-xl">
        <form action={action} className="space-y-4">
          <Field label="Title"><Input name="title" required placeholder="Water tank cleaning on 8 November" /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Category"><Select name="category"><option value="general">General</option><option value="maintenance">Maintenance</option><option value="security">Security</option><option value="event">Event</option><option value="finance">Finance</option><option value="emergency">Emergency</option></Select></Field><Field label="Audience"><Select name="audience"><option value="all">All residents</option><option value="owners">Owners only</option><option value="tenants">Tenants only</option></Select></Field></div>
          <Field label="Message"><Textarea name="body" required rows={6} placeholder="What do residents need to know?" /></Field>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-[#fbfcff] px-3 py-2.5"><input type="checkbox" name="pinned" className="size-4 accent-[#3155d8]" /><span className="text-caption text-ink-soft">Pin to the top of the community feed</span></label>
          {state.fieldErrors ? <p className="text-caption text-[#c43d4d]">{Object.values(state.fieldErrors)[0]}</p> : null}
          {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Publishing…" : "Publish & notify residents"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function CreatePollDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(["", "", ""]);
  const router = useRouter();
  const [state, action, pending] = useActionState<CommsState, FormData>(createPoll, {});
  useEffect(() => { if (state.ok) { toast.success("Poll published"); setOpen(false); setOptions(["", "", ""]); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Vote className="size-4" /> Create poll</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Create a poll" description="Ask the community for a clear decision. One vote per household member." className="max-w-lg">
        <form action={action} className="space-y-4">
          <Field label="Question"><Input name="question" required placeholder="Should we add a second EV charger?" /></Field>
          <Field label="Context (optional)"><Textarea name="description" rows={2} placeholder="Cost, location or any detail voters should know." /></Field>
          <div>
            <p className="mb-1.5 text-body font-semibold text-ink-soft">Choices</p>
            <div className="space-y-2">{options.map((o, i) => <div key={i} className="flex gap-2"><Input name="option" value={o} onChange={(e) => setOptions((prev) => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`Option ${i + 1}`} />{options.length > 2 ? <button type="button" onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-[#fdeced] hover:text-[#c43d4d]"><Trash2 className="size-4" /></button> : null}</div>)}</div>
            {options.length < 5 ? <button type="button" onClick={() => setOptions((prev) => [...prev, ""])} className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-brand-600"><Plus className="size-4" /> Add option</button> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Audience"><Select name="audience"><option value="all">All residents</option><option value="owners">Owners only</option><option value="tenants">Tenants only</option></Select></Field><Field label="Closes on"><Input type="date" name="endsAt" defaultValue={todayISO(7)} /></Field></div>
          <div className="flex flex-wrap gap-3"><label className="flex items-center gap-2 text-caption text-ink-soft"><input type="checkbox" name="secret" className="size-4 accent-[#3155d8]" /> Secret ballot</label><label className="flex items-center gap-2 text-caption text-ink-soft"><input type="checkbox" name="hideResults" className="size-4 accent-[#3155d8]" /> Hide results until close</label></div>
          {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
          {state.fieldErrors ? <p className="text-caption text-[#c43d4d]">{Object.values(state.fieldErrors)[0]}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Publishing…" : "Publish poll"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<CommsState, FormData>(createEvent, {});
  useEffect(() => { if (state.ok) { toast.success("Event published"); setOpen(false); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><CalendarPlus className="size-4" /> Create event</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Create an event" description="Invite residents and track RSVPs.">
        <form action={action} className="space-y-4">
          <Field label="Title"><Input name="title" required placeholder="Diwali Mela" /></Field>
          <Field label="Description"><Textarea name="description" required rows={3} placeholder="What's happening?" /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Starts"><Input type="datetime-local" name="startAt" required /></Field><Field label="Ends"><Input type="datetime-local" name="endAt" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Location"><Input name="location" required placeholder="Central Lawn" /></Field><Field label="Capacity"><Input name="capacity" type="number" min={1} placeholder="200" /></Field></div>
          {state.fieldErrors ? <p className="text-caption text-[#c43d4d]">{Object.values(state.fieldErrors)[0]}</p> : null}
          {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Publishing…" : "Publish event"}</Button>
        </form>
      </Dialog>
    </>
  );
}
