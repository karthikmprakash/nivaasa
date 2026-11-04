import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { avatarForeground, cn, formatDate, formatTime } from "./utils";
import { adminNavigation, isNavigationActive, navigationTitle, residentNavigation } from "../components/shell/navigation";
import { Field, Input } from "../components/ui/field";
import { validatePassRequest } from "./visitor-pass-rules";
import { isSafeInternalPath, resolveSwitchPath, societyHomePath, stableSwitchPath } from "./society-access";
import { canViewNoticeAudience, canVoteInPollAudience, pollIsOpen } from "./community-access";
import { communityDayEnd, communityDayStart, communityMonthKey, parseCommunityDateTime } from "./datetime";

test("semantic font sizes preserve button foreground colors", () => {
  assert.match(cn("bg-brand-600 text-white", "text-body"), /text-white/);
  assert.match(cn("text-caption text-muted", "text-ink"), /text-caption/);
  assert.doesNotMatch(cn("text-caption", "text-body"), /text-caption/);
});
test("nested resident routes activate only their module", () => {
  assert.equal(isNavigationActive("/app/helpdesk/123", "/app/helpdesk", "/app"), true);
  assert.equal(isNavigationActive("/app/helpdesk/123", "/app", "/app"), false);
  assert.equal(isNavigationActive("/app/helpdesk-other", "/app/helpdesk", "/app"), false);
});
test("nested routes and utility pages have accurate titles", () => {
  assert.equal(navigationTitle("/app/visitors/new", residentNavigation, "/app"), "Visitors");
  assert.equal(navigationTitle("/admin/residents/123", adminNavigation, "/admin"), "Residents & homes");
  assert.equal(navigationTitle("/app/emergency", residentNavigation, "/app"), "Emergency");
});
test("each navigation module has a unique destination", () => {
  for (const groups of [residentNavigation, adminNavigation]) {
    const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
    assert.equal(new Set(hrefs).size, hrefs.length);
  }
});
test("avatar initials remain readable on pale and dark identity colors", () => {
  assert.equal(avatarForeground("#fbd2df"), "#131a2a");
  assert.equal(avatarForeground("#3155d8"), "#ffffff");
  assert.equal(avatarForeground("#ffffff"), "#131a2a");
});
test("labels reach controls nested inside icon wrappers", () => {
  const markup = renderToStaticMarkup(createElement(Field, { label: "Date", hint: "Choose a date", children: createElement("div", null, createElement(Input, { type: "date" })) }));
  const id = markup.match(/<label for="([^"]+)"/)?.[1];
  assert.ok(id);
  assert.ok(markup.includes(`id="${id}"`));
  assert.ok(markup.includes(`aria-describedby="${id}-description"`));
  assert.ok(markup.includes(`id="${id}-description"`));
});
test("validation is announced and attached to the failed input", () => {
  const markup = renderToStaticMarkup(createElement(Field, { label: "Email", error: "Enter a valid email", children: createElement(Input, { id: "email", name: "email" }) }));
  assert.match(markup, /for="email"/);
  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /aria-describedby="email-description"/);
  assert.match(markup, /role="alert"/);
});

test("society switching only keeps destinations the new role can use", () => {
  assert.equal(resolveSwitchPath({ role: "manager", next: "/admin/residents" }), "/admin/residents");
  assert.equal(resolveSwitchPath({ role: "owner", hasUnit: true, next: "/app/visitors" }), "/app/visitors");
  assert.equal(resolveSwitchPath({ role: "owner", hasUnit: true, next: "/admin/billing" }), "/app");
  assert.equal(resolveSwitchPath({ role: "guard", next: "/gate" }), "/gate");
  assert.equal(resolveSwitchPath({ role: "guard", next: "/admin" }), "/gate");
  assert.equal(resolveSwitchPath({ role: "owner", hasUnit: true, next: "//evil.example" }), "/app");
  assert.equal(resolveSwitchPath({ role: "admin", next: "/admin/../portfolio" }), "/admin");
});

test("society switching keeps the section but drops cross-society detail IDs", () => {
  assert.equal(stableSwitchPath("/admin/residents"), "/admin/residents");
  assert.equal(stableSwitchPath("/admin/residents/abc-123"), "/admin/residents");
  assert.equal(stableSwitchPath("/admin/helpdesk/abc-123"), "/admin/helpdesk");
  assert.equal(stableSwitchPath("/app/helpdesk/abc-123"), "/app/helpdesk");
  assert.equal(stableSwitchPath("/app/community/notices/abc-123"), "/app/community");
  assert.equal(stableSwitchPath("/app/community/discussions/abc-123"), "/app/community");
  assert.equal(stableSwitchPath("/app/payments/receipts/abc-123"), "/app/payments");
  assert.equal(stableSwitchPath("/app/visitors/new"), "/app/visitors/new");
});

test("society home paths follow the membership role", () => {
  assert.equal(societyHomePath({ role: "owner", hasUnit: true }), "/app");
  assert.equal(societyHomePath({ role: "manager" }), "/admin");
  assert.equal(societyHomePath({ role: "guard" }), "/gate");
  assert.equal(societyHomePath({ role: "owner", isSuper: true }), "/admin");
});

test("internal destinations reject absolute URLs and traversal", () => {
  assert.equal(isSafeInternalPath("/app/visitors"), true);
  assert.equal(isSafeInternalPath("https://evil.example"), false);
  assert.equal(isSafeInternalPath("//evil.example"), false);
  assert.equal(isSafeInternalPath("/app/../admin"), false);
  assert.equal(isSafeInternalPath("/app/%2e%2e/admin"), false);
  assert.equal(isSafeInternalPath("/app\\admin"), false);
});

test("notice and poll audiences respect the resident role", () => {
  assert.equal(canViewNoticeAudience("owner", "owners"), true);
  assert.equal(canViewNoticeAudience("tenant", "owners"), false);
  assert.equal(canViewNoticeAudience("tenant", "tenants"), true);
  assert.equal(canViewNoticeAudience("owner", "tenants"), false);
  assert.equal(canViewNoticeAudience("family", "tenants"), true);
  assert.equal(canViewNoticeAudience("owner", "all"), true);
  assert.equal(canViewNoticeAudience("owner", "tower", "tower-a", "tower-a"), true);
  assert.equal(canViewNoticeAudience("owner", "tower", "tower-a", "tower-b"), false);
  assert.equal(canViewNoticeAudience("owner", "tower", null, "tower-a"), false);
  assert.equal(canVoteInPollAudience("owner", "owners"), true);
  assert.equal(canVoteInPollAudience("tenant", "owners"), false);
  assert.equal(canVoteInPollAudience("tenant", "tenants"), true);
  assert.equal(canVoteInPollAudience("owner", "tenants"), false);
});

test("polls close at the end of their configured day", () => {
  assert.equal(pollIsOpen("active", null, new Date("2026-11-04T10:00:00Z")), true);
  assert.equal(pollIsOpen("active", "2026-11-03T18:29:59.999Z", new Date("2026-11-04T10:00:00Z")), false);
  assert.equal(pollIsOpen("active", "2026-11-05T18:29:59.999Z", new Date("2026-11-04T10:00:00Z")), true);
  assert.equal(pollIsOpen("closed", "2026-11-05T18:29:59.999Z", new Date("2026-11-04T10:00:00Z")), false);
});

test("community datetime values are parsed as Asia/Kolkata, not the server time zone", () => {
  assert.equal(parseCommunityDateTime("2026-12-20T19:00")?.toISOString(), "2026-12-20T13:30:00.000Z");
  assert.equal(parseCommunityDateTime("2026-12-20T19:00:00")?.toISOString(), "2026-12-20T13:30:00.000Z");
  assert.equal(communityDayEnd("2026-12-20")?.toISOString(), "2026-12-20T18:29:59.999Z");
  assert.equal(communityMonthKey(new Date("2026-11-30T19:00:00Z")), "2026-12");
  assert.equal(communityDayStart("2026-02-31"), null);
  assert.equal(communityDayStart("2026-13-01"), null);
  assert.equal(communityDayEnd("2026-04-31"), null);
});

test("resident and guard dates use the community time zone across midnight", () => {
  const instant = "2026-11-03T20:00:00Z";
  assert.equal(formatDate(instant), "4 Nov 2026");
  assert.equal(formatTime(instant), "1:30 am");
});

test("guest passes use inclusive community dates and reject impossible or excessive windows", () => {
  const today = "2026-11-04";
  const pass = validatePassRequest({ type: "guest", name: "Guest", validFrom: today, validTo: "2026-11-05" }, today).pass;
  assert.equal(pass?.validFrom.toISOString(), "2026-11-03T18:30:00.000Z");
  assert.equal(pass?.validTo.toISOString(), "2026-11-05T18:29:59.999Z");
  assert.ok(validatePassRequest({ type: "guest", name: "Guest", validFrom: "2026-11-31", validTo: "2026-12-01" }, today).fieldErrors?.validFrom);
  assert.ok(validatePassRequest({ type: "guest", name: "Guest", validFrom: today, validTo: "2026-12-04" }, today).fieldErrors?.validTo);
});

test("non-guest passes collect identity at the gate and only daily cabs keep a date range", () => {
  const today = "2026-11-04";
  const requested = { name: "Unverified driver", phone: "9999999999", validFrom: today, validTo: "2026-11-10", recurringCab: true };
  const delivery = validatePassRequest({ ...requested, type: "delivery" }, today).pass;
  const cab = validatePassRequest({ ...requested, type: "cab" }, today).pass;
  assert.equal(delivery?.name, "Delivery");
  assert.equal(delivery?.phone, null);
  assert.equal(delivery?.recurringCab, false);
  assert.equal(delivery!.validTo.getTime() - delivery!.validFrom.getTime(), 86_400_000 - 1);
  assert.equal(cab?.name, "Daily cab pickup");
  assert.equal(cab?.phone, null);
  assert.equal(cab?.recurringCab, true);
  assert.ok(cab!.validTo > delivery!.validTo);
});
