"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock3, Loader2, Sparkles, Users } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { cn, formatINR, todayISO } from "@/lib/utils";

type Amenity = { id: string; name: string; price: number; deposit: number; capacity: number; slotMinutes: number; openTime: string; closeTime: string; rules: string | null; location: string | null };
type Slot = { start: string; end: string; available: boolean; label: string };

export function BookAmenityButton({ amenity, variant = "primary", label = "Book" }: { amenity: Amenity; variant?: "primary" | "outline" | "soft"; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO(1));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; amount: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setSlot(null);
    fetch(`/api/amenities/${amenity.id}/availability?date=${date}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setSlots(d.slots ?? []); })
      .catch(() => toast.error("Could not load availability"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, date, amenity.id]);

  async function book() {
    if (!slot) return;
    setBusy(true);
    try {
      const res = await fetch("/api/amenities/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amenityId: amenity.id, date, startTime: slot.start, guests, notes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not book");
      setDone({ id: data.bookingId, amount: data.amount });
      router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not book"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Button variant={variant === "soft" ? "secondary" : variant} size="sm" onClick={() => { setDone(null); setOpen(true); }}>{label}</Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDone(null); }} title={done ? "You're booked" : `Book ${amenity.name}`} description={done ? undefined : amenity.location ?? `${amenity.slotMinutes} min slots`} className="max-w-xl">
        {done ? (
          <div className="py-2 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-50 text-mint-600"><CheckCircle2 className="size-7" /></span>
            <p className="mt-4 text-[19px] font-semibold text-ink">See you there</p>
            <p className="mt-1 text-[12px] text-muted">{amenity.name} · {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })} · {slot?.start}–{slot?.end}</p>
            {done.amount > 0 ? <p className="mt-2 text-[11px] font-semibold text-ink">{formatINR(done.amount)} paid · receipt in Payments</p> : <p className="mt-2 text-[11px] text-mint-600">No payment required</p>}
            <div className="mt-5 flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Done</Button><Button className="flex-1" onClick={() => { setOpen(false); router.push("/app/amenities#bookings"); }}>My bookings</Button></div>
          </div>
        ) : (
          <div className="space-y-5">
            <Field label="Date"><div className="relative"><CalendarDays className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="pl-10" /></div></Field>
            <div>
              <div className="mb-1.5 flex items-center justify-between"><p className="text-[12px] font-semibold text-ink-soft">Available slots</p><span className="text-[9px] text-muted">{amenity.openTime} – {amenity.closeTime}</span></div>
              {loading ? <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-canvas" />)}</div> : (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {slots.map((s) => <button key={s.start} type="button" disabled={!s.available} onClick={() => setSlot(s)} className={cn("h-9 rounded-lg border text-[10px] font-semibold transition-all", slot?.start === s.start ? "border-brand-600 bg-brand-600 text-white" : s.available ? "border-line bg-white text-ink-soft hover:border-brand-300" : "border-line bg-canvas text-[#c2c8d5] line-through")}>{s.label}</button>)}
                  {!slots.length && !loading ? <p className="col-span-full rounded-lg bg-canvas py-4 text-center text-[10.5px] text-muted">No slots on this date.</p> : null}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Number of guests"><div className="relative"><Users className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input type="number" min={0} max={amenity.capacity} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="pl-10" /></div></Field>
              <div className="rounded-xl bg-canvas px-3 py-2.5"><p className="text-[8.5px] font-semibold uppercase tracking-wide text-muted">Total</p><p className="mt-0.5 text-[16px] font-semibold text-ink">{amenity.price ? formatINR(amenity.price) : "Free"}</p>{amenity.deposit ? <p className="text-[8.5px] text-muted">+ {formatINR(amenity.deposit)} refundable deposit</p> : null}</div>
            </div>
            <Field label="Notes (optional)"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requirements?" /></Field>
            {amenity.rules ? <div className="rounded-xl border border-line bg-[#fbfcff] px-3 py-2.5"><p className="flex items-center gap-1.5 text-[9.5px] font-semibold text-ink"><Sparkles className="size-3 text-brand-500" /> House rules</p><p className="mt-1 text-[9px] leading-relaxed text-muted">{amenity.rules}</p></div> : null}
            <Button className="w-full" size="lg" disabled={!slot || busy} onClick={book}>{busy ? <><Loader2 className="size-4 animate-spin" /> Booking…</> : slot ? <>Confirm · {slot.label} {amenity.price ? `· ${formatINR(amenity.price)}` : "· Free"}</> : "Choose a slot"}</Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
