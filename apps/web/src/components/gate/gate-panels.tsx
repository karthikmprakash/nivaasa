"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Car, Check, CheckCircle2, ChevronDown, Clock3, KeyRound, Loader2, MapPin, PackageOpen,
  Search, ShieldCheck, UserRound, UserRoundCheck, Users, Wrench, X,
} from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Resident = { name: string; phone: string; unit: string; unitId: string; role: string; color: string };
type Pass = { id: string; name: string; company: string | null; type: string; code: string; unit: string; unitId: string; status: string };
type Unit = { id: string; number: string } | null;

const types = [
  { v: "guest", l: "Guest", i: UserRound },
  { v: "delivery", l: "Delivery", i: PackageOpen },
  { v: "cab", l: "Cab", i: Car },
  { v: "domestic_help", l: "Daily help", i: Users },
  { v: "vendor", l: "Vendor", i: Wrench },
  { v: "other", l: "Other", i: UserRoundCheck },
];

export function GateEntryWizard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [searching, setSearching] = useState(false);
  const [unit, setUnit] = useState<Unit>(null);
  const [hostName, setHostName] = useState("");
  const [type, setType] = useState("guest");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ status: string; name: string; unit: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) { setResidents([]); setPasses([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/gate/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResidents(data.residents ?? []);
        setPasses(data.passes ?? []);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 280);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  function usePass(p: Pass) {
    setCode(p.code);
    setName(p.name);
    setCompany(p.company ?? "");
    setType(p.type);
    setUnit({ id: p.unitId, number: p.unit });
    setHostName(p.name);
    setQuery("");
    setResidents([]);
    setPasses([]);
    setPurpose("Pre-approved visitor");
  }

  function selectResident(r: Resident) {
    setUnit({ id: r.unitId, number: r.unit });
    setHostName(r.name);
    setQuery("");
    setResidents([]);
  }

  function reset() {
    setSuccess(null); setUnit(null); setHostName(""); setName(""); setPhone(""); setCompany(""); setPurpose(""); setVehicleNo(""); setCode(""); setNotes(""); setQuery(""); setType("guest");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unit) return toast.error("Choose the resident's home first.");
    if (!name.trim()) return toast.error("Enter the visitor's name.");
    setBusy(true);
    try {
      const res = await fetch("/api/gate/entry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, unitId: unit.id, name, phone, company, purpose, vehicleNo, code: code || undefined, notes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not log entry");
      setSuccess({ status: data.status, name: data.name, unit: data.unit });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log entry");
    } finally { setBusy(false); }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 text-center sm:p-7">
        <span className={cn("mx-auto grid size-14 place-items-center rounded-full", success.status === "entered" ? "bg-mint-50 text-mint-600" : "bg-amber-soft text-amber-ink")}>
          {success.status === "entered" ? <CheckCircle2 className="size-7" /> : <Clock3 className="size-7" />}
        </span>
        <p className="mt-3 text-[17px] font-semibold text-ink">{success.status === "entered" ? "Entry recorded" : "Approval request sent"}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{success.status === "entered" ? `${success.name} is in. Welcome them in.` : `${success.name} is waiting for Home ${success.unit} to approve. You'll see the status in the queue.`}</p>
        <div className="mt-5 flex gap-2"><Button variant="outline" className="flex-1" onClick={reset}>Log another</Button><Button className="flex-1" onClick={() => { reset(); router.push("/gate#queue"); }}>View queue</Button></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="resident-search" className="mb-1.5 block text-[11px] font-semibold text-ink-soft">Resident / home / passcode</label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input id="resident-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search A-402, Aarav, or paste a passcode…" className="h-11 pl-10" autoComplete="off" />
          {query ? <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"><X className="size-4" /></button> : null}
          {query.trim().length >= 2 && (residents.length > 0 || passes.length > 0 || searching) ? (
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
              {searching ? <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-muted"><Loader2 className="size-3.5 animate-spin" /> Searching…</div> : null}
              {passes.map((p) => (
                <button key={p.id} type="button" onClick={() => usePass(p)} className="flex w-full items-center gap-2.5 border-b border-line/70 bg-mint-50/50 px-4 py-3 text-left hover:bg-mint-50">
                  <span className="grid size-8 place-items-center rounded-lg bg-mint-50 text-mint-600"><KeyRound className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-ink">Pass found · {p.name}</span><span className="block text-[9px] text-muted">{p.company ?? p.type.replace("_", " ")} · Home {p.unit} · {p.code}</span></span>
                  <span className="rounded-full bg-mint-600 px-2 py-1 text-[8px] font-bold text-white">Use pass</span>
                </button>
              ))}
              {residents.map((r) => (
                <button key={r.unitId + r.name} type="button" onClick={() => selectResident(r)} className="flex w-full items-center gap-2.5 border-b border-line/70 px-4 py-3 text-left last:border-0 hover:bg-[#fbfcff]">
                  <span className="grid size-8 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: r.color }}>{r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-ink">{r.name}</span><span className="block text-[9px] text-muted">Home {r.unit} · {r.role} · {r.phone}</span></span>
                  <Check className="size-3.5 text-brand-500" />
                </button>
              ))}
              {!searching && !residents.length && !passes.length ? <div className="px-4 py-3 text-[10px] text-muted">No resident or pass found.</div> : null}
            </div>
          ) : null}
        </div>
        {unit ? <div className="mt-2 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3 py-2"><div className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-brand-600" /><span className="text-[10.5px] font-semibold text-brand-800">Home {unit.number} · {hostName}</span>{code ? <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[8.5px] font-bold text-brand-700">PASS {code}</span> : null}</div><button type="button" onClick={() => { setUnit(null); setCode(""); }} className="text-[9px] font-semibold text-brand-600">Change</button></div> : null}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-ink-soft">Visitor type</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {types.map((t) => <button key={t.v} type="button" onClick={() => setType(t.v)} className={cn("flex flex-col items-center gap-1 rounded-xl border px-1 py-2", type === t.v ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white hover:border-brand-200")}><t.i className={cn("size-4", type === t.v ? "text-brand-600" : "text-muted")} /><span className="text-[8.5px] font-semibold text-ink-soft">{t.l}</span></button>)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="mb-1 text-[10px] font-semibold text-ink-soft">Visitor name <span className="text-blush-500">*</span></label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yash Sharma" required className="h-10" /></div>
        <div><label className="mb-1 text-[10px] font-semibold text-ink-soft">Phone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className="h-10" /></div>
        <div><label className="mb-1 text-[10px] font-semibold text-ink-soft">{type === "delivery" ? "Company" : type === "cab" ? "Cab service" : "Company / note"}</label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={type === "delivery" ? "Swiggy, Amazon…" : "Optional"} className="h-10" /></div>
        <div><label className="mb-1 text-[10px] font-semibold text-ink-soft">Vehicle number</label><Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="KA 01 AB 1234" className="h-10" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="mb-1 text-[10px] font-semibold text-ink-soft">Purpose</label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Food delivery, family visit…" className="h-10" /></div>
        <div><label className="mb-1 text-[10px] font-semibold text-ink-soft">Notes for the log</label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="h-10" /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p className="flex items-center gap-1.5 text-[9px] text-muted"><ShieldCheck className="size-3 text-mint-600" /> The resident is notified instantly if approval is needed.</p>
        <Button type="submit" size="lg" disabled={busy || !unit} className="min-w-40">{busy ? <><Loader2 className="size-4 animate-spin" /> Logging…</> : <><UserRoundCheck className="size-4" /> Log entry</>}</Button>
      </div>
    </form>
  );
}

type QueueItem = { id: string; name: string; company: string | null; type: string; unit: string | null; status: string; hostName: string | null; hostPhone: string | null; photoColor: string | null; createdAt: string | Date };

export function GateQueue({ initial }: { initial: QueueItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date>(new Date());

  async function load() {
    const res = await fetch("/api/gate/queue", { cache: "no-store" });
    if (res.ok) { const d = await res.json(); setItems(d.items ?? []); setUpdated(new Date()); }
  }
  useEffect(() => { const t = setInterval(load, 12000); return () => clearInterval(t); }, []);
  async function enter(id: string) {
    setBusy(id);
    const res = await fetch(`/api/gate/visitors/${id}/entry`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) toast.error(data.error ?? "Could not record entry"); else { toast.success("Entry recorded"); await load(); router.refresh(); }
    setBusy(null);
  }
  const pending = items.filter((i) => i.status === "pending");
  const approved = items.filter((i) => i.status === "approved");
  return (
    <div>
      <div className="mb-2 flex items-center justify-between"><span className="text-[9px] text-muted">Updates every 12s · {updated.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span><button onClick={load} className="text-[9px] font-semibold text-brand-600">Refresh</button></div>
      {approved.length ? <div className="mb-3 space-y-2">{approved.map((v) => <div key={v.id} className="flex items-center gap-2.5 rounded-xl border border-mint-600/20 bg-mint-50/50 px-3 py-2.5"><span className="grid size-8 place-items-center rounded-full bg-white text-[9px] font-bold text-mint-600">{v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="text-[10.5px] font-semibold text-ink">{v.name}</p><p className="text-[8.5px] text-muted">{v.company ?? v.type.replace("_", " ")} · Home {v.unit}</p></div><button onClick={() => enter(v.id)} disabled={busy === v.id} className="rounded-full bg-mint-600 px-2.5 py-1.5 text-[8px] font-bold text-white disabled:opacity-50">{busy === v.id ? "…" : "Record entry"}</button></div>)}</div> : null}
      {pending.length ? <div className="space-y-2">{pending.map((v) => <div key={v.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5"><span className="mt-0.5 grid size-8 place-items-center rounded-full bg-amber-soft text-[9px] font-bold text-amber-ink">{v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="text-[10.5px] font-semibold text-ink">{v.name}</p><p className="text-[8.5px] text-muted">{v.company ?? v.type.replace("_", " ")} · Home {v.unit} · {new Date(v.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p></div><div className="flex flex-col items-end gap-1"><span className="rounded-full bg-amber-soft px-1.5 py-0.5 text-[7px] font-bold text-amber-ink">Awaiting</span>{v.hostPhone ? <a href={`tel:${v.hostPhone}`} className="text-[7.5px] font-semibold text-brand-600">Call resident</a> : null}</div></div>)}</div> : null}
      {!pending.length && !approved.length ? <div className="rounded-xl border border-dashed border-line bg-[#fbfcff] px-4 py-8 text-center"><CheckCircle2 className="mx-auto size-5 text-mint-600" /><p className="mt-1.5 text-[10px] font-semibold text-ink">Queue is clear</p><p className="text-[8.5px] text-muted">New requests will appear here.</p></div> : null}
    </div>
  );
}

export function GateStaff({ people, attendance }: { people: { id: string; name: string; role: string; kind: string; photoColor: string | null; unit: string | null; policeVerified: boolean }[]; attendance: Record<string, { in: boolean; out: boolean }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [data, setData] = useState(attendance);
  async function mark(id: string, action: "in" | "out") {
    setBusy(id + action);
    const res = await fetch("/api/gate/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffId: id, action }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error ?? "Could not mark attendance");
    else { setData((prev) => ({ ...prev, [id]: { in: true, out: action === "out" } })); toast.success(action === "in" ? "Check-in recorded" : "Check-out recorded"); router.refresh(); }
    setBusy(null);
  }
  return (
    <div className="space-y-2">
      {people.slice(0, 8).map((p) => {
        const a = data[p.id];
        return <div key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2"><span className="grid size-7 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: p.photoColor ?? "#3155d8" }}>{p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="truncate text-[9.5px] font-semibold text-ink">{p.name}</p><p className="text-[7.5px] text-muted">{p.role}{p.unit ? ` · Home ${p.unit}` : ""}</p></div>{a?.out ? <span className="text-[7.5px] text-muted">Out</span> : a?.in ? <button onClick={() => mark(p.id, "out")} disabled={busy === p.id + "out"} className="rounded-full bg-canvas px-2 py-1 text-[7.5px] font-semibold text-ink-soft">Check out</button> : <button onClick={() => mark(p.id, "in")} disabled={busy === p.id + "in"} className="rounded-full bg-mint-600 px-2 py-1 text-[7.5px] font-semibold text-white">Check in</button>}</div>;
      })}
      {!people.length ? <p className="py-4 text-center text-[9px] text-muted">No staff on record.</p> : null}
    </div>
  );
}

export function GatePatrol({ checkpoints, scannedIds }: { checkpoints: { id: string; name: string; location: string }[]; scannedIds: string[] }) {
  const router = useRouter();
  const [scanned, setScanned] = useState(new Set(scannedIds));
  const [busy, setBusy] = useState<string | null>(null);
  async function scan(id: string) {
    setBusy(id);
    const res = await fetch("/api/gate/patrol", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkpointId: id }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error ?? "Could not record patrol"); else { setScanned((prev) => new Set(prev).add(id)); toast.success("Checkpoint scanned"); router.refresh(); }
    setBusy(null);
  }
  return (
    <div className="space-y-2">
      {checkpoints.map((c) => {
        const done = scanned.has(c.id);
        return <div key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2"><span className={`grid size-6 place-items-center rounded-full ${done ? "bg-mint-50 text-mint-600" : "bg-canvas text-muted"}`}>{done ? <Check className="size-3" /> : <MapPin className="size-3" />}</span><div className="min-w-0 flex-1"><p className="text-[9.5px] font-semibold text-ink">{c.name}</p><p className="text-[7.5px] text-muted">{c.location}</p></div>{done ? <span className="text-[7.5px] font-semibold text-mint-600">Scanned</span> : <button onClick={() => scan(c.id)} disabled={busy === c.id} className="rounded-full bg-brand-50 px-2 py-1 text-[7.5px] font-semibold text-brand-700">{busy === c.id ? "…" : "Scan"}</button>}</div>;
      })}
    </div>
  );
}

export function GateDeliveries({ deliveries }: { deliveries: { id: string; company: string; courierName: string | null; unit: string | null; status: string; otp: string | null; createdAt: string }[] }) {
  const router = useRouter();
  const [items, setItems] = useState(deliveries);
  const [active, setActive] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  async function deliver(id: string) {
    setBusy(true);
    const res = await fetch(`/api/gate/deliveries/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ otp, action: "deliver" }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error ?? "Could not verify"); else { toast.success("Parcel handed over"); setItems((prev) => prev.filter((p) => p.id !== id)); setActive(null); setOtp(""); router.refresh(); }
    setBusy(false);
  }
  return (
    <div className="space-y-2">
      {items.map((d) => <div key={d.id} className="rounded-xl border border-line bg-white px-3 py-2"><div className="flex items-center justify-between"><div><p className="text-[9.5px] font-semibold text-ink">{d.company} <span className="font-normal text-muted">· Home {d.unit}</span></p><p className="text-[7.5px] text-muted">{d.courierName} · {d.status === "left_at_gate" ? "Kept at gate" : "At gate"}</p></div>{active === d.id ? null : d.status === "left_at_gate" ? <button onClick={() => { setActive(d.id); setOtp(""); }} className="rounded-full bg-brand-50 px-2 py-1 text-[7.5px] font-semibold text-brand-700">Hand over</button> : <span className="text-[7.5px] text-muted">Awaiting approval</span>}</div>{active === d.id ? <div className="mt-2 flex gap-1.5"><input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Pickup code" className="h-8 flex-1 rounded-lg border border-line px-2 font-mono text-[10px] tracking-widest" /><button onClick={() => deliver(d.id)} disabled={busy || otp.length < 4} className="rounded-lg bg-mint-600 px-2.5 text-[8px] font-bold text-white disabled:opacity-50">{busy ? "…" : "Verify"}</button><button onClick={() => setActive(null)} className="rounded-lg bg-canvas px-2 text-[8px] text-muted">Cancel</button></div> : null}</div>)}
      {!items.length ? <p className="py-4 text-center text-[9px] text-muted">No deliveries waiting.</p> : null}
    </div>
  );
}

export function GatePanic({ alerts }: { alerts: { id: string; message: string; unit: string | null; user: string | null; status: string; createdAt: string }[] }) {
  const router = useRouter();
  const [items, setItems] = useState(alerts);
  async function act(id: string, action: "acknowledge" | "resolve") {
    const res = await fetch("/api/gate/panic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (!res.ok) return toast.error("Could not update alert");
    if (action === "resolve") setItems((prev) => prev.filter((a) => a.id !== id)); else setItems((prev) => prev.map((a) => a.id === id ? { ...a, status: "acknowledged" } : a));
    toast.success(action === "resolve" ? "Alert resolved" : "Alert acknowledged");
    router.refresh();
  }
  if (!items.length) return <div className="rounded-xl border border-dashed border-line bg-white px-3 py-5 text-center"><ShieldCheck className="mx-auto size-5 text-mint-600" /><p className="mt-1 text-[9.5px] font-semibold text-ink">No active alerts</p><p className="text-[8px] text-muted">All calm at the gate.</p></div>;
  return <div className="space-y-2">{items.map((a) => <div key={a.id} className="rounded-xl border border-[#f0c7cc] bg-[#fdf1f3] px-3 py-2.5"><p className="text-[9.5px] font-bold text-[#a82f3e]">PANIC · Home {a.unit} · {a.user}</p><p className="text-[8px] text-[#9e4a55]">{a.message}</p><div className="mt-1.5 flex gap-1.5">{a.status === "open" ? <button onClick={() => act(a.id, "acknowledge")} className="rounded-full bg-white px-2 py-1 text-[7.5px] font-bold text-[#a82f3e]">Acknowledge</button> : null}<button onClick={() => act(a.id, "resolve")} className="rounded-full bg-[#d94a5a] px-2 py-1 text-[7.5px] font-bold text-white">Resolve</button></div></div>)}</div>;
}

export function GateExitButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button onClick={async () => { setBusy(true); await fetch(`/api/gate/visitors/${id}/exit`, { method: "POST" }); toast.success("Exit recorded"); router.refresh(); setBusy(false); }} disabled={busy} className="rounded-full bg-canvas px-2 py-1 text-[7.5px] font-semibold text-ink-soft">{busy ? "…" : "Record exit"}</button>;
}
