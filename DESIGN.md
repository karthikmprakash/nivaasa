# Nivaasa interface standards

Nivaasa helps people run and live in a gated community. Its identity is calm, clear and practical: royal blue for the main action, neutral surfaces, and familiar controls. Residents need quick approvals and household tasks; managers need accurate operational context; guards need large controls and fast entry.

## Typography

Use Plus Jakarta Sans for application headings, navigation, controls, and data. Instrument Serif is reserved for editorial brand content. Use the shared web roles: `text-caption` (13px), `text-body` (15px), `text-section` (17px), and `text-title` (29px). Main page headings can reach 30px at desktop widths. Use 600 for emphasis and regular or medium weight for supporting text. Avoid half-pixel sizes, tiny metadata, and all-capitals navigation. Data columns and amounts use tabular numerals. Phone inputs use at least 16px on touch devices to avoid iOS focus zoom.

Custom typography roles must remain registered in `extendTailwindMerge` in `apps/web/src/lib/utils.ts`; otherwise a font-size class can incorrectly remove a foreground-color class.

## Color, surfaces and icons

Tokens live in `apps/web/src/app/globals.css` and `apps/mobile/lib/theme.ts`. The brand accent remains royal blue (#3155d8). Canvas is #f5f6f8, supporting text is #626e82, and borders are neutral. Use semantic amber, red, and green for meaningful states. Keep primary actions white on blue. Avatar foregrounds are computed from the identity color, so pale avatars use dark initials.

Controls have a 10px radius, cards 16px, and overlays 20px. Use a subtle border to separate ordinary surfaces; reserve shadows for overlays. Cards represent repeated objects or distinct content regions. Do not add a colored icon tile to every label or a decorative gradient to every section.

Use Lucide on both web and native. Standard icons are 18–20px in navigation, 16px inside compact controls, and 20–24px for standalone actions. Decorative icons are hidden from assistive technology. Every icon-only action has a name. Use the actual domain icon rather than a misleading substitute.

## Hierarchy and navigation

Resident home prioritizes waiting visitors, dues, everyday services, then community content. Household and delivery details support the main tasks. Admin overview presents accurate figures and a clear attention queue. Guard controls prioritize the touch interaction and visitor verification.

Resident and admin desktop, drawer and mobile navigation derive from `components/shell/navigation.ts`. `ApplicationShell` owns layout, account actions, search shortcuts, skip navigation and mobile sheets. Role filtering must be applied before every navigation representation is rendered; visible navigation is never a substitute for server authorization.

Use `QueryTabs` for URL-backed views. Use Radix `Tabs` for local panels. Do not assign tab semantics to ordinary navigation links. Preserve other search parameters when changing filters, and use `aria-current` for current destinations.

## Forms and states

Use `Field`, `Input`, `Textarea`, and `Select` from `components/ui/primitives`. Their context associates labels and hints even when an input has an icon wrapper. Validation text is attached with `aria-describedby` and errors set `aria-invalid`. Selected button options expose `aria-pressed`. Pending actions remain disabled until completion and communicate their state. The photo selection shown in a helpdesk request must match the files submitted.

Dialogs use Radix focus management, a title, a labeled close action, and a scrollable bounded body. Keep touch actions at least 44px tall. Preserve zoom, safe-area spacing and visible keyboard focus. Shared loading and error routes keep navigation usable, with an explicit retry action.

## Data and product truth

Compute figures from the same scoped records that back their detail views. Labels state the time range and unit. A missing measurement is a dash with context; zero remains zero. Never represent a sample number, integration, backup schedule, or retention policy as runtime configuration. Marketing previews explicitly identify demo data. Chart data has an accessible table and separate line styles for multiple series.

## Code boundaries

Routes compose server-fetched data and feature UI. Queries and view-model preparation belong in server-only library modules; mutations remain in authorized actions and APIs. Reusable controls live under `components/ui`, navigation and layout under `components/shell`, and workflow behavior under feature directories. Reuse a primitive when behavior repeats; do not create a universal component with unrelated flags merely to reduce line count.

Web and native remain separate renderers. Their typography, color roles and icon language agree, while platform-specific navigation and accessibility remain native. Test actual iOS and Android hardware before asserting native behavior has been verified.

## Verification

Run `npm run check`, `npm run test:ui --workspace @mycommunity/web`, and `npm run build` for changes to the shared system. Inspect actual pages at desktop, tablet and phone widths. Check page overflow, nested navigation, keyboard focus, labels, long text, empty states, modal scrolling and pending/error behavior. Browser viewport checks do not replace hardware testing.
