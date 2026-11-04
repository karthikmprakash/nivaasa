"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { createClassified, type ClassifiedState } from "@/lib/actions/classifieds";

export function CreateListingDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<ClassifiedState, FormData>(createClassified, {});
  useEffect(() => {
    if (state.ok) {
      toast.success("Your listing is live");
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> New listing</Button>
      <Dialog open={open} onOpenChange={setOpen} title="List something for sale" description="Reach verified neighbours in your community. Keep it honest and local.">
        <form action={action} className="space-y-4">
          <Field label="What are you selling?"><Input name="title" required placeholder="e.g. IKEA coffee table — oak veneer" /></Field>
          <fieldset>
            <legend className="mb-1.5 text-body font-semibold text-ink-soft">Category</legend>
            <Select name="category"><option value="furniture">Furniture</option><option value="electronics">Electronics</option><option value="vehicles">Vehicles</option><option value="kids">Kids</option><option value="home">Home & décor</option><option value="services">Services</option><option value="other">Other</option></Select>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Price (₹)"><Input name="price" type="number" min={0} required placeholder="4500" /></Field><Field label="Condition"><Select name="condition"><option value="new">New</option><option value="like_new">Like new</option><option value="good">Good</option><option value="used">Used</option></Select></Field></div>
          <Field label="Description"><Textarea name="description" required rows={3} placeholder="Size, age, condition, pickup details…" /></Field>
          <Field label="Image URL (optional)"><Input name="imageUrl" type="url" placeholder="https://…" /></Field>
          {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
          {state.fieldErrors ? <p className="text-caption text-[#c43d4d]">{Object.values(state.fieldErrors)[0]}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Publishing…" : "Publish listing"}</Button>
        </form>
      </Dialog>
    </>
  );
}
