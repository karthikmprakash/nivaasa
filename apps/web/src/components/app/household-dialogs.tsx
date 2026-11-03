"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Car, Dog, Loader2, MoveRight, Plus, UserRoundPlus, Users } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { addDailyHelp, addFamilyMember, addPet, addVehicle, createMoveRequest, updateContacts, type HouseholdState } from "@/lib/actions/household";
import { todayISO } from "@/lib/utils";

function useForm(action: (prev: HouseholdState, fd: FormData) => Promise<HouseholdState>, close: () => void) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<HouseholdState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      close();
      router.refresh();
    }
  }, [state.ok, state.message, close, router]);
  return { state, formAction, pending };
}

export function AddFamilyDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { state, formAction, pending } = useForm(addFamilyMember, close);
  return (
    <>
      {trigger ? <span onClick={() => setOpen(true)}>{trigger}</span> : <Button size="sm" variant="outline" onClick={() => setOpen(true)}><UserRoundPlus className="size-3.5" /> Add member</Button>}
      <Dialog open={open} onOpenChange={setOpen} title="Add a family member" description="They'll appear in your household and can be added to the e-Intercom approval flow.">
        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><Input name="name" required placeholder="e.g. Ishita Mehta" /></Field><Field label="Relationship"><Input name="relation" required placeholder="Spouse, daughter, mother…" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Phone"><Input name="phone" type="tel" placeholder="Optional" /></Field><Field label="Age"><Input name="age" type="number" min={0} max={120} placeholder="Optional" /></Field></div>
          <label className="flex items-center gap-2.5 rounded-xl border border-line bg-[#fbfcff] px-3 py-2.5"><input type="checkbox" name="hasApp" className="size-4 accent-[#3155d8]" /><span className="text-[11px] text-ink-soft">They use the Nivaasa app</span></label>
          {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add to household"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function AddVehicleDialog() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { state, formAction, pending } = useForm(addVehicle, close);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Car className="size-3.5" /> Add vehicle</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Register a vehicle" description="Vehicles registered here are recognised at the gate and appear in the community directory.">
        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Type"><Select name="type"><option value="car">Car</option><option value="ev">Electric car</option><option value="bike">Two-wheeler</option><option value="bicycle">Bicycle</option></Select></Field><Field label="Registration number"><Input name="registrationNo" required placeholder="KA 01 AB 1234" className="uppercase" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Make"><Input name="make" required placeholder="Tesla" /></Field><Field label="Model"><Input name="model" required placeholder="Model 3" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Colour"><Input name="color" placeholder="Pearl white" /></Field><Field label="Parking slot"><Input name="parkingSlot" placeholder="B2-114" /></Field></div>
          {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Registering…" : "Register vehicle"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function AddPetDialog() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { state, formAction, pending } = useForm(addPet, close);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Dog className="size-3.5" /> Add pet</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Add a pet" description="Introduce your companion to the community pet directory and keep vaccinations on record.">
        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Pet's name"><Input name="name" required placeholder="Coco" /></Field><Field label="Species"><Select name="species"><option>Dog</option><option>Cat</option><option>Bird</option><option>Fish</option><option>Other</option></Select></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Breed"><Input name="breed" placeholder="Golden Retriever" /></Field><Field label="Age (years)"><Input name="ageYears" type="number" step="0.5" min={0} placeholder="3" /></Field></div>
          <Field label="Next vaccination due"><Input name="vaccinationDue" type="date" defaultValue={todayISO(365)} /></Field>
          <Field label="Notes"><Textarea name="notes" rows={2} placeholder="Friendly, loves the lawn…" /></Field>
          {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add pet"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function AddHelpDialog() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { state, formAction, pending } = useForm(addDailyHelp, close);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Add daily help</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Add daily help" description="A digital profile keeps your household staff verified at the gate and their attendance transparent.">
        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><Input name="name" required placeholder="Sunita Devi" /></Field><Field label="Role"><Select name="role"><option>House help</option><option>Cook</option><option>Driver</option><option>Nanny</option><option>Gardener</option><option>Other</option></Select></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Phone"><Input name="phone" type="tel" placeholder="+91…" /></Field><Field label="Aadhaar last 4 digits"><Input name="idLast4" maxLength={4} placeholder="1234" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Working hours"><Input name="shift" placeholder="8 AM – 11 AM" /></Field><Field label="Monthly pay (₹)"><Input name="monthlyRate" type="number" min={0} placeholder="6000" /></Field></div>
          <p className="rounded-xl bg-canvas px-3 py-2 text-[9.5px] leading-relaxed text-muted">The security team verifies IDs before the profile is activated. You&apos;re responsible for the information you provide.</p>
          {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add daily help"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function MoveRequestDialog() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { state, formAction, pending } = useForm(createMoveRequest, close);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><MoveRight className="size-3.5" /> Request move</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Plan a move" description="The committee reviews move requests to coordinate lifts, protective padding and gate passes for movers.">
        <form action={formAction} className="space-y-4">
          <Field label="Moving"><Select name="type"><option value="move_out">Moving out</option><option value="move_in">Moving in</option></Select></Field>
          <Field label="Proposed date"><Input name="date" type="date" min={todayISO(1)} required /></Field>
          <Field label="Notes for the committee"><Textarea name="notes" rows={3} placeholder="Number of movers, lift needed, etc." /></Field>
          {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Submitting…" : "Submit move request"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function ContactsForm({ defaults }: { defaults: { intercomPrimary: string; intercomSecondary: string; emergencyName: string; emergencyContact: string } }) {
  const [state, action, pending] = useActionState<HouseholdState, FormData>(updateContacts, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Primary e-Intercom number"><Input name="intercomPrimary" defaultValue={defaults.intercomPrimary} placeholder="+91 98450 11223" /></Field><Field label="Secondary number"><Input name="intercomSecondary" defaultValue={defaults.intercomSecondary} placeholder="Landline or family member" /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Emergency contact name"><Input name="emergencyName" defaultValue={defaults.emergencyName} placeholder="e.g. Ishita Mehta" /></Field><Field label="Emergency contact number"><Input name="emergencyContact" defaultValue={defaults.emergencyContact} placeholder="+91…" /></Field></div>
      {state.ok ? <p className="rounded-lg bg-mint-50 px-3 py-2 text-[10.5px] font-medium text-mint-600">{state.message}</p> : null}
      {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? <><Loader2 className="size-3.5 animate-spin" /> Saving…</> : "Save contacts"}</Button>
    </form>
  );
}
