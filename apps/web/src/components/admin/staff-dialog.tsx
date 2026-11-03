"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { addStaffMember, type AdminState } from "@/lib/actions/admin";

export function AddStaffDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminState, FormData>(addStaffMember, {});
  useEffect(() => { if (state.ok) { toast.success(state.message); setOpen(false); router.refresh(); } }, [state.ok, state.message, router]);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><UserPlus className="size-3.5" /> Add staff</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Add a team member" description="Create a society staff profile. ID verification can be completed after adding.">
        <form action={action} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><Input name="name" required placeholder="Ramesh Yadav" /></Field><Field label="Role"><Input name="role" required placeholder="Security guard, plumber…" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Team"><Select name="kind"><option value="society">Society staff</option><option value="security">Security</option><option value="daily_help">Daily help</option></Select></Field><Field label="Phone"><Input name="phone" type="tel" placeholder="+91…" /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Shift"><Input name="shift" placeholder="6 AM – 2 PM" /></Field><Field label="Monthly pay (₹)"><Input name="monthlyRate" type="number" min={0} placeholder="24000" /></Field></div>
          {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add team member"}</Button>
        </form>
      </Dialog>
    </>
  );
}
