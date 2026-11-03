"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button } from "@/components/ui/primitives";

const types = [
  { id: "medical", label: "Medical", hint: "Injury, chest pain, emergency", emoji: "＋" },
  { id: "security", label: "Security", hint: "Intruder or threat", emoji: "!" },
  { id: "fire", label: "Fire", hint: "Smoke or fire", emoji: "▲" },
];

export function PanicButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("medical");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/panic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: type, message: "Emergency assistance needed" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send alert");
      setDone(true); router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not send alert"); }
    finally { setBusy(false); }
  }
  return (
    <>
      <button onClick={() => { setDone(false); setOpen(true); }} className="group flex w-full items-center justify-between rounded-[20px] border border-[#f0c7cc] bg-gradient-to-r from-[#fdf1f3] to-[#fff7f8] p-4 text-left transition-all hover:border-[#e7a6ae]">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#d94a5a] text-white pulse-ring"><ShieldAlert className="size-5" /></span><div><p className="text-body font-semibold text-ink">Emergency panic button</p><p className="mt-0.5 text-caption text-[#9e4a55]">Alerts the guard and community team instantly</p></div></div>
        <span className="rounded-full bg-[#d94a5a] px-3 py-1.5 text-caption font-bold text-white">Hold to alert</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen} title={done ? "Help is on the way" : "Send an emergency alert"} description={done ? "The security team has been alerted. Stay where you are if it is safe." : "Only use this for a real emergency. The guard and community team will be notified immediately."} className="max-w-md">
        {done ? (
          <div className="py-3 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-mint-50 text-mint-600"><CheckCircle2 className="size-8" /></span><p className="mt-4 text-[18px] font-semibold text-ink">Alert sent to Gate 1</p><p className="mt-1 text-caption text-muted">Ramesh Yadav and the community manager have been notified. If you can, call 108 for medical emergencies.</p><Button className="mt-4 w-full" onClick={() => setOpen(false)}>Close</Button></div>
        ) : (
          <div>
            <div className="rounded-xl border border-[#f0c7cc] bg-[#fdf1f3] px-3.5 py-2.5 text-caption leading-relaxed text-[#9e4a55]"><AlertTriangle className="mr-1 inline size-4" /> False alerts have consequences. For routine issues, use the helpdesk instead.</div>
            <p className="mt-4 text-caption font-semibold text-ink-soft">What kind of emergency?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {types.map((t) => <button key={t.id} onClick={() => setType(t.id)} className={`rounded-xl border p-3 text-left ${type === t.id ? "border-[#d94a5a] bg-[#fdf1f3] ring-2 ring-[#f6d5d9]" : "border-line"}`}><span className={`grid size-7 place-items-center rounded-full text-body font-bold ${type === t.id ? "bg-[#d94a5a] text-white" : "bg-canvas text-muted"}`}>{t.emoji}</span><span className="mt-1.5 block text-caption font-semibold text-ink">{t.label}</span><span className="block text-caption text-muted">{t.hint}</span></button>)}
            </div>
            <Button variant="danger" size="lg" className="mt-4 w-full" onClick={send} disabled={busy}>{busy ? <><Loader2 className="size-4 animate-spin" /> Alerting security…</> : "Send emergency alert"}</Button>
            <p className="mt-2 text-center text-caption text-muted">Call 112 for police, 108 for ambulance, 101 for fire.</p>
          </div>
        )}
      </Dialog>
    </>
  );
}
