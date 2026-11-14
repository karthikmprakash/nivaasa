# Nivaasa native apps

Nivaasa uses one iOS app and one Android app. The account's active community membership determines which sections are visible. The web API remains responsible for authorizing each request.

Both clients use the blue, white and blush design system and Plus Jakarta Sans. **Neither client has complete visual or functional parity with mobile web.** The iOS client currently covers more web workflows. Android also supports branded provider selection, daily help registration and attendance, and sharing and cancelling active passes.

The iOS resident shell now separates the navigation drawer, anchored account dropdown and More services grid. Resident pages retain the header and quick navigation; bounded tasks use custom forms. Shared artwork is exported from the web's Lucide dependency with `node scripts/native-icons.cjs`. Inputs have explicit dark foregrounds in the app's supported light appearance. Pre-approval mirrors the web's five visit types, branded provider picker, cab frequency, delivery handover, daily-help registration and active-pass cancellation. Guest passes can also pre-fill name and phone from the phone's address book via the system contact picker (`NSContactsUsageDescription`; ContactPicker.swift presents it from a dedicated container so the picker's self-dismissal never closes the form), with a success haptic on selection and a Settings hint when Contacts access is denied.

Visitor cards show the gate photo when captured, otherwise the vendor platform logo when a company is set, otherwise initials (`VisitorIdentity` in VisitorDetail.swift). History rows show name, logo/photo and a status badge (Inside / Exited / Left at gate / Denied / Expired) with in/out times inline; tapping a row opens a detail sheet with the full entry and exit events, vehicle, code and notes. Tapping a personal (guest) pass opens a dedicated invite page (`InviteDetailView`) with photo, code, validity, a "multiple entries within this window" note, QR, a shareable guest invite link, and one-tap directions/message CTAs. The same invite is public on the web at `/invite/<code>` with the entry code, photo, validity and one-tap Google Maps directions plus SMS/WhatsApp to the inviter. Gate pass verification and entry (`/api/gate/pass`, `/api/gate/entry`) accept a pass in `exited` state while it is still inside its validity window, so personal invites allow multiple entries within the window. Delivery, one-off cab and vendor passes are short approvals: `validatePassRequest` gives them a fixed 1-hour window from creation (`VENDOR_PASS_HOURS`), they carry no QR — the resident app shows a "no QR needed" note instead of the QR/share card, and security records the actual visitor at the gate and verifies against the pass code. Guest passes keep date-range validity, the QR pass and the shareable `/invite/<code>` page. Pass cards show clock times for same-day (1-hour) windows. Provider logos are the web's licensed artwork bundles.

Home's phone view is deliberately minified to urgent items: gate approvals, pre-approved passes "On the way" (up to 3 rows with logo/photo, window and code, linking to Visitors), dues, the services icon row, one community notice and emergency. Full household, delivery, request, event and poll detail remains in the relevant modules and on the wider web layout. `mobile/home` returns the active pre-approved passes (`passes`, limit 5). Payments shows only open unpaid invoices in the Invoices tab (paid ones collapse into a single "View history" row); history/verification rows carry an inline Receipt/View button instead of a separate full-width button; the overview stat boxes are equal height. The emergency panic button has a pulsing ring animation (disabled under Reduce Motion). Visitors has Waiting / Pre-approved / History views and the custom pass form. Community has All updates / Notices / Discussions / Polls / Events, voting, RSVP and moderated discussion creation. Payments has invoice/history/verification views, demo online and offline payment forms, advance payments, receipt preview and statement preview. Directory and Documents have data-backed filters and search. Amenities is icon-led: "Community spaces" is a 3-column grid of `IconTile`s (the amenity's own Lucide icon — same mapping as web `iconMap` — in a deterministic pastel tile, name, location, price/Free pill inline; tap books directly), next booking is a compact banner with the amenity icon, and My bookings is one divided list (icon, slot, status, inline Cancel). Helpdesk leads with a quick-category `IconActionRow` (Lucide icon per category, opens the form pre-filled via `NewTicketSheet(initialCategory:)`). The raise-request sheet offers preset subject chips per category ("Common issues" + "Something else…"), a photo attachment (camera, multipart upload to `mobile/helpdesk`), scope/priority chips and submit. `mobile/helpdesk/attachment?ticket=&name=` serves photos to the owning resident or same-society staff. Ticket detail shows a lifecycle stepper (Raised → Assigned with name → In progress → Resolved with time/remarks → Rated x/5), photo attachments (`AttachmentRow`), conversation, reply, rating and reopen; the list has status filter tabs incl. history. Icon assets are exported by `scripts/native-icons.cjs` (77 Lucide templates). Helpdesk opens individual requests, accepts replies, and supports rating or reopening a resolved request. My home shows the last 14 days of daily help attendance and allows private household reviews for verified profiles. Settings supports profile, privacy, notification preferences and password changes. Emergency uses society contacts and the resident's active alerts, not hard-coded society telephone numbers.

iOS gate alerts are APNs-ready: Keychain session persistence, device registration, visitor photo upload, a service extension for photos/avatar fallback, and Accept / Reject / Call actions are implemented. See [push-notifications.md](push-notifications.md). A paid Apple Developer account and APNs key are required to activate real remote delivery; the current free profile can use local previews and simulator pushes only.

## Motion and haptics

The iOS app has one shared motion/haptics system in `apps/ios/Nivaasa/Haptics.swift`. The screen structure and component style follow the selected Figma Community base template, **Home Service App UI Kit – Community** (https://www.figma.com/community/file/1321533990013477115/home-service-app-ui-kit-community, CC BY 4.0), fully rethemed to the locked blue/white/blush DESIGN.md tokens; module screens borrow patterns from Financy (payments), Event Booking (amenities/events), Food Delivery (visitor/delivery approvals) and HR Attendance (staff). No true gated-community template exists in the Figma iOS library. iOS 26 Liquid Glass kits were deliberately not used as the base because they conflict with the calm brand system. Figma defines the interaction moments; the native side implements them:

- `Haptics.shared.play(_:)` — one CoreHaptics engine with `UIImpactFeedback`/`UISelection`/`UINotification` fallback when the engine is unavailable (simulator, older hardware). Kinds: `tap`, `selection`, `success`, `warning`, `error`, `heavy`.
- `NivaasaMotion` — shared spring/ease curves plus the page transition. Every animation respects `accessibilityReduceMotion`.
- Press feedback: `NivaasaPressStyle` plays a soft `tap` and scales to 0.985 while pressed. Chips, toggles, copy button, bottom bar, tab strip and all three web menus animate with the shared spring and play `selection`/`success` on change.
- Outcome haptics: approve/RSVP/vote/payment/pass creation/settings save/discussion post/booking play `success`; deny/pass cancel/booking cancel play `warning` or `error`; failures play `error`; the emergency panic action plays `heavy` first, then `success`/`error`. Gate-alert Accept/Reject actions from the lock screen play the same outcome haptics.
- Settings has an **App experience → Haptics** toggle persisted at `UserDefaults` key `nivaasa.haptics.enabled` (default on). UI tests pass `--ui-testing`, which mutes haptics.

Guards and managers have simplified gate and management dashboards and six-digit pass verification. The gate console main page is security-focused: an inline OTP verifier (keypad opens only on tap; auto-verifies on the sixth digit with a green/red toast via the app-wide `nivaasaToast` overlay plus an inline match card with Record arrival), a "New arrival — request approval" flow (`GateNewEntry`) that runs as a 3-step stepper — 1 visitor photo, 2 home + visit type via a logo/icon dropdown menu, 3 details — with a fresh form per request (seeded `.id`, so a captured photo is never reused silently), multipart-posting to `gate/entry` and triggering the resident gate alert with photo. Also on the main page: an "Inside now" card (entered vendors/deliveries/cabs only, fed by the activity feed) and an "Approved — ready to admit" card with Admit buttons (approved walk-ins → entered → Inside now) — guests excluded as they may stay for hours) with a live "Xh Ym inside" timer (`ElapsedSince`), one-tap Mark exit (`gate/visitors/<id>/exit`) and Call resident, a "Waiting for approval" queue, and a panic-alerts card. No pre-approved pass list or deliveries list on the main page. The staff footer is Gate | Scan | **Activity** ("More" lives in the side drawer; Scan is the vertically centered brand button with the `ScanQrCode` logo and heavy haptic). The Activity tab (`GuardActivityView`) shows today's full feed from `mobile/gate` `activity` as one compact divided list (no per-entry card chrome): logo/photo identity, name · company, color-coded type badge, status badge, in/out times or a live duration for people on site, and icon-only actions — Call resident (phone), Admit (approved walk-ins, via `gate/visitors/<id>/entry`, which lands them in "Inside now"), Mark exit (via `gate/visitors/<id>/exit`). A search field filters by phone/name/flat (the exit flow: search the delivery person's phone, tap the exit icon), plus Status/Type/Sort dropdown filters. End-to-end gate flows (pass verify→entry→inside→exit-by-phone, vendor 1h re-entry, walk-in approve→admit→exit, code stripping, resident photo via bearer) are covered by a 20-scenario script run against the dev server. `mobile/gate` strips `code` from pass and activity rows so security never sees entry codes, and its queue lists only `pending` requests. Residents see the gate photo as a full-width banner on approval cards (Home and Visitors, `VisitorPhotoBanner` via `visitors/<id>/photo` with the bearer token) and the gate-alert preview attaches the real photo (downloaded with the stored session, avatar fallback). The resident Home shows pre-approved passes "On the way" (up to 3 rows) and its services are a single `IconActionRow` (Raise a request / Book amenity / Payments / Directory).

## Remaining parity work

- Society selection/switching and the Buy & sell page/menu entry are absent in iOS. Do not treat the account dropdown or service grid as fully matched.
- Residents can register daily help from iOS My home or Android Visitors. Editing and removing other household records and move requests still need native workflows.
- Discussion threads, likes, comments and Helpdesk photo attachments still need native workflows.
- Richer amenity booking history, guest and nightly pricing, and other web booking states still need matching. Receipt previews are simplified; PDF/file preview is not a full download/share workflow.
- Resident spacing, typography, pills, metadata and card grouping still differ on several screens. Page traversal tests do not prove pixel equality.
- Staff/admin/portfolio modules, role-specific menus, authoring, and reporting remain substantially web-only or simplified. Android still has gaps across the resident services available in iOS.
- Small phones, landscape/iPad, larger accessibility text, VoiceOver, keyboard recovery, drafts and navigation-state restoration need a dedicated device pass.

The local iOS build depends on the expanded mobile Home/More/Payments data and mobile Discussions/Settings/Emergency/Daily-help endpoints plus pass cancellation and APNs registration. Release the backend only after approval and verify that deployment before installing a phone build that relies on these endpoints. Production deployment and signing/installation are separate from simulator verification.

## Local setup

Start the web backend on port 3100 and use the seeded demo accounts documented in the root README.

### iOS

Requires Xcode, an iOS simulator and XcodeGen. Run from the repository root:

```sh
cd apps/ios
xcodegen generate
open Nivaasa.xcodeproj
```

Run the Nivaasa scheme on an iOS 17 or newer simulator. The Debug app uses `http://localhost:3100`. Choose Product → Test to exercise the resident, manager, and guard flows against the local demo data. To run the additional guest pass and resident approval tests, run a copy of the seeded backend on port 3101 and set `TEST_RUNNER_NIVAASA_ISOLATED=1` when invoking `xcodebuild test`. These tests write a pass, an arrival and a resident approval to the copy.

### Parity verification

Use exact method filters and verify a **nonzero** executed test count. A class-only filter has previously reported success while running zero tests.

```sh
xcodebuild test -project apps/ios/Nivaasa.xcodeproj -scheme Nivaasa \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:NivaasaUITests/WebParityTests/testResidentPagesAndAllThreeMenus \
  -only-testing:NivaasaUITests/SnapshotTests/testVisitorPassControls \
  CODE_SIGNING_ALLOWED=NO
```

The traversal attaches actual screenshots of the resident page surfaces, all three menus, lower-page content and custom forms. Inspect the attachments in the `.xcresult` bundle against the web at the same logical width. A passing assertion checks navigation/control availability, not visual equality or every write action.

For mobile API regression checks, first build web, then run:

```sh
npm run build
node scripts/test-mobile-api.cjs
```

The API runner makes a disposable backup of `data/nivaasa.db`, starts the production build on loopback port 3101 and stops its server afterwards. It never accepts a remote base URL and never writes to the original database. It covers missing/invalid authentication, unit/society scoping, document visibility, settings validation and ownership, discussion authorship/moderation/auditing, daily-help registration, visitor-pass cancellation and emergency-alert ownership/resolution. The seeded resident must have a second active society membership for the society-scoping check. Retained test data/log paths are printed; session tokens are not.

### Android

Requires JDK 17, Android SDK Platform 36, and an Android emulator. Set `JAVA_HOME` and `ANDROID_HOME` for your installation, then run:

```sh
cd apps/android
./gradlew :app:installDebug
adb shell am start -n app.nivaasa.community/.MainActivity
```

The Debug app defaults to `http://10.0.2.2:3100` for the standard Android emulator. Set `-PnivaasaApiUrl=https://your-server.example` to use another backend. The minimum supported Android version is API 26.

Release builds default to `https://nivaasa.app`. Set the deployment URL via `NIVAASA_API_URL` in the iOS build settings and `nivaasaApiUrl` in Android. Physical-device and store distribution require the usual platform signing setup.
