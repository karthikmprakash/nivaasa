/**
 * Nivaasa demo seed
 * Run: npm run db:seed (from repo root, after drizzle-kit push)
 */
import { randomUUID } from "node:crypto";
import {
  societies, towers, units, users, memberships, familyMembers, vehicles, pets, staff, staffAttendance,
  vendors, assets, billingHeads, invoices, invoiceItems, payments, expenses, amenities, amenityBookings,
  notices, discussions, discussionComments, polls, pollVotes, events, eventRsvps, classifieds, documents,
  visitors, deliveries, helpdeskTickets, ticketComments, patrolCheckpoints, patrolRounds, panicAlerts,
  moveRequests, notifications, auditLogs, type SocietySettings,
} from "./schema";
import { db, sqlite } from "./index";
import { hashPassword } from "../lib/password";

const now = new Date();
const id = () => randomUUID();
const P = (rupees: number) => Math.round(rupees * 100);
const day = (offset: number, hour = 10, minute = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateISO = (offset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return isoLocal(d);
};
const dateOf = (d: Date) => isoLocal(d);

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261104);

const settings: SocietySettings = {
  visitorApproval: true,
  visitorPassTtlHours: 24,
  discussionApproval: true,
  allowResidentClassifieds: true,
  lateFeePercent: 2,
  graceDays: 5,
  paymentGateway: "demo",
  helpdeskSlaHours: 24,
};

async function main() {
  console.log("Wiping existing data…");
  sqlite.pragma("foreign_keys = OFF");
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
  for (const { name } of tables) sqlite.exec(`DELETE FROM "${name}"`);
  sqlite.pragma("foreign_keys = ON");

  const passwordHash = hashPassword("demo1234");
  const pass = hashPassword("demo1234");

  // ── Societies ────────────────────────────────────────────────────────────────
  const vh = id();
  const lv = id();
  const vhTowers = [
    { id: id(), name: "Aster", code: "A", floors: 6, unitsCount: 24 },
    { id: id(), name: "Bougainvillea", code: "B", floors: 6, unitsCount: 24 },
    { id: id(), name: "Cedar", code: "C", floors: 6, unitsCount: 24 },
  ];
  const lvTowers = [
    { id: id(), name: "Lotus", code: "L", floors: 4, unitsCount: 12 },
    { id: id(), name: "Mango", code: "M", floors: 4, unitsCount: 12 },
  ];

  await db.insert(societies).values([
    {
      id: vh, name: "Verdant Heights", slug: "verdant-heights", tagline: "A greener way to live together",
      address: "18, Sarjapur Main Road, Bellandur", city: "Bengaluru", state: "Karnataka", pincode: "560103",
      primaryColor: "#3155d8", accentColor: "#ef7fa4", unitsCount: 72, establishedYear: 2016,
      registrationNo: "RWA/KA/2016/00842", gstin: "29AABCV1234F1Z5", pan: "AABCV1234F",
      bankName: "HDFC Bank", bankAccount: "50200012345678", ifsc: "HDFC0001234",
      settings, createdAt: day(-365 * 8),
    },
    {
      id: lv, name: "Lakeview Residences", slug: "lakeview-residences", tagline: "Morning light, lakeside living",
      address: "7, North Main Road, Koregaon Park", city: "Pune", state: "Maharashtra", pincode: "411001",
      primaryColor: "#3155d8", accentColor: "#ef7fa4", unitsCount: 24, establishedYear: 2020,
      registrationNo: "RWA/MH/2020/01123", gstin: "27AABCV5678G1Z2", pan: "AABCV5678G",
      bankName: "ICICI Bank", bankAccount: "002101234567", ifsc: "ICIC0000021",
      settings, createdAt: day(-365 * 5),
    },
  ]);

  await db.insert(towers).values([
    ...vhTowers.map((t, i) => ({ ...t, societyId: vh, sortOrder: i })),
    ...lvTowers.map((t, i) => ({ ...t, societyId: lv, sortOrder: i })),
  ]);

  // ── Units ───────────────────────────────────────────────────────────────────
  const areaBySlot = [640, 910, 910, 1480];
  const typeBySlot = ["1BHK", "2BHK", "2BHK", "3BHK"] as const;
  const vhUnits: { id: string; towerId: string; number: string; floor: number; areaSqft: number; unitType: string; parkingSlots: number }[] = [];
  for (const tower of vhTowers) {
    for (let floor = 1; floor <= 6; floor++) {
      for (let slot = 1; slot <= 4; slot++) {
        vhUnits.push({
          id: id(), towerId: tower.id, number: `${tower.code}-${floor}${String(slot).padStart(2, "0")}`,
          floor, areaSqft: areaBySlot[slot - 1], unitType: typeBySlot[slot - 1], parkingSlots: slot === 1 ? 1 : slot === 4 ? 2 : 1,
        });
      }
    }
  }
  const lvUnits: typeof vhUnits = [];
  for (const tower of lvTowers) {
    for (let floor = 1; floor <= 4; floor++) {
      for (let slot = 1; slot <= 3; slot++) {
        lvUnits.push({
          id: id(), towerId: tower.id, number: `${tower.code}-${floor}${String(slot).padStart(2, "0")}`,
          floor, areaSqft: [720, 1080, 1620][slot - 1], unitType: ["1BHK", "2BHK", "3BHK"][slot - 1], parkingSlots: 1,
        });
      }
    }
  }
  await db.insert(units).values([
    ...vhUnits.map((u) => ({
      ...u, societyId: vh, floor: u.floor, areaSqft: u.areaSqft,
      unitType: u.unitType as "1BHK" | "2BHK" | "3BHK", status: "occupied" as const,
      ownership: "owner_occupied" as const, createdAt: day(-300),
      intercomPrimary: null, intercomSecondary: null,
    })),
    ...lvUnits.map((u) => ({
      ...u, societyId: lv, areaSqft: u.areaSqft, unitType: u.unitType as "1BHK" | "2BHK" | "3BHK",
      status: "occupied" as const, ownership: "owner_occupied" as const, createdAt: day(-250),
    })),
  ]);
  const unitByNumber = new Map(vhUnits.map((u) => [u.number, u]));

  // ── Users ───────────────────────────────────────────────────────────────────
  type ResidentSeed = {
    slug: string; name: string; unit: string; role: "owner" | "tenant" | "committee";
    phone: string; color: string; designation?: string; demo?: boolean;
  };
  const residentSeeds: ResidentSeed[] = [
    { slug: "resident", name: "Aarav Mehta", unit: "A-402", role: "owner", phone: "+91 98450 11223", color: "#3155d8", demo: true },
    { slug: "neha", name: "Neha Kulkarni", unit: "B-203", role: "committee", phone: "+91 99001 44556", color: "#c2547e", designation: "Honorary Secretary" },
    { slug: "riya", name: "Riya Sen", unit: "C-101", role: "tenant", phone: "+91 98111 77234", color: "#6b7fd7" },
    { slug: "kabir", name: "Kabir Khan", unit: "A-201", role: "owner", phone: "+91 97400 55221", color: "#2f8f83", designation: "Tennis enthusiast" },
    { slug: "ananya", name: "Ananya Iyer", unit: "B-104", role: "owner", phone: "+91 98860 33445", color: "#b1673f" },
    { slug: "rahul", name: "Rahul Deshmukh", unit: "C-302", role: "owner", phone: "+91 98220 99887", color: "#5a6acf" },
    { slug: "meera", name: "Meera Pillai", unit: "A-503", role: "tenant", phone: "+91 90040 66554", color: "#9b5b8a" },
    { slug: "arjun", name: "Arjun Nair", unit: "B-401", role: "owner", phone: "+91 99450 22110", color: "#3f7f5f" },
    { slug: "sneha", name: "Sneha Kapoor", unit: "C-204", role: "owner", phone: "+91 98670 88776", color: "#a25b5b" },
    { slug: "dev", name: "Dev Patel", unit: "A-304", role: "owner", phone: "+91 99870 12345", color: "#4f6d8f" },
  ];

  const staffUsers = [
    { key: "admin", name: "Priya Nair", email: "admin@nivaasa.app", phone: "+91 98450 89012", color: "#3155d8", role: "manager" as const, designation: "Community Manager" },
    { key: "guard", name: "Ramesh Yadav", email: "guard@nivaasa.app", phone: "+91 97400 22334", color: "#2f6b4f", role: "guard" as const, designation: "Head Security — Gate 1" },
    { key: "accountant", name: "Sanjay Rao", email: "accountant@nivaasa.app", phone: "+91 99000 55667", color: "#7a5c3e", role: "accountant" as const, designation: "Society Accountant" },
    { key: "security", name: "Imran Shaikh", email: "security@nivaasa.app", phone: "+91 98111 88990", color: "#3b4f7a", role: "security_manager" as const, designation: "Security Manager" },
    { key: "helpdesk", name: "Fatima Sheikh", email: "helpdesk@nivaasa.app", phone: "+91 90080 44332", color: "#8a4f6b", role: "helpdesk_manager" as const, designation: "Helpdesk Supervisor" },
    { key: "auditor", name: "K. Srinivasan", email: "auditor@nivaasa.app", phone: "+91 98800 77665", color: "#5a5a5a", role: "auditor" as const, designation: "Statutory Auditor" },
  ];

  const userIds = new Map<string, string>();
  const membershipRows: (typeof memberships.$inferInsert)[] = [];
  const userRows: (typeof users.$inferInsert)[] = [];

  // Demo resident accounts
  for (const r of residentSeeds) {
    const uid = id();
    userIds.set(r.slug, uid);
    const email = r.demo ? `${r.slug}@nivaasa.app` : `${r.slug}@nivaasa.app`;
    userRows.push({ id: uid, name: r.name, email, phone: r.phone, passwordHash, avatarColor: r.color, createdAt: day(-120) });
    membershipRows.push({
      id: id(), userId: uid, societyId: vh, unitId: unitByNumber.get(r.unit)!.id, role: r.role,
      designation: r.designation, status: "active", isPrimary: true, joinedAt: day(-120),
    });
  }
  for (const s of staffUsers) {
    const uid = id();
    userIds.set(s.key, uid);
    userRows.push({ id: uid, name: s.name, email: s.email, phone: s.phone, passwordHash, avatarColor: s.color, createdAt: day(-200) });
    membershipRows.push({
      id: id(), userId: uid, societyId: vh, unitId: null, role: s.role, designation: s.designation,
      status: "active", isPrimary: true, joinedAt: day(-200),
    });
  }
  const assigneeRavi = id();
  const assigneeSuresh = id();
  userRows.push(
    { id: assigneeRavi, name: "Ravi Kumar", email: "ravi@nivaasa.app", phone: "+91 98860 11223", passwordHash: pass, avatarColor: "#7a6a4f", createdAt: day(-300) },
    { id: assigneeSuresh, name: "Suresh Patil", email: "suresh@nivaasa.app", phone: "+91 98450 99887", passwordHash: pass, avatarColor: "#5b6f5b", createdAt: day(-300) },
  );
  // Portfolio owner
  const superId = id();
  userIds.set("super", superId);
  userRows.push({
    id: superId, name: "Vikram Shah", email: "owner@nivaasa.app", phone: "+91 98200 44556",
    passwordHash, avatarColor: "#242f4f", globalRole: "super_admin", createdAt: day(-400),
  });
  // Lakeview admin
  const lvAdminId = id();
  userIds.set("pune", lvAdminId);
  userRows.push({ id: lvAdminId, name: "Meghna Joshi", email: "pune@nivaasa.app", phone: "+91 98220 33445", passwordHash, avatarColor: "#3d5a80", createdAt: day(-300) });
  const lvResidentId = id();
  userRows.push({ id: lvResidentId, name: "Aditya Kulkarni", email: "aditya@nivaasa.app", phone: "+91 98220 66778", passwordHash, avatarColor: "#6b5b95", createdAt: day(-260) });

  await db.insert(users).values(userRows);
  membershipRows.push(
    { id: id(), userId: lvAdminId, societyId: lv, unitId: null, role: "manager", designation: "Community Manager" as string, status: "active", isPrimary: true, joinedAt: day(-300) },
    { id: id(), userId: lvResidentId, societyId: lv, unitId: lvUnits[0].id, role: "owner", status: "active", isPrimary: true, joinedAt: day(-260) },
  );
  membershipRows.push(
    { id: id(), userId: superId, societyId: vh, unitId: null, role: "admin", designation: "Portfolio Owner", status: "active", isPrimary: true, joinedAt: day(-400) },
    { id: id(), userId: superId, societyId: lv, unitId: null, role: "admin", designation: "Portfolio Owner", status: "active", isPrimary: false, joinedAt: day(-400) },
  );
  await db.insert(memberships).values(membershipRows);
  const residentMember = new Map<string, string>();
  // (unitId unavailable here; fetch later by querying membership rows would be heavy, so map by slug)
  for (const m of membershipRows) {
    for (const [slug, uid] of userIds) if (m.userId === uid && m.societyId === vh) residentMember.set(slug, m.id);
  }

  // ── Household details ──────────────────────────────────────────────────────
  await db.insert(familyMembers).values([
    { id: id(), membershipId: residentMember.get("resident")!, name: "Ishita Mehta", relation: "Spouse", phone: "+91 98450 11224", age: 36, hasApp: true },
    { id: id(), membershipId: residentMember.get("resident")!, name: "Myra Mehta", relation: "Daughter", age: 9, hasApp: false },
    { id: id(), membershipId: residentMember.get("resident")!, name: "Kamla Mehta", relation: "Mother", phone: "+91 98450 11225", age: 67, hasApp: false },
    { id: id(), membershipId: residentMember.get("neha")!, name: "Adwait Kulkarni", relation: "Spouse", phone: "+91 99001 44557", age: 41, hasApp: true },
    { id: id(), membershipId: residentMember.get("riya")!, name: "Tara Sen", relation: "Roommate", phone: "+91 98111 77235", age: 25, hasApp: true },
  ]);

  await db.insert(vehicles).values([
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, userId: userIds.get("resident"), type: "ev", make: "Tesla", model: "Model 3", color: "Pearl White", registrationNo: "KA 01 EV 4821", parkingSlot: "B2-114", createdAt: day(-100) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, userId: userIds.get("resident"), type: "bike", make: "Honda", model: "Activa 6G", color: "Grey", registrationNo: "KA 05 HJ 7788", parkingSlot: "B2-115", createdAt: day(-80) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("B-203")!.id, userId: userIds.get("neha"), type: "car", make: "Hyundai", model: "Ioniq 5", color: "Midnight Blue", registrationNo: "KA 03 MN 2210", parkingSlot: "B1-032", createdAt: day(-60) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-302")!.id, userId: userIds.get("rahul"), type: "car", make: "Maruti", model: "Brezza", color: "Silver", registrationNo: "KA 51 AC 9033", parkingSlot: "B3-009", createdAt: day(-200) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-201")!.id, userId: userIds.get("kabir"), type: "car", make: "Volkswagen", model: "Virtus", color: "Carbon Grey", registrationNo: "KA 01 ZX 6612", parkingSlot: "B2-004", createdAt: day(-150) },
  ]);

  await db.insert(pets).values([
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, name: "Coco", species: "Dog", breed: "Golden Retriever", ageYears: 3, vaccinationDue: dateISO(28), vaccinated: true, notes: "Friendly, loves the lawn" },
    { id: id(), societyId: vh, unitId: unitByNumber.get("B-203")!.id, name: "Mochi", species: "Cat", breed: "Indie", ageYears: 2, vaccinationDue: dateISO(12), vaccinated: true },
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-302")!.id, name: "Bruno", species: "Dog", breed: "Labrador", ageYears: 5, vaccinationDue: dateISO(-10), vaccinated: false, notes: "Vaccination overdue" },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-503")!.id, name: "Pari", species: "Bird", breed: "Budgerigar", ageYears: 1, vaccinated: true },
  ]);

  // ── Society staff & daily help ─────────────────────────────────────────────
  const staffRows: (typeof staff.$inferInsert)[] = [
    { id: id(), societyId: vh, userId: userIds.get("guard"), name: "Ramesh Yadav", kind: "security", role: "Head Security", phone: "+91 97400 22334", idType: "Aadhaar", idLast4: "4821", photoColor: "#2f6b4f", shift: "6:00 AM – 2:00 PM", rating: 4.8, policeVerified: true, joinedAt: day(-900) },
    { id: id(), societyId: vh, name: "Imran Shaikh", kind: "security", role: "Security Supervisor", phone: "+91 98111 88990", idType: "Aadhaar", idLast4: "1120", photoColor: "#3b4f7a", shift: "General", rating: 4.7, policeVerified: true, joinedAt: day(-700) },
    { id: id(), societyId: vh, name: "Suresh Patil", kind: "society", role: "Electrician", phone: "+91 98450 99887", idType: "Aadhaar", idLast4: "7781", photoColor: "#5b6f5b", shift: "9:00 AM – 6:00 PM", rating: 4.6, policeVerified: true, joinedAt: day(-500) },
    { id: id(), societyId: vh, name: "Ravi Kumar", kind: "society", role: "Plumber", phone: "+91 98860 11223", idType: "Aadhaar", idLast4: "2234", photoColor: "#7a6a4f", shift: "9:00 AM – 6:00 PM", rating: 4.4, policeVerified: true, joinedAt: day(-400) },
    { id: id(), societyId: vh, name: "Ganesh Pawar", kind: "society", role: "Gardener", phone: "+91 90080 11223", idType: "Aadhaar", idLast4: "9912", photoColor: "#4c7a4c", shift: "6:00 AM – 12:00 PM", rating: 4.9, policeVerified: true, joinedAt: day(-800) },
    { id: id(), societyId: vh, name: "Fatima Sheikh", kind: "society", role: "Housekeeping Supervisor", phone: "+91 90080 44332", idType: "Aadhaar", idLast4: "6712", photoColor: "#8a4f6b", shift: "7:00 AM – 4:00 PM", rating: 4.8, policeVerified: true, joinedAt: day(-600) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, name: "Sunita Devi", kind: "daily_help", role: "House help", phone: "+91 98860 44556", idType: "Aadhaar", idLast4: "3320", photoColor: "#c2547e", shift: "8:00 AM – 11:00 AM", rating: 4.9, policeVerified: true, monthlyRate: P(6000), joinedAt: day(-350) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, name: "Lakshmi Rao", kind: "daily_help", role: "Cook", phone: "+91 99001 77665", idType: "Aadhaar", idLast4: "8810", photoColor: "#b1673f", shift: "7:00 AM – 9:00 AM, 6:00 PM – 8:00 PM", rating: 4.8, policeVerified: true, monthlyRate: P(8000), joinedAt: day(-280) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, name: "Manoj Singh", kind: "daily_help", role: "Driver", phone: "+91 97400 66554", idType: "DL", idLast4: "1198", photoColor: "#4f6d8f", shift: "On call", rating: 4.7, policeVerified: true, monthlyRate: P(12000), joinedAt: day(-400) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("B-203")!.id, name: "Pooja Naik", kind: "daily_help", role: "House help", phone: "+91 98860 22334", idType: "Aadhaar", idLast4: "5567", photoColor: "#9b5b8a", shift: "8:00 AM – 10:00 AM", rating: 4.6, policeVerified: true, monthlyRate: P(5500), joinedAt: day(-200) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-101")!.id, name: "Rekha Bai", kind: "daily_help", role: "House help", phone: "+91 99000 33445", idType: "Aadhaar", idLast4: "7723", photoColor: "#a25b5b", shift: "9:00 AM – 12:00 PM", rating: 4.5, policeVerified: false, monthlyRate: P(5000), joinedAt: day(-90) },
  ];
  await db.insert(staff).values(staffRows);
  const staffByName = new Map(staffRows.map((s) => [s.name, s.id!]));
  const today = dateISO(0);
  await db.insert(staffAttendance).values([
    { id: id(), societyId: vh, staffId: staffByName.get("Sunita Devi")!, unitId: unitByNumber.get("A-402")!.id, date: today, checkInAt: day(0, 8, 12), method: "guard", markedBy: userIds.get("guard") },
    { id: id(), societyId: vh, staffId: staffByName.get("Lakshmi Rao")!, unitId: unitByNumber.get("A-402")!.id, date: today, checkInAt: day(0, 7, 2), method: "guard", markedBy: userIds.get("guard") },
    { id: id(), societyId: vh, staffId: staffByName.get("Manoj Singh")!, unitId: unitByNumber.get("A-402")!.id, date: today, checkInAt: day(0, 9, 15), method: "guard", markedBy: userIds.get("guard") },
    { id: id(), societyId: vh, staffId: staffByName.get("Suresh Patil")!, date: today, checkInAt: day(0, 9, 1), method: "selfie" },
    { id: id(), societyId: vh, staffId: staffByName.get("Ganesh Pawar")!, date: today, checkInAt: day(0, 6, 5), method: "selfie" },
    { id: id(), societyId: vh, staffId: staffByName.get("Pooja Naik")!, unitId: unitByNumber.get("B-203")!.id, date: today, checkInAt: day(0, 8, 30), method: "guard", markedBy: userIds.get("guard") },
    { id: id(), societyId: vh, staffId: staffByName.get("Sunita Devi")!, unitId: unitByNumber.get("A-402")!.id, date: dateISO(-1), checkInAt: day(-1, 8, 9), checkOutAt: day(-1, 10, 45), method: "guard", markedBy: userIds.get("guard") },
    { id: id(), societyId: vh, staffId: staffByName.get("Lakshmi Rao")!, unitId: unitByNumber.get("A-402")!.id, date: dateISO(-1), checkInAt: day(-1, 7, 1), checkOutAt: day(-1, 9, 0), method: "guard", markedBy: userIds.get("guard") },
  ]);

  // ── Vendors & assets ───────────────────────────────────────────────────────
  const vendorSeeds = [
    { name: "CleanCity Facility Services", category: "Housekeeping", contactPerson: "Ravi Menon", phone: "+91 98450 77665", email: "ops@cleancity.in", gstin: "29AACCC1111D1Z3", monthlyValue: P(185000), rating: 4.6, status: "active" as const, contractStart: dateISO(-200), contractEnd: dateISO(160) },
    { name: "Orbit Elevators", category: "Lift AMC", contactPerson: "S. Balaji", phone: "+91 99001 22334", email: "service@orbitelevators.in", gstin: "29AABCO2222E1Z4", monthlyValue: P(42000), rating: 4.8, status: "active" as const, contractStart: dateISO(-340), contractEnd: dateISO(25) },
    { name: "Shield Security Solutions", category: "Security", contactPerson: "Vikas Rana", phone: "+91 98111 55667", email: "accounts@shieldsecurity.in", gstin: "29AACCS3333F1Z5", monthlyValue: P(320000), rating: 4.5, status: "active" as const, contractStart: dateISO(-180), contractEnd: dateISO(180) },
    { name: "GreenLeaf Landscaping", category: "Landscaping", contactPerson: "Lakshmi Iyer", phone: "+91 90080 88990", email: "hello@greenleaf.in", gstin: "29AABCG4444G1Z6", monthlyValue: P(38000), rating: 4.7, status: "expiring" as const, contractStart: dateISO(-350), contractEnd: dateISO(20) },
    { name: "AquaPure Tankers", category: "Water", contactPerson: "Irfan Ali", phone: "+91 98860 33445", email: "orders@aquapure.in", gstin: "29AABCA5555H1Z7", monthlyValue: P(56000), rating: 4.2, status: "active" as const, contractStart: dateISO(-150), contractEnd: dateISO(210) },
    { name: "PestGuard India", category: "Pest control", contactPerson: "Nisha Pillai", phone: "+91 99000 11223", email: "service@pestguard.in", gstin: "29AABCP6666J1Z8", monthlyValue: P(14000), rating: 4.4, status: "active" as const, contractStart: dateISO(-90), contractEnd: dateISO(270) },
  ];
  const vendorIds: string[] = [];
  await db.insert(vendors).values(vendorSeeds.map((v) => {
    const vid = id(); vendorIds.push(vid);
    return { id: vid, societyId: vh, ...v, createdAt: day(-180) };
  }));

  await db.insert(assets).values([
    { id: id(), societyId: vh, name: "Commercial treadmill", category: "Gym", location: "Clubhouse gym", quantity: 4, purchaseDate: dateISO(-900), value: P(180000), amcVendorId: vendorIds[1], amcDue: dateISO(18), condition: "good" },
    { id: id(), societyId: vh, name: "CCTV cameras — 32 channels", category: "Security", location: "Common areas", quantity: 32, purchaseDate: dateISO(-700), value: P(520000), amcVendorId: vendorIds[2], amcDue: dateISO(45), condition: "good" },
    { id: id(), societyId: vh, name: "DG set — 250 kVA", category: "Utilities", location: "Utility yard", quantity: 1, purchaseDate: dateISO(-1200), value: P(1400000), amcVendorId: vendorIds[1], amcDue: dateISO(9), condition: "needs_service" },
    { id: id(), societyId: vh, name: "Clubhouse furniture set", category: "Clubhouse", location: "Community hall", quantity: 12, purchaseDate: dateISO(-500), value: P(260000), condition: "good" },
    { id: id(), societyId: vh, name: "Garden irrigation system", category: "Landscaping", location: "Central garden", quantity: 1, purchaseDate: dateISO(-300), value: P(95000), amcVendorId: vendorIds[3], amcDue: dateISO(60), condition: "good" },
  ]);

  // ── Billing setup ──────────────────────────────────────────────────────────
  const headSeeds = [
    { name: "Maintenance", code: "MNT", basis: "per_sqft" as const, defaultAmount: 350, gstRate: 0, description: "Monthly maintenance at ₹3.50 per sq ft" },
    { name: "Sinking Fund", code: "SNK", basis: "fixed" as const, defaultAmount: 100000, gstRate: 0, description: "Long-term capital reserve" },
    { name: "Water Charges", code: "WTR", basis: "fixed" as const, defaultAmount: 40000, gstRate: 0, description: "Common water supply" },
    { name: "Security & Housekeeping", code: "SEC", basis: "fixed" as const, defaultAmount: 60000, gstRate: 0, description: "Security and common area upkeep" },
    { name: "Clubhouse", code: "CLB", basis: "fixed" as const, defaultAmount: 25000, gstRate: 0, description: "Clubhouse membership" },
    { name: "Parking", code: "PRK", basis: "per_unit" as const, defaultAmount: 50000, gstRate: 0, description: "Covered parking" },
  ];
  const heads: { id: string; name: string; code: string; basis: string; defaultAmount: number }[] = [];
  await db.insert(billingHeads).values(headSeeds.map((h, i) => {
    const hid = id(); heads.push({ id: hid, ...h });
    return { id: hid, societyId: vh, ...h, recurring: true, active: true, sortOrder: i };
  }));
  await db.insert(billingHeads).values([
    { id: id(), societyId: lv, name: "Maintenance", code: "MNT", basis: "per_sqft", defaultAmount: 320, gstRate: 0, recurring: true, active: true, sortOrder: 0 },
    { id: id(), societyId: lv, name: "Sinking Fund", code: "SNK", basis: "fixed", defaultAmount: 80000, gstRate: 0, recurring: true, active: true, sortOrder: 1 },
    { id: id(), societyId: lv, name: "Water Charges", code: "WTR", basis: "fixed", defaultAmount: 30000, gstRate: 0, recurring: true, active: true, sortOrder: 2 },
  ]);

  // ── Invoices, items, payments ──────────────────────────────────────────────
  const months: { key: string; label: string; start: Date; end: Date; issue: Date; due: Date }[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
    const issue = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const due = new Date(now.getFullYear(), now.getMonth() - offset, 15);
    months.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: start.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      start, end, issue, due,
    });
  }

  let invoiceSeq = 1;
  let receiptSeq = 1;
  const invoiceRows: (typeof invoices.$inferInsert)[] = [];
  const itemRows: (typeof invoiceItems.$inferInsert)[] = [];
  const paymentRows: (typeof payments.$inferInsert)[] = [];
  const invoiceByUnitMonth = new Map<string, { id: string; total: number; status: string; paid: number }>();

  for (const unit of vhUnits) {
    for (let m = 0; m < months.length; m++) {
      const month = months[m];
      const isCurrent = m === months.length - 1;
      const items = heads.map((h) => {
        let amount = h.defaultAmount;
        if (h.basis === "per_sqft") amount = unit.areaSqft * h.defaultAmount;
        if (h.basis === "per_unit") amount = unit.parkingSlots * h.defaultAmount;
        return { ...h, amount };
      });
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const penalty = 0;
      const total = subtotal + penalty;
      const invId = id();
      const number = `VH/2026-27/${String(invoiceSeq++).padStart(4, "0")}`;
      let status: "due" | "partially_paid" | "paid" | "overdue" = "due";
      let paid = 0;
      const roll = rand();

      if (!isCurrent) {
        if (roll < 0.9) status = "paid";
        else if (roll < 0.96) status = "overdue";
        else status = "partially_paid";
      } else if (roll < 0.35) status = "paid";
      else if (roll < 0.42) status = "partially_paid";

      // Deterministic resident story
      if (unit.number === "A-402") {
        if (month.key === "2026-07") status = "overdue";
        else if (isCurrent) status = "due";
        else status = "paid";
      }
      if (unit.number === "B-203" && isCurrent) status = "due";
      if (unit.number === "C-101" && isCurrent) status = "overdue";

      if (status === "paid") paid = total;
      if (status === "partially_paid") paid = Math.round(total * (m === months.length - 1 ? 0.5 : 0.6));
      if (status === "overdue") {
        const pen = Math.round(total * 0.02);
        invoiceRows.push({
          id: invId, societyId: vh, unitId: unit.id, number, title: `${month.label} Maintenance`,
          periodStart: dateOf(month.start), periodEnd: dateOf(month.end), issueDate: dateOf(month.issue), dueDate: dateOf(month.due),
          subtotal, gstAmount: 0, penalty: pen, discount: 0, total: total + pen, amountPaid: paid,
          status: "overdue", createdBy: userIds.get("admin"), createdAt: month.issue,
        });
        invoiceByUnitMonth.set(`${unit.number}:${month.key}`, { id: invId, total: total + pen, status, paid });
      } else {
        invoiceRows.push({
          id: invId, societyId: vh, unitId: unit.id, number, title: `${month.label} Maintenance`,
          periodStart: dateOf(month.start), periodEnd: dateOf(month.end), issueDate: dateOf(month.issue), dueDate: dateOf(month.due),
          subtotal, gstAmount: 0, penalty: 0, discount: 0, total, amountPaid: paid,
          status, createdBy: userIds.get("admin"), createdAt: month.issue,
        });
        invoiceByUnitMonth.set(`${unit.number}:${month.key}`, { id: invId, total, status, paid });
      }

      for (const item of items) {
        itemRows.push({
          id: id(), invoiceId: invId, headId: item.id, description: item.name,
          quantity: item.basis === "per_sqft" ? unit.areaSqft : 1, rate: item.defaultAmount, amount: item.amount,
        });
      }

      if (paid > 0) {
        const paidDay = new Date(month.issue);
        paidDay.setDate(Math.min(14, 3 + Math.floor(rand() * 12)));
        paidDay.setHours(10 + Math.floor(rand() * 8), Math.floor(rand() * 60), 0, 0);
        const methods = ["upi", "card", "netbanking", "neft"] as const;
        const method = unit.number === "A-402" ? "upi" : methods[Math.floor(rand() * methods.length)];
        paymentRows.push({
          id: id(), societyId: vh, unitId: unit.id, invoiceId: invId,
          userId: unit.number === "A-402" ? userIds.get("resident") : null,
          receiptNo: `VH-RCPT-${String(receiptSeq++).padStart(5, "0")}`,
          amount: paid, method, reference: method === "upi" ? `UPI/${Math.floor(100000000000 + rand() * 899999999999)}` : null,
          status: "success", paidAt: paidDay, createdAt: paidDay,
        });
      }
    }
  }

  // Lakeview invoices
  for (const unit of lvUnits) {
    for (let m = 4; m <= 5; m++) {
      const month = months[m];
      const items = [
        { name: "Maintenance", amount: unit.areaSqft * 320 },
        { name: "Sinking Fund", amount: 80000 },
        { name: "Water Charges", amount: 30000 },
      ];
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const invId = id();
      const number = `LV/2026-27/${String(invoiceSeq++).padStart(4, "0")}`;
      const isCurrent = m === 5;
      const status = isCurrent ? (rand() < 0.5 ? "due" : "paid") : "paid";
      const paid = status === "paid" ? subtotal : 0;
      invoiceRows.push({
        id: invId, societyId: lv, unitId: unit.id, number, title: `${month.label} Maintenance`,
        periodStart: dateOf(month.start), periodEnd: dateOf(month.end), issueDate: dateOf(month.issue), dueDate: dateOf(month.due),
        subtotal, gstAmount: 0, penalty: 0, discount: 0, total: subtotal, amountPaid: paid,
        status: status as "due" | "paid", createdBy: lvAdminId, createdAt: month.issue,
      });
      for (const item of items) {
        itemRows.push({ id: id(), invoiceId: invId, description: item.name, quantity: 1, rate: item.amount, amount: item.amount });
      }
      if (paid) {
        paymentRows.push({
          id: id(), societyId: lv, unitId: unit.id, invoiceId: invId, userId: unit.id === lvUnits[0].id ? lvResidentId : null,
          receiptNo: `LV-RCPT-${String(receiptSeq++).padStart(5, "0")}`, amount: paid, method: "upi",
          status: "success", paidAt: month.issue, createdAt: month.issue,
        });
      }
    }
  }

  for (let i = 0; i < invoiceRows.length; i += 200) await db.insert(invoices).values(invoiceRows.slice(i, i + 200));
  for (let i = 0; i < itemRows.length; i += 400) await db.insert(invoiceItems).values(itemRows.slice(i, i + 400));
  for (let i = 0; i < paymentRows.length; i += 200) await db.insert(payments).values(paymentRows.slice(i, i + 200));

  // Add one offline payment intimation pending verification (A-402, Jul invoice)
  const julInvoice = invoiceByUnitMonth.get(`A-402:2026-07`);
  if (julInvoice) {
    await db.insert(payments).values({
      id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, invoiceId: julInvoice.id,
      userId: userIds.get("resident"), receiptNo: `VH-RCPT-${String(receiptSeq++).padStart(5, "0")}`,
      amount: julInvoice.total, method: "neft", reference: "NEFT/HDFC/88421009", status: "pending",
      note: "Paid via NEFT from HDFC joint account. Awaiting verification.", paidAt: day(-2, 16, 20), createdAt: day(-2, 16, 20),
    });
  }

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expenseRows: (typeof expenses.$inferInsert)[] = [];
  const monthlyExpenses = [
    { vendor: 0, category: "Housekeeping", desc: "Monthly housekeeping contract", amount: 185000, day: 3 },
    { vendor: 1, category: "Lift AMC", desc: "Lift maintenance & inspection", amount: 42000, day: 5 },
    { vendor: 2, category: "Security", desc: "Security guard deployment", amount: 320000, day: 7 },
    { vendor: 3, category: "Landscaping", desc: "Garden upkeep and seasonal planting", amount: 38000, day: 10 },
    { vendor: 4, category: "Water", desc: "Water tanker supply", amount: 56000, day: 12 },
    { vendor: 5, category: "Pest control", desc: "Quarterly pest control drive", amount: 14000, day: 16 },
    { vendor: null, category: "Electricity", desc: "Common area electricity — BESCOM", amount: 98000, day: 18 },
    { vendor: null, category: "Repairs", desc: "Plumbing and civil repairs", amount: 27500, day: 22 },
    { vendor: null, category: "Events", desc: "Community event & refreshments", amount: 32000, day: 26 },
  ];
  for (let m = 0; m < months.length; m++) {
    const month = months[m];
    for (const e of monthlyExpenses) {
      const d = new Date(month.start);
      d.setDate(e.day);
      const status = m === months.length - 1 && e.day > 10 ? "pending" : "paid";
      expenseRows.push({
        id: id(), societyId: vh, vendorId: e.vendor == null ? null : vendorIds[e.vendor], category: e.category,
        description: e.desc, amount: P(e.amount + (rand() < 0.3 ? Math.floor(rand() * 4000) : 0)),
        date: dateOf(d), status: status as "pending" | "paid", approvedBy: userIds.get("admin"), createdAt: d,
      });
    }
  }
  await db.insert(expenses).values(expenseRows);

  // ── Amenities ──────────────────────────────────────────────────────────────
  const amenitySeeds = [
    { name: "Clubhouse Party Hall", description: "Air-conditioned hall for celebrations, with projector and sound system.", icon: "party", location: "Clubhouse, ground floor", capacity: 80, slotMinutes: 120, price: P(5000), deposit: P(10000), openTime: "09:00", closeTime: "22:00", rules: "Bookings close 24 hours in advance. Music must stop by 10 PM. Refundable deposit returned after inspection.", sortOrder: 0 },
    { name: "Swimming Pool", description: "Six-lane pool with separate kids' pool and trained lifeguard.", icon: "waves", location: "Clubhouse, level 1", capacity: 20, slotMinutes: 60, price: 0, deposit: 0, openTime: "06:00", closeTime: "20:00", rules: "Swim caps are mandatory. Children below 10 must be accompanied by an adult.", sortOrder: 1 },
    { name: "Fitness Studio", description: "Fully equipped gym with cardio and strength training zones.", icon: "dumbbell", location: "Clubhouse, level 2", capacity: 15, slotMinutes: 60, price: 0, deposit: 0, openTime: "05:30", closeTime: "22:00", rules: "Please re-rack weights and carry a towel.", sortOrder: 2 },
    { name: "Tennis Court", description: "Synthetic hard court with floodlights for evening play.", icon: "trophy", location: "East lawn", capacity: 4, slotMinutes: 60, price: P(200), deposit: 0, openTime: "06:00", closeTime: "21:00", rules: "Non-marking shoes only. 24-hour cancellation window.", sortOrder: 3 },
    { name: "Badminton Court", description: "Indoor wooden court with tournament-grade net.", icon: "activity", location: "Clubhouse, level 1", capacity: 4, slotMinutes: 60, price: P(100), deposit: 0, openTime: "06:00", closeTime: "22:00", rules: "Bookings limited to 2 hours per day per household.", sortOrder: 4 },
    { name: "Guest Suite", description: "Comfortable studio suite for visiting family and friends.", icon: "bed", location: "Clubhouse, level 3", capacity: 3, slotMinutes: 1440, price: P(1500), deposit: P(2000), openTime: "12:00", closeTime: "11:00", rules: "Check-in 12 PM, check-out 11 AM. Valid ID required for all guests.", sortOrder: 5 },
    { name: "Yoga & Meditation Room", description: "Quiet, matted studio for yoga, pilates and meditation.", icon: "flower", location: "Clubhouse, level 2", capacity: 20, slotMinutes: 60, price: 0, deposit: 0, openTime: "05:30", closeTime: "20:00", rules: "Please keep the room silent during sessions.", sortOrder: 6 },
    { name: "Co-working Lounge", description: "Focused workspace with high-speed Wi-Fi and meeting nook.", icon: "laptop", location: "Clubhouse, ground floor", capacity: 12, slotMinutes: 60, price: 0, deposit: 0, openTime: "08:00", closeTime: "20:00", rules: "Calls must be taken in the meeting nook.", sortOrder: 7 },
  ];
  const amenityIds: string[] = [];
  await db.insert(amenities).values(amenitySeeds.map((a) => {
    const aid = id(); amenityIds.push(aid);
    return { id: aid, societyId: vh, active: true, ...a };
  }));

  await db.insert(amenityBookings).values([
    { id: id(), societyId: vh, amenityId: amenityIds[0], unitId: unitByNumber.get("B-203")!.id, userId: userIds.get("neha")!, date: dateISO(4), startTime: "18:00", endTime: "22:00", guests: 60, amount: P(5000), status: "confirmed", paymentStatus: "paid", notes: "Society Diwali get-together", createdAt: day(-2) },
    { id: id(), societyId: vh, amenityId: amenityIds[3], unitId: unitByNumber.get("A-201")!.id, userId: userIds.get("kabir")!, date: dateISO(1), startTime: "07:00", endTime: "08:00", guests: 2, amount: P(200), status: "confirmed", paymentStatus: "paid", createdAt: day(-1) },
    { id: id(), societyId: vh, amenityId: amenityIds[5], unitId: unitByNumber.get("C-302")!.id, userId: userIds.get("rahul")!, date: dateISO(6), startTime: "12:00", endTime: "11:00", guests: 2, amount: P(1500), status: "confirmed", paymentStatus: "paid", createdAt: day(-4) },
    { id: id(), societyId: vh, amenityId: amenityIds[4], unitId: unitByNumber.get("A-402")!.id, userId: userIds.get("resident")!, date: dateISO(-3), startTime: "19:00", endTime: "20:00", guests: 2, amount: P(100), status: "completed", paymentStatus: "paid", createdAt: day(-5) },
  ]);

  // ── Notices ────────────────────────────────────────────────────────────────
  await db.insert(notices).values([
    { id: id(), societyId: vh, authorId: userIds.get("admin"), title: "Water tank cleaning on 8 November", body: "Dear residents,\n\nAs part of our quarterly water safety protocol, all overhead and underground tanks will be cleaned on Saturday, 8 November between 9 AM and 4 PM. Water supply will be intermittent during this window. Please store enough water for the day.\n\nOur housekeeping partner will share the cleaning certificate in the documents section once complete.\n\n— Priya Nair, Community Manager", category: "maintenance", pinned: true, audience: "all", publishedAt: day(-1, 9, 30), views: 142 },
    { id: id(), societyId: vh, authorId: userIds.get("neha"), title: "Diwali Mela — Saturday, 8 November", body: "Join us on the central lawn for our annual Diwali Mela!\n\n• 5:30 PM — Rangoli competition\n• 6:30 PM — Kids' diya painting\n• 7:30 PM — Community dinner\n• 8:30 PM — Music and lights\n\nPlease RSVP so we can plan food. Volunteers for the décor committee are welcome — reply to this notice or message Neha.", category: "event", pinned: true, audience: "all", publishedAt: day(-3, 18, 10), views: 318 },
    { id: id(), societyId: vh, authorId: userIds.get("admin"), title: "Annual General Meeting — 22 November", body: "The Annual General Meeting of the Verdant Heights Residents' Welfare Association will be held on Sunday, 22 November at 10 AM in the Clubhouse Party Hall.\n\nAgenda:\n1. Approval of audited accounts FY 2025-26\n2. Budget and maintenance revision for FY 2026-27\n3. Lift modernisation update\n4. EV charging infrastructure\n5. Any other business\n\nMembers are requested to attend in person. A live poll for members unable to attend will open after the meeting.", category: "general", pinned: false, audience: "owners", publishedAt: day(-6, 11, 0), views: 205 },
    { id: id(), societyId: vh, authorId: userIds.get("security"), title: "New gate entry SOP from 5 November", body: "To reduce waiting time at the main gate, delivery partners will now use the quick-pass lane on the left. Residents will continue to receive an approval request.\n\nPlease ensure your frequent visitors are pre-approved in the app. Guards have been instructed to verify the 6-digit passcode for all pre-approved visitors.\n\n— Imran Shaikh, Security Manager", category: "security", pinned: false, audience: "all", publishedAt: day(-2, 8, 20), views: 96 },
    { id: id(), societyId: vh, authorId: userIds.get("accountant"), title: "Maintenance invoices for November are live", body: "The November maintenance invoices have been published. The due date is 15 November. You can pay directly from the Payments section using UPI, card or net banking.\n\nIf you have already paid by NEFT or cheque, please record the details under 'I have paid' so our accounts team can reconcile it.\n\n— Sanjay Rao, Society Accountant", category: "finance", pinned: false, audience: "all", publishedAt: day(0, 8, 5), views: 54 },
  ]);

  // ── Discussions ────────────────────────────────────────────────────────────
  const disc1 = id(), disc2 = id(), disc3 = id(), disc4 = id();
  await db.insert(discussions).values([
    { id: disc1, societyId: vh, authorId: userIds.get("kabir")!, title: "Can we get a second EV charging point in B2 parking?", body: "Three of us in B2 are now driving electric, and the single charger is becoming a bottleneck in the evenings. Would the committee consider adding a second 7.4 kW point? Happy to help with vendor quotes.", category: "suggestion", status: "published", likes: 18, createdAt: day(-2, 19, 10) },
    { id: disc2, societyId: vh, authorId: userIds.get("ananya")!, title: "Found: bunch of keys near the children's play area", body: "Found a set of keys with a blue dolphin keychain near the swings this morning. I've handed them to the security desk at Gate 1. Please claim with a description.", category: "lost_found", status: "published", likes: 9, createdAt: day(-1, 10, 30) },
    { id: disc3, societyId: vh, authorId: userIds.get("meera")!, title: "Weekend badminton group — looking for 2 more players", body: "We play every Sunday at 7 AM on the indoor court. Intermediate level, more about fun than winning. Message me if you'd like to join us this weekend.", category: "general", status: "published", likes: 12, createdAt: day(-4, 17, 45) },
    { id: disc4, societyId: vh, authorId: userIds.get("riya")!, title: "Looking for a reliable cook for weekday dinners", body: "Does anyone have a recommendation for a cook who can prepare simple North Indian dinners for two? We're in C-101 and flexible on timing.", category: "question", status: "pending", likes: 0, createdAt: day(0, 9, 15) },
  ]);
  await db.insert(discussionComments).values([
    { id: id(), discussionId: disc1, authorId: userIds.get("resident")!, body: "Count me in. I'd also be happy to co-sign a proposal for the AGM.", createdAt: day(-2, 20, 5) },
    { id: id(), discussionId: disc1, authorId: userIds.get("neha")!, body: "Noted, Kabir. Adding this to the AGM agenda. Could you share the quotes you've received?", createdAt: day(-1, 9, 20) },
    { id: id(), discussionId: disc2, authorId: userIds.get("sneha")!, body: "I think those might be mine! Blue dolphin, three keys? I'll stop by the gate this evening.", createdAt: day(-1, 12, 0) },
    { id: id(), discussionId: disc3, authorId: userIds.get("rahul")!, body: "I'm in. Haven't played in years but would love to start again.", createdAt: day(-3, 8, 15) },
  ]);

  // ── Polls ──────────────────────────────────────────────────────────────────
  const poll1 = id(), poll2 = id(), poll3 = id();
  const poll1Options = [
    { id: "ev-yes", label: "Yes, install a second charger" },
    { id: "ev-shared", label: "Explore a shared charging arrangement" },
    { id: "ev-no", label: "Not needed right now" },
  ];
  const poll2Options = [
    { id: "pet-yes", label: "Yes, a dedicated pet park" },
    { id: "pet-small", label: "A small fenced area is enough" },
    { id: "pet-no", label: "Keep the current rules" },
  ];
  await db.insert(polls).values([
    { id: poll1, societyId: vh, authorId: userIds.get("neha"), question: "Should we add a second EV charging point in B2 parking?", description: "The committee is evaluating a second 7.4 kW charger. Installation cost is approximately ₹1.2 lakh, to be funded from the capital reserve.", options: poll1Options, audience: "owners", secret: false, hideResults: false, status: "active", endsAt: day(5, 18, 0), createdAt: day(-2, 18, 0) },
    { id: poll2, societyId: vh, authorId: userIds.get("admin"), question: "How would you like to shape the pet zone by the east lawn?", description: "Following last month's survey, the committee is exploring a designated pet zone. Your preference will guide the design.", options: poll2Options, audience: "all", secret: false, hideResults: false, status: "active", endsAt: day(8, 18, 0), createdAt: day(-1, 11, 0) },
    { id: poll3, societyId: vh, authorId: userIds.get("admin"), question: "Should the main gate close at 11 PM on weekdays?", options: [{ id: "gate-11", label: "Yes, close at 11 PM" }, { id: "gate-midnight", label: "Keep it open till midnight" }, { id: "gate-24", label: "Stay open 24×7" }], audience: "all", secret: true, hideResults: false, status: "closed", endsAt: day(-10), createdAt: day(-20) },
  ]);
  const evVoters = ["kabir", "resident", "rahul", "sneha", "dev", "arjun"];
  const pollVoteRows: (typeof pollVotes.$inferInsert)[] = evVoters.map((slug, i) => ({
    id: id(), pollId: poll1, optionId: i < 4 ? "ev-yes" : i === 4 ? "ev-shared" : "ev-no",
    userId: userIds.get(slug)!, unitId: unitByNumber.get(residentSeeds.find((r) => r.slug === slug)!.unit)!.id, createdAt: day(-1, 10 + i),
  }));
  ["neha", "resident", "ananya", "meera"].forEach((slug, i) => pollVoteRows.push({
    id: id(), pollId: poll2, optionId: i < 2 ? "pet-yes" : "pet-small", userId: userIds.get(slug)!,
    unitId: unitByNumber.get(residentSeeds.find((r) => r.slug === slug)!.unit)!.id, createdAt: day(0, 9 + i),
  }));
  await db.insert(pollVotes).values(pollVoteRows);

  // ── Events ─────────────────────────────────────────────────────────────────
  const ev1 = id(), ev2 = id(), ev3 = id();
  await db.insert(events).values([
    { id: ev1, societyId: vh, authorId: userIds.get("neha"), title: "Diwali Mela & Community Dinner", description: "An evening of rangoli, diyas, food and music on the central lawn. Bring the whole family.", startAt: day(4, 17, 30), endAt: day(4, 22, 0), location: "Central Lawn", capacity: 300, coverColor: "#fde8ef", createdAt: day(-3) },
    { id: ev2, societyId: vh, authorId: userIds.get("admin"), title: "Annual General Meeting", description: "Review the year's finances, approve the budget and vote on key community initiatives.", startAt: day(18, 10, 0), endAt: day(18, 13, 0), location: "Clubhouse Party Hall", capacity: 180, coverColor: "#e6ecff", createdAt: day(-6) },
    { id: ev3, societyId: vh, authorId: userIds.get("ananya"), title: "Blood Donation Camp", description: "In partnership with Rotary Bengaluru. Donors get a health check and refreshments.", startAt: day(12, 9, 0), endAt: day(12, 14, 0), location: "Clubhouse Lobby", capacity: 100, coverColor: "#e8f5ef", createdAt: day(-1) },
  ]);
  await db.insert(eventRsvps).values([
    { id: id(), eventId: ev1, userId: userIds.get("resident")!, guests: 3, createdAt: day(-2) },
    { id: id(), eventId: ev1, userId: userIds.get("neha")!, guests: 1, createdAt: day(-3) },
    { id: id(), eventId: ev1, userId: userIds.get("kabir")!, guests: 2, createdAt: day(-1) },
    { id: id(), eventId: ev2, userId: userIds.get("neha")!, guests: 0, createdAt: day(-5) },
    { id: id(), eventId: ev3, userId: userIds.get("ananya")!, guests: 0, createdAt: day(0) },
  ]);

  // ── Classifieds ────────────────────────────────────────────────────────────
  await db.insert(classifieds).values([
    { id: id(), societyId: vh, sellerId: userIds.get("resident")!, title: "IKEA coffee table — oak veneer", description: "Two years old, in great condition. Moving out sale. 110 × 60 cm. Pickup from A-402.", category: "furniture", price: P(4500), condition: "good", status: "active", createdAt: day(-2, 12, 0) },
    { id: id(), societyId: vh, sellerId: userIds.get("kabir")!, title: "Btwin Rockrider 340 cycle", description: "21-speed mountain bike, recently serviced. Helmet included.", category: "vehicles", price: P(8500), condition: "like_new", status: "active", createdAt: day(-1, 17, 30) },
    { id: id(), societyId: vh, sellerId: userIds.get("neha")!, title: "6-seater dining table with chairs", description: "Solid sheesham wood, minor wear on one chair. Selling because we're upgrading.", category: "furniture", price: P(18000), condition: "good", status: "active", createdAt: day(-4, 10, 0) },
    { id: id(), societyId: vh, sellerId: userIds.get("sneha")!, title: "iPhone 13, 128 GB, midnight", description: "Battery health 89%, no scratches, original box and charger included.", category: "electronics", price: P(32000), condition: "like_new", status: "active", createdAt: day(-3, 20, 0) },
    { id: id(), societyId: vh, sellerId: userIds.get("meera")!, title: "Kids' cycle and helmet set", description: "Suitable for ages 5–7. Bright red, training wheels can be removed.", category: "kids", price: P(2200), condition: "good", status: "active", createdAt: day(-5, 9, 0) },
    { id: id(), societyId: vh, sellerId: userIds.get("arjun")!, title: "Home chef — weekend meal prep", description: "Fresh, home-cooked North Indian meals. Vegetarian only. Trial thali available.", category: "services", price: P(350), condition: "new", status: "active", createdAt: day(-1, 8, 0) },
  ]);

  // ── Documents ──────────────────────────────────────────────────────────────
  await db.insert(documents).values([
    { id: id(), societyId: vh, title: "Verdant Heights Bye-laws (amended 2024)", category: "bylaws", visibility: "all", fileUrl: "/documents/bye-laws.pdf", fileSize: 842000, uploadedBy: userIds.get("admin"), createdAt: day(-200) },
    { id: id(), societyId: vh, title: "AGM Minutes — November 2025", category: "minutes", visibility: "all", fileUrl: "/documents/agm-minutes-2025.pdf", fileSize: 312000, uploadedBy: userIds.get("neha"), createdAt: day(-340) },
    { id: id(), societyId: vh, title: "Audited Financial Statements FY 2025-26", category: "financials", visibility: "owners", fileUrl: "/documents/financials-fy26.pdf", fileSize: 1240000, uploadedBy: userIds.get("accountant"), createdAt: day(-70) },
    { id: id(), societyId: vh, title: "Move-in / Move-out form", category: "forms", visibility: "all", fileUrl: "/documents/move-form.pdf", fileSize: 180000, uploadedBy: userIds.get("admin"), createdAt: day(-90) },
    { id: id(), societyId: vh, title: "Water tank cleaning certificate — August 2026", category: "circulars", visibility: "all", fileUrl: "/documents/water-certificate-aug.pdf", fileSize: 220000, uploadedBy: userIds.get("admin"), createdAt: day(-70) },
    { id: id(), societyId: vh, title: "Clubhouse booking policy", category: "maintenance", visibility: "all", fileUrl: "/documents/clubhouse-policy.pdf", fileSize: 140000, uploadedBy: userIds.get("neha"), createdAt: day(-120) },
  ]);

  // ── Visitors ───────────────────────────────────────────────────────────────
  const visitorRows: (typeof visitors.$inferInsert)[] = [
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, hostUserId: userIds.get("resident"), guardId: userIds.get("guard"), name: "Yash Sharma", phone: "+91 98765 44332", type: "delivery", purpose: "Food delivery", company: "Swiggy", photoColor: "#fde8ef", status: "pending", code: "734512", createdAt: day(0, 9, 38), notes: "2 bags — order #SW-884211" },
    { id: id(), societyId: vh, unitId: unitByNumber.get("B-203")!.id, hostUserId: userIds.get("neha"), guardId: userIds.get("guard"), name: "Vikram Sethi", phone: "+91 99887 66554", type: "guest", purpose: "Family visit", photoColor: "#e6ecff", status: "pending", code: "201984", createdAt: day(0, 9, 30), notes: "Here for lunch" },
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-101")!.id, hostUserId: userIds.get("riya"), guardId: userIds.get("guard"), name: "Suresh Babu", phone: "+91 98450 77889", type: "cab", purpose: "Cab pickup", company: "Uber", vehicleNo: "KA 01 AB 5521", photoColor: "#f3ede4", status: "pending", code: "445190", createdAt: day(0, 9, 45) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("B-104")!.id, hostUserId: userIds.get("ananya"), name: "Lata Iyer", phone: "+91 99001 33445", type: "guest", purpose: "Parents visiting for the week", photoColor: "#e8f5ef", status: "approved", code: "813402", preApproved: true, validFrom: day(1, 8, 0), validTo: day(7, 22, 0), approvedAt: day(-1, 18, 0), createdAt: day(-1, 18, 0), notes: "Recurring pass for 6 days" },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, hostUserId: userIds.get("resident"), name: "Anil Kumar", phone: "+91 98860 55221", type: "vendor", purpose: "AC servicing", company: "CoolCare", photoColor: "#eaf1fb", status: "approved", code: "660149", preApproved: true, validFrom: day(0, 14, 0), validTo: day(0, 18, 0), approvedAt: day(-1, 12, 0), createdAt: day(-1, 12, 0) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, hostUserId: userIds.get("resident"), guardId: userIds.get("guard"), name: "Sunita Devi", phone: "+91 98860 44556", type: "domestic_help", purpose: "Daily house help", photoColor: "#fde8ef", status: "entered", code: "112903", approvedAt: day(0, 8, 8), enteredAt: day(0, 8, 12), createdAt: day(0, 8, 8) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, hostUserId: userIds.get("resident"), guardId: userIds.get("guard"), name: "Amazon Delivery", phone: "+91 90080 11223", type: "delivery", purpose: "Parcel drop", company: "Amazon", photoColor: "#f3ede4", status: "exited", code: "992310", approvedAt: day(-1, 16, 12), enteredAt: day(-1, 16, 14), exitedAt: day(-1, 16, 28), createdAt: day(-1, 16, 10), notes: "Left with guard — resident asked for leave at gate" },
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-302")!.id, hostUserId: userIds.get("rahul"), guardId: userIds.get("guard"), name: "Anita D'Souza", phone: "+91 99000 44556", type: "guest", purpose: "Dinner", photoColor: "#e8f5ef", status: "exited", code: "330176", approvedAt: day(-2, 19, 2), enteredAt: day(-2, 19, 4), exitedAt: day(-2, 22, 41), createdAt: day(-2, 19, 0) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-503")!.id, hostUserId: userIds.get("meera"), guardId: userIds.get("guard"), name: "Pest Control Team", phone: "+91 98450 22334", type: "vendor", purpose: "Pest control — kitchen", company: "PestGuard", photoColor: "#eaf1fb", status: "denied", code: "559812", createdAt: day(-1, 11, 5), notes: "Resident asked to reschedule" },
  ];
  await db.insert(visitors).values(visitorRows);

  await db.insert(deliveries).values([
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, hostUserId: userIds.get("resident"), guardId: userIds.get("guard"), company: "Swiggy", courierName: "Yash Sharma", trackingNo: "SW-884211", status: "arrived", otp: "734512", createdAt: day(0, 9, 38) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, hostUserId: userIds.get("resident"), guardId: userIds.get("guard"), company: "Amazon", courierName: "Rakesh", trackingNo: "AMZ-99231", status: "left_at_gate", otp: "338211", notes: "Resident requested leave at gate", createdAt: day(-1, 16, 10), deliveredAt: day(-1, 16, 28) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("B-203")!.id, hostUserId: userIds.get("neha"), guardId: userIds.get("guard"), company: "Flipkart", courierName: "Manoj", trackingNo: "FK-552019", status: "delivered", otp: "810442", createdAt: day(-1, 13, 18), deliveredAt: day(-1, 13, 40) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-302")!.id, hostUserId: userIds.get("rahul"), guardId: userIds.get("guard"), company: "BigBasket", courierName: "Suresh", trackingNo: "BB-110923", status: "arrived", otp: "109238", createdAt: day(0, 8, 55) },
  ]);

  // ── Helpdesk ───────────────────────────────────────────────────────────────
  const ticketRows: (typeof helpdeskTickets.$inferInsert)[] = [
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, raisedBy: userIds.get("resident")!, category: "Plumbing", scope: "personal", subject: "Kitchen tap is leaking continuously", description: "The mixer tap in the kitchen has been dripping for two days. The base also seems loose. Would appreciate a plumber visit today if possible.", priority: "high", status: "in_progress", assigneeId: assigneeRavi, slaDueAt: day(0, 18, 0), createdAt: day(-1, 8, 30), updatedAt: day(0, 9, 0) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("B-203")!.id, raisedBy: userIds.get("neha")!, category: "Lifts", scope: "community", subject: "Lift in B tower making a rattling noise", description: "The lift has started making a rattling sound when passing the 4th floor. It happens on both upward and downward journeys. Please inspect before it becomes a safety issue.", priority: "high", status: "assigned", assigneeId: assigneeSuresh, slaDueAt: day(1, 12, 0), createdAt: day(-1, 10, 15), updatedAt: day(-1, 11, 0) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-302")!.id, raisedBy: userIds.get("rahul")!, category: "Parking", scope: "community", subject: "Visitor car parked in my allotted slot", description: "A white Innova (KA 03 MJ 8842) has been parked in B3-009 since last night. It is not a registered resident vehicle.", priority: "medium", status: "open", slaDueAt: day(1, 11, 0), createdAt: day(-1, 11, 20), updatedAt: day(-1, 11, 20) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-503")!.id, raisedBy: userIds.get("meera")!, category: "Plumbing", scope: "personal", subject: "Water seepage on the bathroom ceiling", description: "There is a damp patch spreading on the bathroom ceiling, likely from the flat above. Could someone inspect the source?", priority: "urgent", status: "assigned", assigneeId: userIds.get("helpdesk"), slaDueAt: day(0, 14, 0), createdAt: day(-1, 7, 10), updatedAt: day(-1, 8, 0) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, raisedBy: userIds.get("resident")!, category: "Common areas", scope: "community", subject: "Gym air conditioning is not cooling", description: "The AC in the gym was running but blowing warm air. It was quite uncomfortable this morning.", priority: "medium", status: "resolved", assigneeId: assigneeSuresh, slaDueAt: day(-2, 18, 0), resolvedAt: day(-2, 16, 30), rating: 5, feedback: "Fixed quickly. Thank you!", createdAt: day(-4, 7, 30), updatedAt: day(-2, 16, 30) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-201")!.id, raisedBy: userIds.get("kabir")!, category: "Electrical", scope: "community", subject: "Garden pathway lights not working", description: "The four lights along the east garden path have been off for three nights. It gets very dark there after 7 PM.", priority: "medium", status: "open", slaDueAt: day(1, 10, 0), createdAt: day(0, 7, 45), updatedAt: day(0, 7, 45) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("B-104")!.id, raisedBy: userIds.get("ananya")!, category: "Housekeeping", scope: "community", subject: "Swimming pool changing room needs cleaning", description: "The changing room was not cleaned this morning. Towels and tissues were left on the bench.", priority: "low", status: "resolved", assigneeId: userIds.get("helpdesk"), slaDueAt: day(-1, 12, 0), resolvedAt: day(-1, 10, 0), rating: 4, createdAt: day(-1, 8, 0), updatedAt: day(-1, 10, 0) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-402")!.id, raisedBy: userIds.get("resident")!, category: "Intercom", scope: "personal", subject: "e-Intercom call not reaching my phone", description: "I missed two visitor approval calls yesterday. My number is set as primary but the calls didn't ring. Could you check the configuration?", priority: "medium", status: "reopened", assigneeId: userIds.get("helpdesk"), slaDueAt: day(1, 17, 0), reopenedCount: 1, createdAt: day(-6, 9, 0), updatedAt: day(-1, 17, 0) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-302")!.id, raisedBy: userIds.get("rahul")!, category: "Security", scope: "community", subject: "Gate intercom for visitor is too quiet", description: "The intercom near the pedestrian gate is barely audible when a visitor speaks. Could the volume be increased?", priority: "low", status: "closed", assigneeId: userIds.get("security"), slaDueAt: day(-5), resolvedAt: day(-6), rating: 5, createdAt: day(-8, 10, 0), updatedAt: day(-6, 15, 0) },
  ];
  await db.insert(helpdeskTickets).values(ticketRows);
  const ticketIdBySubject = new Map(ticketRows.map((t) => [t.subject, t.id!]));
  await db.insert(ticketComments).values([
    { id: id(), ticketId: ticketIdBySubject.get("Kitchen tap is leaking continuously")!, authorId: userIds.get("helpdesk")!, body: "Hi Aarav, a plumber has been assigned and will reach you between 11 AM and 1 PM today. We'll update you once he checks the mixer.", createdAt: day(-1, 9, 15) },
    { id: id(), ticketId: ticketIdBySubject.get("Kitchen tap is leaking continuously")!, authorId: userIds.get("resident")!, body: "Thank you. I'm home till 2 PM, so anytime in that window works.", createdAt: day(-1, 9, 30) },
    { id: id(), ticketId: ticketIdBySubject.get("Kitchen tap is leaking continuously")!, authorId: assigneeRavi, body: "Reached the flat. The washer needs replacement; carrying the part from the store. Will finish within the hour.", internal: false, createdAt: day(0, 8, 50) },
    { id: id(), ticketId: ticketIdBySubject.get("Lift in B tower making a rattling noise")!, authorId: userIds.get("admin")!, body: "Orbit Elevators has been asked to inspect today. Attaching the service request number to the work order.", createdAt: day(-1, 11, 20) },
    { id: id(), ticketId: ticketIdBySubject.get("Swimming pool changing room needs cleaning")!, authorId: userIds.get("helpdesk")!, body: "Housekeeping has been informed and the changing room has been cleaned. Extra checks have been scheduled for the next week.", createdAt: day(-1, 10, 0) },
    { id: id(), ticketId: ticketIdBySubject.get("e-Intercom call not reaching my phone")!, authorId: userIds.get("helpdesk")!, body: "We checked the configuration and the number is correct. Could you confirm if DND is enabled for unknown callers? Reopening to verify with the vendor.", createdAt: day(-1, 17, 0) },
  ]);

  // ── Patrol ─────────────────────────────────────────────────────────────────
  const checkpointSeeds = [
    { name: "Main Gate", location: "North entrance", code: "GATE-01", sortOrder: 0 },
    { name: "B2 Parking", location: "Basement 2, west ramp", code: "PARK-B2", sortOrder: 1 },
    { name: "Clubhouse Lobby", location: "Clubhouse ground floor", code: "CLUB-01", sortOrder: 2 },
    { name: "East Lawn", location: "Near children's play area", code: "LAWN-01", sortOrder: 3 },
    { name: "Tower C Terrace", location: "Cedar terrace, level 6", code: "TERR-C", sortOrder: 4 },
    { name: "Utility Yard", location: "Behind Tower B", code: "UTIL-01", sortOrder: 5 },
  ];
  const checkpointIds: string[] = [];
  await db.insert(patrolCheckpoints).values(checkpointSeeds.map((c) => { const cid = id(); checkpointIds.push(cid); return { id: cid, societyId: vh, ...c }; }));
  await db.insert(patrolRounds).values([
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[0], status: "scanned", scannedAt: day(0, 6, 5) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[1], status: "scanned", scannedAt: day(0, 6, 22) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[2], status: "scanned", scannedAt: day(0, 6, 48) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[3], status: "scanned", scannedAt: day(0, 7, 10) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[4], status: "missed", scannedAt: day(0, 7, 30), notes: "Terrace door locked — will retry after 8 AM" },
    { id: id(), societyId: vh, guardId: userIds.get("security")!, checkpointId: checkpointIds[5], status: "scanned", scannedAt: day(0, 7, 55) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[0], status: "scanned", scannedAt: day(-1, 22, 5) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[1], status: "scanned", scannedAt: day(-1, 22, 20) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[2], status: "scanned", scannedAt: day(-1, 22, 42) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[3], status: "scanned", scannedAt: day(-1, 23, 0) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[4], status: "scanned", scannedAt: day(-1, 23, 18) },
    { id: id(), societyId: vh, guardId: userIds.get("guard")!, checkpointId: checkpointIds[5], status: "scanned", scannedAt: day(-1, 23, 35) },
  ]);

  // ── Panic & moves ──────────────────────────────────────────────────────────
  await db.insert(panicAlerts).values([
    { id: id(), societyId: vh, userId: userIds.get("meera")!, unitId: unitByNumber.get("A-503")!.id, message: "Medical emergency — need help immediately", status: "resolved", createdAt: day(-12, 2, 10), resolvedAt: day(-12, 2, 28), resolvedBy: userIds.get("admin") },
  ]);
  await db.insert(moveRequests).values([
    { id: id(), societyId: vh, unitId: unitByNumber.get("C-101")!.id, userId: userIds.get("riya")!, type: "move_out", date: dateISO(27), status: "pending", notes: "Tenancy ending 30 November. Moving to Whitefield. Need gate pass for movers on 1 December.", createdAt: day(-1, 14, 0) },
    { id: id(), societyId: vh, unitId: unitByNumber.get("A-304")!.id, userId: userIds.get("dev")!, type: "move_in", date: dateISO(-20), status: "approved", notes: "Moving in with family.", decidedBy: userIds.get("admin"), createdAt: day(-25) },
  ]);

  // ── Notifications ──────────────────────────────────────────────────────────
  const notifRows: (typeof notifications.$inferInsert)[] = [
    { id: id(), userId: userIds.get("resident")!, societyId: vh, title: "Delivery waiting at the gate", body: "Yash from Swiggy is at Gate 1 with your order. Approve or ask the guard to leave it at the gate.", type: "visitor", link: "/app/visitors", createdAt: day(0, 9, 38) },
    { id: id(), userId: userIds.get("resident")!, societyId: vh, title: "Visitor awaiting approval", body: "Anil Kumar (CoolCare) is approved for 2–6 PM today for AC servicing.", type: "visitor", link: "/app/visitors", createdAt: day(-1, 12, 0) },
    { id: id(), userId: userIds.get("resident")!, societyId: vh, title: "November maintenance invoice is due", body: "Your invoice of ₹5,935 is due on 15 November. Pay from the app in a few taps.", type: "payment", link: "/app/payments", createdAt: day(0, 8, 5) },
    { id: id(), userId: userIds.get("resident")!, societyId: vh, title: "Helpdesk update on your complaint", body: "Ravi Kumar: The washer needs replacement; will finish within the hour.", type: "helpdesk", link: "/app/helpdesk", createdAt: day(0, 8, 50) },
    { id: id(), userId: userIds.get("resident")!, societyId: vh, title: "Water tank cleaning on 8 November", body: "Water supply will be intermittent between 9 AM and 4 PM. Please store water.", type: "notice", link: "/app/community", readAt: day(-1, 10, 0), createdAt: day(-1, 9, 30) },
    { id: id(), userId: userIds.get("resident")!, societyId: vh, title: "Your guest pass is ready", body: "Lata Iyer's pass is valid from tomorrow, 8 AM, for 6 days.", type: "visitor", link: "/app/visitors", readAt: day(-1, 18, 5), createdAt: day(-1, 18, 0) },
    { id: id(), userId: userIds.get("admin")!, societyId: vh, title: "3 visitors awaiting approval", body: "Deliveries and guests are waiting at Gate 1. Resident approvals are pending.", type: "security", link: "/admin/security", createdAt: day(0, 9, 45) },
    { id: id(), userId: userIds.get("admin")!, societyId: vh, title: "Offline payment intimation", body: "Aarav Mehta submitted an NEFT reference for the July invoice. Verify it in billing.", type: "payment", link: "/admin/billing", createdAt: day(-2, 16, 20) },
    { id: id(), userId: userIds.get("admin")!, societyId: vh, title: "New discussion needs moderation", body: "Riya Sen posted 'Looking for a reliable cook for weekday dinners'.", type: "community", link: "/admin/communications", createdAt: day(0, 9, 15) },
    { id: id(), userId: userIds.get("admin")!, societyId: vh, title: "Helpdesk SLA at risk", body: "2 tickets are approaching their SLA. Review the queue.", type: "helpdesk", link: "/admin/helpdesk", createdAt: day(0, 8, 0) },
    { id: id(), userId: userIds.get("guard")!, societyId: vh, title: "Shift handover", body: "Morning shift starts at 6 AM. Patrol checkpoint 5 was missed yesterday.", type: "security", link: "/gate", createdAt: day(0, 5, 45) },
    { id: id(), userId: userIds.get("guard")!, societyId: vh, title: "Pre-approved visitor today", body: "Anil Kumar (CoolCare) is expected between 2 PM and 6 PM. Passcode 660149.", type: "visitor", link: "/gate", readAt: day(0, 7, 0), createdAt: day(-1, 12, 0) },
  ];
  await db.insert(notifications).values(notifRows);

  // ── Audit log ──────────────────────────────────────────────────────────────
  await db.insert(auditLogs).values([
    { id: id(), societyId: vh, actorId: userIds.get("admin")!, actorName: "Priya Nair", action: "invoice.run.created", entity: "invoice", entityId: null, metadata: { count: 72, month: "November 2026" }, createdAt: day(-1, 18, 30) },
    { id: id(), societyId: vh, actorId: userIds.get("guard")!, actorName: "Ramesh Yadav", action: "visitor.approved", entity: "visitor", entityId: null, metadata: { name: "Anil Kumar", gate: "Gate 1" }, createdAt: day(-1, 12, 2) },
    { id: id(), societyId: vh, actorId: userIds.get("resident")!, actorName: "Aarav Mehta", action: "visitor.pass.created", entity: "visitor", entityId: null, metadata: { visitor: "Lata Iyer" }, createdAt: day(-1, 18, 0) },
    { id: id(), societyId: vh, actorId: userIds.get("admin")!, actorName: "Priya Nair", action: "helpdesk.assigned", entity: "ticket", entityId: null, metadata: { assignee: "Ravi Kumar" }, createdAt: day(-1, 9, 15) },
    { id: id(), societyId: vh, actorId: userIds.get("accountant")!, actorName: "Sanjay Rao", action: "payment.verified", entity: "payment", entityId: null, metadata: { receipt: "VH-RCPT-00021", amount: 7825 }, createdAt: day(-2, 17, 0) },
    { id: id(), societyId: vh, actorId: userIds.get("admin")!, actorName: "Priya Nair", action: "notice.published", entity: "notice", entityId: null, metadata: { title: "Water tank cleaning on 8 November" }, createdAt: day(-1, 9, 30) },
    { id: id(), societyId: vh, actorId: userIds.get("neha")!, actorName: "Neha Kulkarni", action: "poll.created", entity: "poll", entityId: null, metadata: { question: "Second EV charger" }, createdAt: day(-2, 18, 0) },
    { id: id(), societyId: vh, actorId: userIds.get("admin")!, actorName: "Priya Nair", action: "resident.move_in.approved", entity: "move_request", entityId: null, metadata: { unit: "A-304" }, createdAt: day(-20, 11, 0) },
    { id: id(), societyId: vh, actorId: userIds.get("security")!, actorName: "Imran Shaikh", action: "security.sop.updated", entity: "society", entityId: vh, metadata: { effective: "2026-11-05" }, createdAt: day(-2, 8, 20) },
    { id: id(), societyId: vh, actorId: userIds.get("admin")!, actorName: "Priya Nair", action: "amenity.booking.cancelled", entity: "booking", entityId: null, metadata: { amenity: "Tennis Court", reason: "Rain" }, createdAt: day(-4, 16, 0) },
  ]);

  // ── Lakeview basic data ────────────────────────────────────────────────────
  await db.insert(notices).values({
    id: id(), societyId: lv, authorId: lvAdminId, title: "Lakeside walkway maintenance", body: "The lakeside walkway will be closed for repaving from 10–12 November. Please use the east gate for morning walks.", category: "maintenance", pinned: true, audience: "all", publishedAt: day(-1, 8, 0), views: 42,
  });
  await db.insert(helpdeskTickets).values([
    { id: id(), societyId: lv, unitId: lvUnits[0].id, raisedBy: lvResidentId, category: "Plumbing", scope: "personal", subject: "Low water pressure in the kitchen", description: "Kitchen tap has low pressure since yesterday.", priority: "medium", status: "open", createdAt: day(-1, 9, 0), updatedAt: day(-1, 9, 0) },
    { id: id(), societyId: lv, unitId: lvUnits[2].id, raisedBy: lvAdminId, category: "Common areas", scope: "community", subject: "Lobby lights flickering", description: "Two lobby lights are flickering near the mail room.", priority: "low", status: "assigned", createdAt: day(-2, 10, 0), updatedAt: day(-1, 9, 0) },
  ]);

  console.log(`Seeded ${invoiceRows.length} invoices, ${paymentRows.length + (julInvoice ? 1 : 0)} payments, ${vhUnits.length + lvUnits.length} units.`);
  console.log("Demo logins (password: demo1234): resident@nivaasa.app, admin@nivaasa.app, guard@nivaasa.app, accountant@nivaasa.app, owner@nivaasa.app");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
