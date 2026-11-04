"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { month: string; collected: number; expenses: number };
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
function fmt(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${value}`;
}
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border border-line bg-white px-3 py-3 shadow-soft">
    <p className="text-caption font-semibold text-ink">{label}</p>
    {payload.map((point) => <div key={point.name} className="mt-2 flex items-center gap-3 text-caption"><span className="size-2 rounded-full" style={{ background: point.color }} /><span className="capitalize text-muted">{point.name}</span><span className="ml-auto font-semibold tabular-nums text-ink">{currency.format(point.value)}</span></div>)}
  </div>;
}
export function CollectionsChart({ data }: { data: Point[] }) {
  const gradientId = useId().replace(/:/g, "");
  return <div>
    <div className="h-[240px] w-full" aria-label="Collections and expenses for the last six months">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={data} accessibilityLayer margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3155d8" stopOpacity={0.12} /><stop offset="100%" stopColor="#3155d8" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#e3e7ee" strokeDasharray="3 5" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#626e82" }} dy={6} />
          <YAxis width={56} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#626e82" }} tickFormatter={(value) => fmt(Number(value))} />
          <Tooltip content={<ChartTooltip />} />
          <Area isAnimationActive={false} type="monotone" dataKey="collected" name="collected" stroke="#3155d8" strokeWidth={2.5} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
          <Area isAnimationActive={false} type="monotone" dataKey="expenses" name="expenses" stroke="#8491a8" strokeWidth={2} strokeDasharray="5 4" fill="transparent" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <div className="sr-only">
      <table><caption>Monthly collections and expenses in Indian rupees</caption><thead><tr><th scope="col">Month</th><th scope="col">Collected</th><th scope="col">Expenses</th></tr></thead><tbody>{data.map((point) => <tr key={point.month}><th scope="row">{point.month}</th><td>{currency.format(point.collected)}</td><td>{currency.format(point.expenses)}</td></tr>)}</tbody></table>
    </div>
  </div>;
}
