"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { createAmenity, type AdminState } from "@/lib/actions/admin";

export function CreateAmenityDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminState, FormData>(createAmenity, {});
  useEffect(() => { if (state.ok) { toast.success(state.message); setOpen(false); router.refresh(); } }, [state.ok, state.message, router]);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> New amenity</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Add an amenity" description="Configure capacity, slot length, pricing and house rules." className="max-w-xl">
        <form action={action} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><Input name="name" required placeholder="Squash Court" /></Field><Field label="Location"><Input name="location" placeholder="Clubhouse, level 1" /></Field></div>
          <Field label="Description"><Textarea name="description" rows={2} placeholder="A short, inviting description." /></Field>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Capacity"><Input name="capacity" type="number" min={1} defaultValue={10} /></Field><Field label="Slot minutes"><Input name="slotMinutes" type="number" min={15} step={15} defaultValue={60} /></Field><Field label="Icon"><Select name="icon"><option value="sparkles">Sparkles</option><option value="waves">Pool</option><option value="dumbbell">Gym</option><option value="trophy">Sport</option><option value="activity">Court</option><option value="bed">Stay</option><option value="flower">Wellness</option><option value="laptop">Work</option><option value="party">Party</option></Select></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Price (₹)"><Input name="price" type="number" min={0} defaultValue={0} /></Field><Field label="Deposit (₹)"><Input name="deposit" type="number" min={0} defaultValue={0} /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Opens"><Input name="openTime" type="time" defaultValue="06:00" /></Field><Field label="Closes"><Input name="closeTime" type="time" defaultValue="22:00" /></Field></div>
          <Field label="House rules"><Textarea name="rules" rows={2} placeholder="Cancellation window, guest limits, dress code…" /></Field>
          {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add amenity"}</Button>
        </form>
      </Dialog>
    </>
  );
}
