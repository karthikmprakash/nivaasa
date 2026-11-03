# Reference notes — MyGate → Nivaasa

Observation date: **4 November 2026**. This document records what was inspected, what informed the build, and what remains unknown. It separates observed public information from product decisions.

## Sources inspected

- `mygate.com` — landing page, `/society-erp/`, `/community-management/`, `/security/`, `/faqs/`, `/offerings/`.
- MyGate Dashboard login page (`dashboard.mygate.com/login`) — public sign-in surface only.
- App Store listing for **MyGate Premium** — description, ratings context and release notes.
- Google Play listing and five official screenshots — home feed, visitor approval, feature grid, payments and marketplace.

No authenticated MyGate resident, guard or admin account was used. No private API traffic, proprietary source code, assets, fonts or copy were extracted. Nivaasa is a clean-room implementation based on publicly described functionality and observed public UI patterns. The Nivaasa brand, name, copy, design system, illustrations and source code are original.

## Feature inventory observed

MyGate's public **all features** page lists more than 250 capabilities. The most relevant categories and their coverage in Nivaasa:

| Reference category | Nivaasa status |
| --- | --- |
| Visitor pre-approvals, spot approvals, guest passes, leave-at-gate | Implemented |
| Delivery logging, pickup OTP, visitor history, overstay visibility | Implemented (overstay alerts are not automatic) |
| Daily help profiles, gate check-in/out, attendance, resident notifications | Implemented |
| Panic button, emergency contacts, guard response queue | Implemented |
| Guard patrol checkpoints and rounds | Implemented |
| Vehicle registry, parking slots, resident directory | Implemented |
| Facility/amenity booking, slots, pricing, deposits, cancellation/refunds, fair-use limits | Implemented |
| Helpdesk categories, SLA, assignment, escalation, comments, reopen, ratings | Implemented (automatic escalation timing is stored; a background job is a deployment task) |
| Maintenance billing, heads, per-sq-ft/fixed/per-slot, penalties, GST fields | Implemented |
| Online payment flow, receipts, advances, offline intimations, verification | Implemented with a simulated gateway |
| Expenses, vendors, contracts, assets, AMC dates, payroll summary | Implemented |
| Notices, targeted audience, polls, secret polls, events/RSVP, discussions, classifieds, documents | Implemented |
| Resident/family/tenant profiles, move-in/out requests, e-Intercom numbers | Implemented |
| Roles for admin, committee, manager, accountant, helpdesk, security, guard, auditor | Implemented |
| Multi-property / portfolio view | Implemented |
| Audit trail and exportable records | Implemented |
| Accounting ledger, trial balance, balance sheet, TDS/GST returns, e-invoicing | Not implemented as dedicated accounting statements |
| Procurement with vendor quote portal and purchase orders | Vendor/asset register exists; quote portal is roadmap |
| Native push, e-Intercom voice calls, WhatsApp/SMS/email delivery | In-app notifications implemented; channel providers are adapters |
| Boom barrier/ANPR, prepaid meter, smart lock integrations | Integration contracts are modeled; device integrations are not bundled |
| Ad platform, locks store, e-commerce catalogue, home-services marketplace | Not implemented |

## Design decisions

- New name **Nivaasa** (*nivāsa*, dwelling/home), independent wordmark and mark.
- Palette: royal blue `#3155D8`, blush `#EF7FA4`, white and a soft `#F6F7FB` canvas.
- Type: Plus Jakarta Sans for UI; Instrument Serif for large editorial headings and greetings.
- Icons: Lucide. Charts: Recharts. Motion: restrained scroll reveals and interaction feedback.
- Original layouts and flows; no MyGate screenshots, logos or brand colours were reused.

## Known unknowns

- Exact MyGate business rules for penalties, refunds, guard shifts and escalation timers are not public. Nivaasa uses transparent, configurable defaults.
- MyGate's production payment, e-Intercom and notification provider behaviour is not observable from public surfaces. Nivaasa exposes provider-shaped seams and a working demo flow.
- Accessibility of the reference app could not be audited without access. Nivaasa follows keyboard, focus, contrast and reduced-motion basics on web.

## Evidence boundaries

The observations above come from public pages and store listings only. No claim is made that every one of MyGate's 250+ features has been replicated. The README's roadmap and “deliberately demo-only” sections list the remaining gaps explicitly.
