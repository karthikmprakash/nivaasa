"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, PackagePlus, Plus } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { addAsset, type AdminState } from "@/lib/actions/admin";
import { addVendor, type BillingState } from "@/lib/actions/billing";
import { todayISO } from "@/lib/utils";

export function AddVendorDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<BillingState, FormData>(addVendor, {});
  useEffect(() => { if (state.ok) { toast.success("Vendor added"); setOpen(false); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Building2 className="size-3.5" /> Add vendor</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Add a vendor" description="Keep contracts, contacts and costs in one register.">
        <form action={action} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Company name"><Input name="name" required placeholder="Orbit Elevators" /></Field><Field label="Category"><Input name="category" required placeholder="Lift AMC" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Contact person"><Input name="contactPerson" placeholder="S. Balaji" /></Field><Field label="Phone"><Input name="phone" type="tel" placeholder="+91…" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Email"><Input name="email" type="email" placeholder="service@vendor.in" /></Field><Field label="GSTIN"><Input name="gstin" placeholder="29AABCO…" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Contract start"><Input name="contractStart" type="date" defaultValue={todayISO()} /></Field><Field label="Contract end"><Input name="contractEnd" type="date" defaultValue={todayISO(365)} /></Field><Field label="Monthly value (₹)"><Input name="monthlyValue" type="number" min={0} placeholder="42000" /></Field></div>
          {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add vendor"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function AddAssetDialog({ vendors }: { vendors: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminState, FormData>(addAsset, {});
  useEffect(() => { if (state.ok) { toast.success(state.message); setOpen(false); router.refresh(); } }, [state.ok, state.message, router]);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><PackagePlus className="size-3.5" /> Add asset</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Add an asset" description="Track society equipment, AMC contracts and condition.">
        <form action={action} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Asset name"><Input name="name" required placeholder="DG set — 250 kVA" /></Field><Field label="Category"><Input name="category" required placeholder="Utilities" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Location"><Input name="location" placeholder="Utility yard" /></Field><Field label="Quantity"><Input name="quantity" type="number" min={1} defaultValue={1} /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Purchase date"><Input name="purchaseDate" type="date" /></Field><Field label="Value (₹)"><Input name="value" type="number" min={0} placeholder="1400000" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="AMC vendor"><Select name="amcVendorId"><option value="">None</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field><Field label="AMC due"><Input name="amcDue" type="date" /></Field></div>
          <Field label="Condition"><Select name="condition"><option value="good">Good</option><option value="needs_service">Needs service</option><option value="retired">Retired</option></Select></Field>
          {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add asset"}</Button>
        </form>
      </Dialog>
    </>
  );
}
