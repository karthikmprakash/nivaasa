import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { avatarForeground, cn, formatDate, formatTime } from "./utils";
import { adminNavigation, isNavigationActive, navigationTitle, residentNavigation } from "../components/shell/navigation";
import { Field, Input } from "../components/ui/field";

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

test("resident and guard dates use the community time zone across midnight", () => {
  const instant = "2026-11-03T20:00:00Z";
  assert.equal(formatDate(instant), "4 Nov 2026");
  assert.equal(formatTime(instant), "1:30 am");
});
