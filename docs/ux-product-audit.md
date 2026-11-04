# Nivaasa UX and product gap audit

4 November 2026 · Verdant Heights and the portfolio demo

The highest priority is the gate workflow. Residents need a fast way to invite one person or a group, guards need an unambiguous decision at arrival, and managers need to see exceptions. Nivaasa has the pieces for a single visitor, but the paths still diverge across web and Expo. The largest risk found outside the gate is that server access is broader than the role-specific navigation suggests.

## Evidence and coverage

- Reviewed all 42 web route templates across resident, society operations, guard, portfolio and public surfaces. Rendered representative seeded instances of every template at 390px and 1093px, including receipt, discussion, notice, request and home details. For data-driven pages, this is a seeded-state check rather than coverage of every filter, dialog or record.
- Reviewed the Expo route inventory and rendered the 11 resident screens, sign-in, guard and manager screens in Expo Web at 390px. Native keyboard, safe-area, screen reader, offline and device behavior still need iOS and Android hardware checks. Router layouts and the fallback screen were reviewed from source.
- Checked role routing and sampled direct admin URLs with the seeded owner resident, tenant, manager, committee, accountant, helpdesk manager, security manager, auditor, guard and portfolio identities. Family and standalone society admin behavior were reviewed through the shared role guards and navigation rules. No separate seeded identity was used for either. The seeded portfolio owner has a global super-admin role and society admin memberships.
- Applied [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) to focus, accessible naming, errors, content overflow, touch controls and navigation state. MyGate comparisons use public documentation. Availability by plan and society configuration can differ.

## Fixes applied

- Cab registration is now required on cab pre-approvals and cab walk-ins, and hidden for all other visitor types. Web and Expo pre-approval enforce the same rule on the server. Walk-ins use a name and phone number. An existing pass fills the visitor and home so guards can verify it without re-entering those details. Residents can create a code without collecting the visitor’s phone number. I treated the registration requirement as applying when a resident creates a cab pass as well as when a cab arrives.
- The web pre-approval and gate forms put optional purpose and notes behind a disclosure. The branded platform picker remains visible when choosing a delivery or cab. The Expo companion still uses a text field for the platform.
- Both gate admission endpoints check pass dates and only transition an approved entry once. A code cannot be applied to another home. Expo day counts now match web pre-approval.
- Communications had 88px of page overflow at 390px because three header actions were forced into one row. Home details had 168px of page overflow because the invoice table could size the outer grid. The actions wrap and the invoice table scrolls within its card. Both pages returned to zero page overflow at 390px.
- Verified the cab field on the live web form and in Expo Web. Exercised API rejection of a cab without registration, a walk-in without a phone number, and a code submitted against another home.

## Cross-role issues to address first

1. **P0 · Admin read access is broader than the menu indicates.** An accountant, helpdesk manager, security manager and auditor could open sampled admin pages outside their navigation by URL, including settings and other operational areas. Committee could open audit and settings directly. Admin CSV export also checks the broad admin-role predicate before choosing the dataset. Align module routes, dashboard data, mobile summaries and exports with one explicit view/edit/export policy. Audit role coverage with direct URLs and APIs. Evidence: `apps/web/src/lib/queries.ts:37`, `apps/web/src/components/shell/admin-shell.tsx:18`, `apps/web/src/app/api/admin/export/route.ts:11`.
2. **P0 · Emergency contact ownership is unclear across societies.** The resident emergency screen embeds a demo gate contact, and directory and guard surfaces also contain fixed phone numbers. A portfolio owner can manage more than one society, so each contact needs to come from its active society and gate assignment. Display the local fallback number and alert acknowledgement above secondary content. Evidence: `apps/web/src/app/app/emergency/page.tsx:17`, `apps/web/src/app/app/directory/page.tsx:101`, `apps/web/src/app/gate/page.tsx:142`.
3. **P1 · Announcement audiences disagree between surfaces.** Home and Community include owner notices in the query independently of the reader’s role. Search and notice detail use separate conditions. Create one audience rule and apply it to list, search, detail, mobile and notification delivery, with tests for owner, tenant, family and tower audiences. Evidence: `apps/web/src/lib/queries.ts:92`, `apps/web/src/app/app/community/page.tsx:45`, `apps/web/src/app/app/search/page.tsx:23`, `apps/web/src/app/app/community/notices/[id]/page.tsx:18`.
4. **P1 · The first phone viewport is busy.** Resident home and Payments repeat summaries and navigation. Guard’s opening screen puts five metrics above the entry form, leaving the queue and actions below the fold. Admin Overview puts multiple modules on the same dashboard even for specialist roles. Give each role one above-the-fold task, one exception list, and a route into the rest.
5. **P1 · A page can fit the viewport and still be hard to operate.** At 390px, admin Residents, Staff, Vendors, Security, Helpdesk, Amenities and Audit have scrollable tables wider than the screen. The guard’s recent entries table also scrolls sideways. Prefer compact rows with identity, state and the next action visible, with a detail drawer for the remaining columns. Keep export and dense tables for wide screens. Give horizontal overflow affordances to any tables that remain.
6. **P1 · Mobile accessibility and parity.** Expo guard and manager headers rendered unnamed icon buttons. Several short controls use 34px visual targets. Add accessible names, at least 44px targets, visible state and an error/retry path. Native confirmations and platform permissions still need device checks. Evidence: `apps/mobile/app/gate.tsx:48`, `apps/mobile/app/manage.tsx:30`.
7. **P1 · Payment and receipt trust.** Resident Payments includes a fixed sample line-item breakdown alongside live invoices. The receipt displays a Paid badge and a default method even when rendering from an invoice without a successful payment. Use the selected invoice's actual items and show a receipt only for a settled payment. Show the simulation label at the action where users decide to pay. Evidence: `apps/web/src/app/app/payments/page.tsx:132`, `apps/web/src/app/app/payments/receipts/[id]/page.tsx:79`.

## Page-by-page follow-up

### Resident web · 22 routes

- **Home** · Keep waiting arrivals and one urgent bill on top. Collapse repeats of deliveries, payment links and community notices into compact previews.
- **Visitors** · Prioritize waiting visitors, then today's passes. Separate dated single passes from real recurring access. “Create a recurring pass” currently opens the same one-time form.
- **New visitor** · The cab and optional-details changes are live. Add a share action on pass creation and “Invite a group” beside “Invite one person.” For a cab whose number is unknown before dispatch, let the resident add it once assigned.
- **Deliveries** · Give “Awaiting approval” and “Ready to collect” distinct actions and only show pickup codes when the parcel is ready. Provide full searchable history beyond the preview.
- **Community** · The featured and regular feed can repeat the same notice. Use a single chronological feed with a pinned item, unread status and explicit filters.
- **Notice detail** · Enforce audience checks at the route. Prefer a direct notice response or linked request to generic “start discussion” and “raise request” exits.
- **Discussion detail** · Show a clear permission/moderation state, position the reply near the conversation and paginate replies as threads grow.
- **New discussion** · Preview the post and show the review expectation before submission. Preserve entered content if the user needs to back out or a submission fails.
- **Amenities** · Lead with availability and “My bookings.” Show final price, deposit and cancellation terms before commitment. Make waitlist and closure states actionable.
- **Payments** · One balance and one due action should lead. Use invoice-specific detail and collapse year totals, FAQs and supplementary cards.
- **Receipt detail** · Add a semantic page heading. Distinguish invoice due, partial payment and paid receipt. Use the actual payer and recorded payment method.
- **Helpdesk** · Put unresolved requests first and surface the next update or due date before the aggregate statistics.
- **New request** · Separate essentials from optional attachments and details. Move focus to the first failed field and preserve drafts when upload or submission fails.
- **Request detail** · Surface status, assignee and promised next update before the thread. Separate reply, rating and reopen actions.
- **Directory** · Clearly name what “call via guard” does. Source the correct gate contact and distinguish opt-in contact information from masked metadata.
- **Documents** · Show version/date and clear search results. For private files, serve downloads through an access check and give the user an inline failure state.
- **My home** · Household, vehicles, pets, help and move requests compete in one long view. Add section navigation and surface pending move actions separately.
- **Settings** · Group intercom, notification, and privacy settings by the user outcome. Show an in-context saved/error state and explain which channels are connected.
- **Classifieds** · Provide explicit status, expiry, report and contact paths. Long content needs a readable preview and detail route.
- **Emergency** · Put call and SOS at the top, identify the receiving gate, and show sent, acknowledged and resolved states plus a fallback if nobody responds.
- **Notifications** · Separate action required from informational updates. Link directly to the item and resolve stale approval actions gracefully.
- **Search** · Apply the same visibility rules as each module. Provide a result count and “see all” when category limits hide matches.

### Society operations web · 15 routes

- **Overview** · Make a role-specific work queue the opening view. Each alert should open its exact invoice, request, or approval instead of the module root.
- **Residents & homes** · Make resident search and the pending move queue accessible before wide table columns. Add paginated results and a bulk import preview.
- **Home detail** · Outer overflow fixed. Scope the Invoices and Helpdesk shortcuts to the selected home. Label totals calculated from a limited recent list, or query actual totals.
- **Staff & attendance** · Separate today's exceptions from the staff directory. Use consistent check-in/out actions, readable schedules and visible verification state.
- **Vendors & assets** · Split vendor renewals and asset service into work queues. Keep contracts and asset records in their own lists.
- **Security & gate** · Move open alerts and pending entries above reporting. Replace internal terms like “preapproved” in filters, show the active gate and add clear time filters.
- **Helpdesk** · Lead with SLA due/overdue and unassigned. Make hidden filter options discoverable and restore the exact queue on return from a ticket.
- **Helpdesk detail** · Separate resident-visible replies from internal notes, show why the SLA timer changed, and disclose who can edit the ticket.
- **Amenities** · Put today’s bookings, exceptions and closures ahead of settings. Make booking rules and refund effects visible when cancelling.
- **Billing & accounts** · Separate routine invoicing from payment verification and exceptions. Show status and outstanding balance together without requiring side scrolling.
- **Reports** · Use one date range and society scope across metrics, charts and exports. Attach export controls to their datasets and make filters persistent.
- **Communications** · Header overflow fixed. Choose one primary create action per context and surface pending moderation ahead of old posts.
- **Audit log** · Put event, actor and time in the compact view, with metadata in row detail. Label date scope and add searchable pagination.
- **Society settings** · Keep permissions, banking and integrations in distinct sections with scope and saved/error feedback. Make non-connected integrations explicit.
- **Admin notifications** · Keep actions role-scoped and point to the exact item. Include a clear “already resolved” state when a teammate acted first.

### Guard, portfolio and public web · 5 routes

- **Guard console** · Put “Verify code” and “Request approval” first, with waiting visitors immediately below. The combined resident/home/code search still takes interpretation and truncates its instruction on a phone. Give search a visible network error and retry, use a numeric keyboard for codes, and expose a clear queue freshness indicator.
- **Portfolio** · Show society exceptions and trends before configuration notes. Make the active society explicit through navigation and preserve it across entry into a society dashboard.
- **Landing** · Keep resident sign-in and society onboarding distinguishable. The long overview repeats feature links and sends several footer links to the same section. Link the actual documentation or label the destination accurately.
- **Sign-in** · Give regular users a task-focused form and make demo personas secondary. Expose the support route and distinguish network error from invalid credentials.
- **Onboarding** · Label required information at each step, provide a final review of society, units and admin, and preserve a draft for long setup sessions. Only the first step was rendered with no submission.

### Expo companion

- **Home, Community, Visitors, Payments and More** · Put approvals above dues for urgent arrivals. Make notices and discussions open a readable detail view, surface share/revoke for passes, align payment and receipt behavior with web, and use consistent sign-out confirmation. Sign-out on More had no visible response in the Expo Web run.
- **Amenities, Directory, Documents, Helpdesk and Notifications** · Provide a longer date range and cancellation/status feedback for bookings, clarify directory contact options, report document-open failures, add ticket detail/replies, and deep-link actionable notifications.
- **New visitor** · Cab field verified. Match the searchable platform picker and custom date/share experience on web.
- **Guard** · The console lists and admits approved entries but does not expose the web new-entry and code-lookup flow. Give the guard a single task-first console with explicit sync and failure states.
- **Manager companion** · The “Needs attention” cards are largely summaries. Provide role-appropriate actions and direct links. A manager can reach the mobile gate read view, while the gate write guard does not include manager. Make read-only status explicit or reconcile the policy. The two header icon buttons need accessible names.
- **Sign-in, role routing, fallback and navigation** · Add a single role resolver shared by login and the root screen. Make demo shortcuts explicit, handle a direct link when signed out, and test route recovery on native devices.

## MyGate feature gaps

- **Bulk and party invites · Missing.** Nivaasa has one visitor and one code per creation. MyGate documents a party link with a time window, venue and guest cap, and individual guest codes. Start with named bulk invitations and batch revoke, then add capped self-service links when admission and redemption are transaction-safe. [MyGate party/group invite](https://mygate.com/wp-content/uploads/2025/03/Jan25.pdf)
- **Recurring, editable and QR passes · Partial.** Nivaasa has dated numeric passes and cancellation. It lacks an editable weekday/time schedule, per-entry history for repeat use, and a QR scan flow. MyGate documents frequent visitor pre-approval, edit/revoke and QR/numeric gate entry. [Recurring invites](https://mygate.com/blog/feature-in-focus/recurring-invite/) · [Visitor management](https://mygate.com/visitor-management/)
- **Approval fallback and security contact · Partial.** Nivaasa has in-app approval, saved intercom numbers and in-app SOS. It lacks the automated call fallback and a guard message/acknowledgement experience. MyGate documents e-Intercom fallback, messaging the guard and configurable emergency contacts. [MyGate FAQ](https://mygate.com/faqs/) · [Connect with Security](https://mygate.com/wp-content/uploads/2025/04/Society-Dashboard-Updates-Mar-25-1_compressed.pdf)
- **Parking and gate operations · Partial.** Nivaasa has a household vehicle list, parking counts and patrol records. A guest parking assignment, gate/device-aware reporting, and ANPR integration were not found. MyGate documents parking inventory, guest parking and ANPR reports. [MyGate parking and devices](https://mygate.com/wp-content/uploads/2025/07/Society-Dashboard-Updates-May-25.pdf)
- **Move in and out · Partial.** Nivaasa supports a household request and admin decision. MyGate documents configurable requirements, owner verification and an approved move gate pass. Add a checklist, appointment window and guard-facing gate pass. [MyGate setup](https://adminfaq.mygate.com/articles/130142-how-to-setup-move-in-from-the-admin-dashboard) · [Tenant approval](https://mygate.com/wp-content/uploads/2025/04/Society-Dashboard-Updates-Feb-25-1_compressed.pdf)
- **Amenity lifecycle · Partial.** Nivaasa has slots, booking and cancellation. MyGate documents grouped capacity, waitlists, configurable cancellation/refund rules and access control. Prioritize waitlists and clear closure/refund behavior. [MyGate amenities](https://mygate.com/society-erp/amenities-management/)
- **Helpdesk escalation · Partial.** Nivaasa has assignment and SLA deadlines. MyGate documents configurable escalation recipients and timings per category. Build a queue of overdue work with owner, next action and escalation history. [MyGate escalation matrix](https://adminfaq.mygate.com/articles/125151-how-to-set-escalation-matrix-for-helpdesk-requests)
- **Finance integrations · Partial.** Nivaasa has billing heads, invoices, receipts, verification and CSV exports. Payments are simulated. MyGate documents reconciliation, Tally export and a broader ERP. Ship a real gateway with duplicate-safe callbacks, reconciliation and accurate receipts before expanding the accounting surface. [MyGate ERP](https://mygate.com/society-erp/) · [Changelogs](https://mygate.com/changelogs/)
- **Staff workflows · Partial.** Nivaasa logs manual attendance and patrol checkpoints. MyGate describes shift/gate rules and attendance reporting, plus optional device-based verification. Prioritize attendance corrections with a reason, shift handoff, and payroll export. [MyGate staff and visitor management](https://mygate.com/visitor-management/)
- **Communication and document administration · Partial.** Nivaasa already has notices, discussions, polls, RSVP and a document viewer. MyGate documents targeted and folder-based document administration and more extensive administration workflows. Fix audience enforcement first, then add upload/version control and urgent notice acknowledgement. [MyGate document updates](https://mygate.com/wp-content/uploads/2025/09/ERP-Dashboard-Updates-July-2025_compressed.pdf)

## What to build next

1. **Group invite with a gate-ready guest list.** Host sets date, time, venue and cap, then pastes guest names and optional phone numbers. Generate one revocable code per guest. Let the guard search the list by event or code, and show used/remaining capacity to the host and manager. A later public link should issue a distinct code per verified guest and enforce the cap and expiry at redemption. Do not use a single reusable gate PIN for an entire party.
2. **One arrival timeline.** Give resident, guard and manager the same live states from expected to awaiting, admitted, collected or left. Add a recipient fallback and contact the on-duty gate when an approval stalls. Make current gate and last sync visible.
3. **Event or booking to gate.** From a booked clubhouse or society event, create the invite with venue and arrival window already set. Show guest parking and access instructions to guests and the arriving list to guards.
4. **Household approval handoff.** Let a resident delegate to a household member for a time window, with privacy-aware notifications and a clear trail of who approved. This makes school pickups, work hours and travel easier.
5. **Role-specific action inbox.** Residents see arrivals, dues and replies. Guards see entries, parcels and alerts. Finance sees verification and reconciliation. Facility managers see overdue tickets and moves. Portfolio owners see cross-society exceptions.
6. **Fast, accessible gate mode.** Use big named controls, numeric code entry, a high-contrast local-language option and a clear offline or stale state. Keep access decisions bound to expiry, revocation and duplicate detection when connectivity returns.

The first release should combine scoped access controls and the group invite foundation. Check time-to-create for a 20-person invite, time-to-admit for a code holder, duplicate redemption rejection, and recovery when a guest arrives without their code.
