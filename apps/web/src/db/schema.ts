import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * MyCommunity schema
 * Amounts are stored in paise (1/100 INR) unless the column name says otherwise.
 * Timestamps are stored as unix milliseconds.
 */

export const societies = sqliteTable("societies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  logoMark: text("logo_mark").default("#3155d8"),
  primaryColor: text("primary_color").default("#3155d8"),
  accentColor: text("accent_color").default("#ef7fa4"),
  unitsCount: integer("units_count").default(0).notNull(),
  establishedYear: integer("established_year"),
  registrationNo: text("registration_no"),
  gstin: text("gstin"),
  pan: text("pan"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  ifsc: text("ifsc"),
  settings: text("settings", { mode: "json" }).$type<SocietySettings>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type SocietySettings = {
  visitorApproval: boolean;
  visitorPassTtlHours: number;
  discussionApproval: boolean;
  allowResidentClassifieds: boolean;
  lateFeePercent: number;
  graceDays: number;
  paymentGateway: "demo" | "razorpay" | "stripe";
  helpdeskSlaHours: number;
};

export const towers = sqliteTable("towers", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  floors: integer("floors").notNull(),
  unitsCount: integer("units_count").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const units = sqliteTable(
  "units",
  {
    id: text("id").primaryKey(),
    societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
    towerId: text("tower_id").notNull().references(() => towers.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    floor: integer("floor").notNull(),
    areaSqft: integer("area_sqft").notNull(),
    unitType: text("unit_type", { enum: ["1BHK", "2BHK", "3BHK", "4BHK", "penthouse", "villa"] }).notNull(),
    status: text("status", { enum: ["occupied", "vacant", "under_renovation"] }).default("occupied").notNull(),
    ownership: text("ownership", { enum: ["owner_occupied", "tenanted", "vacant"] }).default("owner_occupied").notNull(),
    parkingSlots: integer("parking_slots").default(1).notNull(),
    intercomPrimary: text("intercom_primary"),
    intercomSecondary: text("intercom_secondary"),
    emergencyContact: text("emergency_contact"),
    emergencyName: text("emergency_name"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("units_society_number_idx").on(t.societyId, t.number), index("units_tower_idx").on(t.towerId)],
);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarColor: text("avatar_color").default("#3155d8"),
  avatarUrl: text("avatar_url"),
  globalRole: text("global_role", { enum: ["user", "super_admin"] }).default("user").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
});

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
    unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
    role: text("role", {
      enum: ["owner", "tenant", "family", "admin", "committee", "manager", "accountant", "helpdesk_manager", "security_manager", "guard", "auditor", "super_admin"],
    }).notNull(),
    designation: text("designation"),
    status: text("status", { enum: ["active", "pending", "inactive"] }).default("active").notNull(),
    canApproveVisitors: integer("can_approve_visitors", { mode: "boolean" }).default(true).notNull(),
    directoryVisible: integer("directory_visible", { mode: "boolean" }).default(true).notNull(),
    notificationPrefs: text("notification_prefs", { mode: "json" }).$type<{ visitors: boolean; payments: boolean; community: boolean; helpdesk: boolean }>(),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(false).notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("memberships_user_society_idx").on(t.userId, t.societyId), index("memberships_society_idx").on(t.societyId)],
);

export const familyMembers = sqliteTable("family_members", {
  id: text("id").primaryKey(),
  membershipId: text("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relation: text("relation").notNull(),
  phone: text("phone"),
  age: integer("age"),
  hasApp: integer("has_app", { mode: "boolean" }).default(false).notNull(),
});

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  unitId: text("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type", { enum: ["car", "bike", "ev", "bicycle"] }).notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  color: text("color"),
  registrationNo: text("registration_no").notNull(),
  parkingSlot: text("parking_slot"),
  stickerIssued: integer("sticker_issued", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const pets = sqliteTable("pets", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  unitId: text("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  ageYears: real("age_years"),
  vaccinationDue: text("vaccination_due"),
  vaccinated: integer("vaccinated", { mode: "boolean" }).default(true).notNull(),
  notes: text("notes"),
});

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["society", "daily_help", "security"] }).notNull(),
  role: text("role").notNull(),
  phone: text("phone").notNull(),
  idType: text("id_type"),
  idLast4: text("id_last4"),
  photoColor: text("photo_color").default("#3155d8"),
  shift: text("shift"),
  rating: real("rating").default(4.5),
  policeVerified: integer("police_verified", { mode: "boolean" }).default(false).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  monthlyRate: integer("monthly_rate"),
  joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
});

export const staffAttendance = sqliteTable("staff_attendance", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  checkInAt: integer("check_in_at", { mode: "timestamp_ms" }),
  checkOutAt: integer("check_out_at", { mode: "timestamp_ms" }),
  method: text("method", { enum: ["guard", "qr", "selfie", "biometric"] }).default("guard").notNull(),
  markedBy: text("marked_by").references(() => users.id, { onDelete: "set null" }),
});

export const dailyHelpReviews = sqliteTable("daily_help_reviews", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  review: text("review"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [uniqueIndex("daily_help_reviewer_idx").on(t.staffId, t.reviewerId)]);

export const vendors = sqliteTable("vendors", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  gstin: text("gstin"),
  contractStart: text("contract_start"),
  contractEnd: text("contract_end"),
  monthlyValue: integer("monthly_value"),
  rating: real("rating").default(4.5),
  status: text("status", { enum: ["active", "expiring", "inactive"] }).default("active").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  location: text("location"),
  quantity: integer("quantity").default(1).notNull(),
  purchaseDate: text("purchase_date"),
  value: integer("value"),
  amcVendorId: text("amc_vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  amcDue: text("amc_due"),
  condition: text("condition", { enum: ["good", "needs_service", "retired"] }).default("good").notNull(),
});

export const billingHeads = sqliteTable("billing_heads", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  basis: text("basis", { enum: ["fixed", "per_sqft", "per_unit", "meter"] }).notNull(),
  defaultAmount: integer("default_amount").notNull(),
  gstRate: real("gst_rate").default(0).notNull(),
  recurring: integer("recurring", { mode: "boolean" }).default(true).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
    unitId: text("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    title: text("title").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date").notNull(),
    subtotal: integer("subtotal").notNull(),
    gstAmount: integer("gst_amount").default(0).notNull(),
    penalty: integer("penalty").default(0).notNull(),
    discount: integer("discount").default(0).notNull(),
    total: integer("total").notNull(),
    amountPaid: integer("amount_paid").default(0).notNull(),
    status: text("status", { enum: ["due", "partially_paid", "paid", "overdue", "cancelled"] }).default("due").notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("invoices_number_idx").on(t.societyId, t.number), index("invoices_unit_idx").on(t.unitId)],
);

export const invoiceItems = sqliteTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  headId: text("head_id").references(() => billingHeads.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity: real("quantity").default(1).notNull(),
  rate: integer("rate").notNull(),
  amount: integer("amount").notNull(),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  unitId: text("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  receiptNo: text("receipt_no").notNull(),
  kind: text("kind", { enum: ["invoice", "advance", "amenity"] }).default("invoice").notNull(),
  amount: integer("amount").notNull(),
  method: text("method", { enum: ["upi", "card", "netbanking", "cash", "cheque", "neft", "advance"] }).notNull(),
  reference: text("reference"),
  status: text("status", { enum: ["success", "pending", "failed", "rejected", "refunded"] }).default("success").notNull(),
  note: text("note"),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }).notNull(),
  verifiedBy: text("verified_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  vendorId: text("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  date: text("date").notNull(),
  status: text("status", { enum: ["pending", "approved", "paid", "rejected"] }).default("paid").notNull(),
  approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
  invoiceRef: text("invoice_ref"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const amenities = sqliteTable("amenities", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").default("sparkles").notNull(),
  location: text("location"),
  capacity: integer("capacity").default(10).notNull(),
  slotMinutes: integer("slot_minutes").default(60).notNull(),
  price: integer("price").default(0).notNull(),
  deposit: integer("deposit").default(0).notNull(),
  openTime: text("open_time").default("06:00").notNull(),
  closeTime: text("close_time").default("22:00").notNull(),
  rules: text("rules"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const amenityBookings = sqliteTable(
  "amenity_bookings",
  {
    id: text("id").primaryKey(),
    societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
    amenityId: text("amenity_id").notNull().references(() => amenities.id, { onDelete: "cascade" }),
    unitId: text("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    guests: integer("guests").default(0).notNull(),
    amount: integer("amount").default(0).notNull(),
    paymentId: text("payment_id").references(() => payments.id, { onDelete: "set null" }),
    status: text("status", { enum: ["confirmed", "cancelled", "completed", "no_show"] }).default("confirmed").notNull(),
    paymentStatus: text("payment_status", { enum: ["not_required", "pending", "paid", "refunded"] }).default("not_required").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("bookings_slot_idx").on(t.amenityId, t.date, t.startTime)],
);

export const notices = sqliteTable("notices", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category", { enum: ["general", "maintenance", "security", "event", "finance", "emergency"] }).default("general").notNull(),
  pinned: integer("pinned", { mode: "boolean" }).default(false).notNull(),
  audience: text("audience", { enum: ["all", "owners", "tenants", "tower"] }).default("all").notNull(),
  towerId: text("tower_id").references(() => towers.id, { onDelete: "set null" }),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  views: integer("views").default(0).notNull(),
});

export const discussions = sqliteTable("discussions", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category", { enum: ["general", "suggestion", "question", "lost_found", "safety"] }).default("general").notNull(),
  status: text("status", { enum: ["published", "pending", "rejected", "hidden"] }).default("published").notNull(),
  pinned: integer("pinned", { mode: "boolean" }).default(false).notNull(),
  likes: integer("likes").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const discussionLikes = sqliteTable("discussion_likes", {
  id: text("id").primaryKey(),
  discussionId: text("discussion_id").notNull().references(() => discussions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [uniqueIndex("discussion_like_user_idx").on(t.discussionId, t.userId)]);

export const discussionComments = sqliteTable("discussion_comments", {
  id: text("id").primaryKey(),
  discussionId: text("discussion_id").notNull().references(() => discussions.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const polls = sqliteTable("polls", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  description: text("description"),
  options: text("options", { mode: "json" }).$type<{ id: string; label: string }[]>().notNull(),
  audience: text("audience", { enum: ["all", "owners", "tenants"] }).default("all").notNull(),
  secret: integer("secret", { mode: "boolean" }).default(false).notNull(),
  hideResults: integer("hide_results", { mode: "boolean" }).default(false).notNull(),
  status: text("status", { enum: ["active", "closed"] }).default("active").notNull(),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const pollVotes = sqliteTable(
  "poll_votes",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    optionId: text("option_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("poll_votes_user_idx").on(t.pollId, t.userId)],
);

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
  endAt: integer("end_at", { mode: "timestamp_ms" }),
  location: text("location").notNull(),
  capacity: integer("capacity"),
  coverColor: text("cover_color").default("#dfe8ff").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const eventRsvps = sqliteTable(
  "event_rsvps",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    guests: integer("guests").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("event_rsvps_user_idx").on(t.eventId, t.userId)],
);

export const classifieds = sqliteTable("classifieds", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  sellerId: text("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category", { enum: ["furniture", "electronics", "vehicles", "kids", "home", "services", "other"] }).notNull(),
  price: integer("price").notNull(),
  condition: text("condition", { enum: ["new", "like_new", "good", "used"] }).default("good").notNull(),
  status: text("status", { enum: ["active", "sold", "removed"] }).default("active").notNull(),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category", { enum: ["bylaws", "minutes", "financials", "forms", "circulars", "maintenance"] }).notNull(),
  visibility: text("visibility", { enum: ["all", "owners", "committee"] }).default("all").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").default(0).notNull(),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const visitors = sqliteTable(
  "visitors",
  {
    id: text("id").primaryKey(),
    societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
    unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
    hostUserId: text("host_user_id").references(() => users.id, { onDelete: "set null" }),
    guardId: text("guard_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    phone: text("phone"),
    type: text("type", { enum: ["guest", "delivery", "cab", "domestic_help", "vendor", "other"] }).notNull(),
    purpose: text("purpose"),
    vehicleNo: text("vehicle_no"),
    company: text("company"),
    photoColor: text("photo_color").default("#dfe8ff"),
    status: text("status", { enum: ["pending", "approved", "denied", "entered", "exited", "expired"] }).default("pending").notNull(),
    code: text("code"),
    leaveAtGate: integer("leave_at_gate", { mode: "boolean" }).default(false).notNull(),
    preApproved: integer("pre_approved", { mode: "boolean" }).default(false).notNull(),
    recurringCab: integer("recurring_cab", { mode: "boolean" }),
    sourcePassId: text("source_pass_id"),
    entryDay: text("entry_day"),
    validFrom: integer("valid_from", { mode: "timestamp_ms" }),
    validTo: integer("valid_to", { mode: "timestamp_ms" }),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
    approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
    enteredAt: integer("entered_at", { mode: "timestamp_ms" }),
    exitedAt: integer("exited_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    notes: text("notes"),
  },
  (t) => [index("visitors_society_idx").on(t.societyId), index("visitors_status_idx").on(t.status), uniqueIndex("visitor_pass_day_idx").on(t.sourcePassId, t.entryDay)],
);

export const deliveries = sqliteTable("deliveries", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
  hostUserId: text("host_user_id").references(() => users.id, { onDelete: "set null" }),
  guardId: text("guard_id").references(() => users.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  courierName: text("courier_name"),
  trackingNo: text("tracking_no"),
  status: text("status", { enum: ["arrived", "left_at_gate", "delivered", "returned"] }).default("arrived").notNull(),
  otp: text("otp"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
});

export const helpdeskTickets = sqliteTable("helpdesk_tickets", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
  raisedBy: text("raised_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  scope: text("scope", { enum: ["personal", "community"] }).default("personal").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  attachments: text("attachments", { mode: "json" }).$type<string[]>().default([]),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium").notNull(),
  status: text("status", { enum: ["open", "assigned", "in_progress", "resolved", "closed", "reopened"] }).default("open").notNull(),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  slaDueAt: integer("sla_due_at", { mode: "timestamp_ms" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  rating: integer("rating"),
  feedback: text("feedback"),
  reopenedCount: integer("reopened_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const ticketComments = sqliteTable("ticket_comments", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => helpdeskTickets.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  internal: integer("internal", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const patrolCheckpoints = sqliteTable("patrol_checkpoints", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location").notNull(),
  code: text("code").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const patrolRounds = sqliteTable("patrol_rounds", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  guardId: text("guard_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checkpointId: text("checkpoint_id").notNull().references(() => patrolCheckpoints.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["scanned", "missed"] }).default("scanned").notNull(),
  scannedAt: integer("scanned_at", { mode: "timestamp_ms" }).notNull(),
  notes: text("notes"),
});

export const panicAlerts = sqliteTable("panic_alerts", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  status: text("status", { enum: ["open", "acknowledged", "resolved"] }).default("open").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
});

export const moveRequests = sqliteTable("move_requests", {
  id: text("id").primaryKey(),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  unitId: text("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["move_in", "move_out"] }).notNull(),
  date: text("date").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "completed"] }).default("pending").notNull(),
  notes: text("notes"),
  decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  societyId: text("society_id").notNull().references(() => societies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type", { enum: ["visitor", "delivery", "payment", "helpdesk", "notice", "amenity", "security", "community", "system"] }).notNull(),
  link: text("link"),
  readAt: integer("read_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  societyId: text("society_id").references(() => societies.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type Society = typeof societies.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Visitor = typeof visitors.$inferSelect;
export type HelpdeskTicket = typeof helpdeskTickets.$inferSelect;
export type Amenity = typeof amenities.$inferSelect;
export type AmenityBooking = typeof amenityBookings.$inferSelect;
export type Notice = typeof notices.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Classified = typeof classifieds.$inferSelect;
