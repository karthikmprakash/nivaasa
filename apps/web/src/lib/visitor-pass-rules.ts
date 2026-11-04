import { z } from "zod";

export const passTypes = ["guest", "delivery", "cab", "vendor"] as const;
export const MAX_PASS_DAYS = 30;

export function shiftPassDate(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function passDateBoundary(day: string, end = false) {
  return new Date(`${day}T${end ? "23:59:59.999" : "00:00:00.000"}+05:30`);
}

export function phoneKey(phone: string) {
  return phone.replace(/\D/g, "").replace(/^(?:91|0)(?=\d{10}$)/, "");
}

export function validVisitorPhone(phone: string) {
  const length = phoneKey(phone).length;
  return /^[+\d][\d\s()-]*$/.test(phone) && length >= 7 && length <= 15;
}

const calendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((day) => shiftPassDate(day, 0) === day);

export const passRequest = z.object({
  type: z.enum(passTypes),
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(100).optional(),
  purpose: z.string().trim().max(160).optional(),
  validFrom: calendarDay,
  validTo: calendarDay.optional(),
  recurringCab: z.boolean().optional(),
  notes: z.string().trim().max(300).optional(),
  leaveAtGate: z.boolean().optional(),
});

export function validatePassRequest(input: unknown, today: string) {
  const parsed = passRequest.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => {
      const field = String(issue.path[0] ?? "type");
      const message = field === "validFrom" || field === "validTo" ? "Choose a valid date." : "Check this value.";
      return [field, message];
    })) } as const;
  }
  const d = parsed.data;
  const guest = d.type === "guest";
  const recurringCab = d.type === "cab" && !!d.recurringCab;
  const validTo = guest || recurringCab ? d.validTo : d.validFrom;
  const fieldErrors: Record<string, string> = {};
  if (guest && !d.name) fieldErrors.name = "Enter your guest’s name.";
  if (guest && d.phone && !validVisitorPhone(d.phone)) fieldErrors.phone = "Enter a valid phone number.";
  if (d.validFrom < today) fieldErrors.validFrom = "Choose today or a future date.";
  if (!validTo || validTo < d.validFrom) fieldErrors.validTo = "Choose an end date on or after the start date.";
  else if (validTo > shiftPassDate(d.validFrom, MAX_PASS_DAYS - 1)) fieldErrors.validTo = "Choose a window of 30 days or less.";
  if (Object.keys(fieldErrors).length || !validTo) return { fieldErrors } as const;

  return { pass: {
    type: d.type,
    name: guest ? d.name! : { delivery: "Delivery", cab: recurringCab ? "Daily cab pickup" : "Cab", vendor: "Service visit" }[d.type as Exclude<typeof d.type, "guest">],
    phone: guest ? d.phone || null : null,
    company: d.company || null,
    purpose: d.purpose || null,
    validFrom: passDateBoundary(d.validFrom),
    validTo: passDateBoundary(validTo, true),
    recurringCab,
    notes: d.notes || null,
    leaveAtGate: d.type === "delivery" && !!d.leaveAtGate,
  } } as const;
}
