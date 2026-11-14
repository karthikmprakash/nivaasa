import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dailyHelpReviews, staff, staffAttendance, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { reviewDailyHelp } from "@/lib/actions/household";
import { todayISO } from "@/lib/utils";

type Route = { params: Promise<{ id: string }> };

async function resident() {
  const session = await getSession();
  if (!session?.unit || !session.society || !session.membership ||
      session.membership.role === "guard" || session.user.globalRole === "super_admin") return null;
  return { ...session, unit: session.unit, society: session.society };
}

export async function GET(_request: Request, { params }: Route) {
  const ctx = await resident();
  if (!ctx) return NextResponse.json({ error: "Resident access required." }, { status: 401 });
  const { id } = await params;
  const person = db.select({
    name: staff.name, role: staff.role, shift: staff.shift, verified: staff.policeVerified,
  }).from(staff).where(and(eq(staff.id, id), eq(staff.unitId, ctx.unit.id),
    eq(staff.societyId, ctx.society.id), eq(staff.kind, "daily_help"), eq(staff.active, true))).get();
  if (!person) return NextResponse.json({ error: "Daily help profile not found." }, { status: 404 });

  const attendance = db.select({
    id: staffAttendance.id, date: staffAttendance.date, checkInAt: staffAttendance.checkInAt, checkOutAt: staffAttendance.checkOutAt,
  }).from(staffAttendance).where(and(eq(staffAttendance.staffId, id), eq(staffAttendance.unitId, ctx.unit.id),
    eq(staffAttendance.societyId, ctx.society.id), gte(staffAttendance.date, todayISO(-13)), lte(staffAttendance.date, todayISO())))
    .orderBy(desc(staffAttendance.date)).all();
  const reviews = db.select({
    id: dailyHelpReviews.id, author: users.name, rating: dailyHelpReviews.rating,
    review: dailyHelpReviews.review, reviewerId: dailyHelpReviews.reviewerId,
  }).from(dailyHelpReviews).innerJoin(users, eq(users.id, dailyHelpReviews.reviewerId))
    .where(eq(dailyHelpReviews.staffId, id)).orderBy(desc(dailyHelpReviews.updatedAt)).all();
  return NextResponse.json({
    person, attendance, reviews: reviews.map(({ reviewerId, ...review }) => ({ ...review, yours: reviewerId === ctx.user.id })),
  });
}

const schema = z.object({ rating: z.number().int().min(1).max(5), review: z.string().trim().max(500).optional() });

export async function POST(request: Request, { params }: Route) {
  if (!await resident()) return NextResponse.json({ error: "Resident access required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose 1–5 stars and keep your review within 500 characters." }, { status: 400 });
  const { id } = await params;
  const form = new FormData();
  form.set("staffId", id);
  form.set("rating", String(parsed.data.rating));
  form.set("review", parsed.data.review ?? "");
  const result = await reviewDailyHelp({}, form);
  return result.error ? NextResponse.json({ error: result.error }, { status: 400 }) : NextResponse.json({ ok: true });
}
