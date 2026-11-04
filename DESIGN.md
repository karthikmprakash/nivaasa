# Nivaasa design system

Nivaasa helps people run and live in a gated community. The interface should feel calm, clear and practical: **royal blue for action and trust, white and cool neutrals for clarity, and blush for warmth and human moments.** Residents need quick approvals and household tasks; managers need accurate operational context; guards need large controls and fast entry.

This file is the source of truth for colour, type, spacing, components, motion and implementation rules. Token values live in [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css) and [`apps/mobile/lib/theme.ts`](apps/mobile/lib/theme.ts).

---

## 1. Principles

1. **Calm utility first.** The product is used in a hurry. Hierarchy, readable labels and obvious next actions matter more than decoration.
2. **One warm note.** Blush is the humanity in the system — a lit window, a welcome, a live moment. It is an accent, never the primary action colour and never an error colour.
3. **Blue means action.** Primary buttons, links, focus rings, selected navigation and data emphasis use brand blue.
4. **Neutral is the stage.** White surfaces, the cool canvas and fine borders carry most of the interface. Long text and tables stay neutral.
5. **Layered, not noisy.** Gradients and highlights should feel like light on a surface, not another object competing for attention.
6. **Truthful UI.** Labels state the time range and unit. Missing data is a dash with context; zero remains zero. No sample number, integration or policy may look like live configuration.

---

## 2. Colour system

### 2.1 The three-colour foundation

| Layer | Role | Share of a screen | Typical use |
| --- | --- | --- | --- |
| **White / cool neutral** | Stage, surface, readability | ~60–70% | Page canvas, cards, tables, forms, body text |
| **Royal blue** | Action, trust, navigation, data | ~20–30% | Primary buttons, links, active nav, focus rings, charts |
| **Blush** | Warmth, live moments, human emphasis | ~5–10% | Page eyebrows, selected society, pink statistics, pinned/inside badges, soft washes, live dots |

Blush should be **visible at a glance on every primary screen** without becoming a second primary colour. If a screen has no blush at all, it is probably missing its eyebrow, a warm surface, or a live-state accent.

### 2.2 Primitive tokens

#### Neutrals

| Token | Hex | Use |
| --- | --- | --- |
| `canvas` | `#f5f6f8` | App background |
| `surface` | `#ffffff` | Cards, sheets, inputs |
| `ink` | `#131a2a` | Headings and primary text |
| `ink-soft` | `#4b566c` | Secondary text |
| `muted` | `#626e82` | Metadata, captions |
| `line` | `#e3e7ee` | Ordinary borders |
| `line-strong` | `#cbd2df` | Input and outlined-button borders |

#### Brand blue

| Token | Hex | Use |
| --- | --- | --- |
| `brand-50` | `#f2f5ff` | Soft selected surfaces |
| `brand-100` | `#e7edff` | Selected navigation, soft fills |
| `brand-200` | `#cfdbff` | Borders on blue-tinted surfaces |
| `brand-300` | `#a9beff` | Chart and decorative blue |
| `brand-400` | `#7795f7` | Secondary chart/data blue |
| `brand-500` | `#4f70e8` | Focus ring, progress, icons |
| `brand-600` | `#3155d8` | **Primary action**, links, active state |
| `brand-700` | `#2643b8` | Primary hover, link hover |
| `brand-800` | `#223b94` | CTA gradient end |
| `brand-900` | `#1e3274` | Deep blue text on tinted surfaces |

#### Blush

| Token | Hex | Use |
| --- | --- | --- |
| `blush-50` | `#fff5f8` | Softest warm surface |
| `blush-100` | `#fdeaf0` | Pink badges, selected-row tint |
| `blush-200` | `#fbd2df` | Warm borders, highlight blobs |
| `blush-300` | `#f6abc4` | Decorative lines, dark-mode-on-blue accents |
| `blush-400` (`accent`) | `#ef7fa4` | The lit window, live dots, decorative accents |
| `blush-500` (`accent-strong`) | `#e55d8b` | Decorative emphasis, stat icons |
| `blush-600` | `#cc3d71` | Filled pink button background with white text |
| `blush-700` (`accent-ink`) | `#a82e5b` | **Warm text/icon on light surfaces** |

#### Semantic states

| Role | Tokens | Use |
| --- | --- | --- |
| Success | `mint-50 #eefaf4`, `mint-600 #18764e` | Completed, verified, paid, safe |
| Warning | `amber-soft #fff6e2`, `amber-ink #87530e` | Waiting, pending, approaching SLA |
| Danger | `#fdeced`, `#d94a5a`, `#c43d4d` | Rejected, denied, overdue, destructive actions |
| Special | `#f2effc`, `#6a54c8` | Rare categorical purple, never a status |

**Pink is not danger.** Never use blush for errors, destructive actions or overdue amounts. Use the semantic red family.

### 2.3 Semantic accent aliases

Use these names when the meaning is “warm accent” rather than a specific tint:

| Alias | Maps to | Example |
| --- | --- | --- |
| `accent` | `blush-400` | Live dot, decorative border |
| `accent-soft` | `blush-50` | Warm surface |
| `accent-line` | `blush-200` | Warm border |
| `accent-strong` | `blush-500` | Icon or illustration accent |
| `accent-ink` | `blush-700` | Text and icons on light surfaces |

### 2.4 Contrast rules

- `blush-700` on white, canvas or `blush-100` is the only blush text colour that meets AA for normal text. Use it for eyebrows, badges and links on light surfaces.
- `blush-600` with **white** text is acceptable for a filled button. Do not use `blush-600` as text on `blush-100` or canvas.
- `blush-400` and `blush-500` are decorative. Do not use them for body text or small labels.
- `muted` on white passes AA; on tinted surfaces check the combined background.
- Blue links and primary buttons use `brand-600` on white or white on `brand-600`.

### 2.5 Gradients and washes

A gradient must read as light, not as a second brand colour. Use at most one decorative wash per viewport.

| Recipe | Implementation | Use |
| --- | --- | --- |
| App wash | `.app-wash` | Application shell; a very soft blush glow top-right and blue glow top-left over canvas |
| Hero wash | `.hero-wash` | Landing hero, auth, onboarding |
| Blush wash | `.blush-wash` | Auth panel and editorial sections |
| Warm selected row | `bg-gradient-to-r from-brand-50 via-white to-blush-50` | Active navigation, selected society |
| Warm card | `bg-gradient-to-br from-brand-50 via-white to-blush-50` | Dues summary, pink statistics |
| Primary CTA panel | `bg-gradient-to-br from-brand-600 to-brand-800` | High-emphasis panels with white text |
| Pink statistic | `bg-gradient-to-br from-blush-50 via-white to-brand-50/50` + `border-blush-200` + blurred blush blob | “Needs attention” metrics |

Rules:

- Never place long body copy on a gradient.
- Keep decorative gradients below text and away from small controls.
- Do not gradient every card. If a section already has a wash, its children should usually be white.
- Use red gradients only for real danger states, never blush.

### 2.6 Borders, elevation and highlights

- Ordinary surfaces: `1px` border in `line`; no shadow.
- Cards: `surface` background, `1px` border, `16px` radius.
- Overlays: shadow `soft`; raised menus and floating panels may use `lift`.
- Primary CTA panels may use `shadow-glow` (blue).
- A pink statistic adds a soft blurred blush blob in the top-right corner. Do not add a blob to every card.
- Selected rows use a warm gradient, a blush check, or both. Unselected rows stay neutral.

---

## 3. Typography

### Families

- **Plus Jakarta Sans** — all application UI: headings, navigation, controls, tables and data.
- **Instrument Serif** — editorial brand moments only: one italic phrase in a marketing hero or a warm section heading. Never use it for controls or data.

### Scale

| Role | Size | Line height | Weight | Use |
| --- | --- | --- | --- | --- |
| Eyebrow | 11px | 1.4 | 700, uppercase, `0.14em` tracking | One warm label above a page title; `blush-700` |
| Caption | 13px | 1.5 | 400–600 | Metadata, hints, table labels |
| Body | 15px | 1.6 | 400–600 | Default UI text, forms, cards |
| Section | 17px | 1.5 | 600 | Card and section headings |
| Title | 29px | 1.2 | 600 | Resident page titles |
| Page heading | 26px mobile / 30px desktop | 1.15 | 600 | Admin and resident page titles |
| Marketing display | 36–56px | 1.04–1.1 | 600 | Landing and auth headlines only |

Rules:

- Headings use `-0.02em` to `-0.04em` tracking.
- Do not use half-pixel sizes or all-capitals navigation.
- Use `tabular-nums` for money, counts, dates and table columns.
- Keep paragraph measure around 60–75 characters.
- Phone inputs are at least 16px on touch devices to prevent iOS zoom.

If a custom typography role is added, register it in `extendTailwindMerge` in `apps/web/src/lib/utils.ts`; otherwise a font-size class can incorrectly remove a text-colour class.

---

## 4. Space, layout and shape

### Spacing

The base unit is **4px**. Prefer 8, 12, 16, 20, 24, 32, 40 and 48.

- Page gutters: 16px mobile, 24px tablet, 32px desktop.
- Card padding: 16–20px mobile, 20–24px desktop.
- Section gap: 20–24px; page section gap: 32–40px.
- Form field gap: 12–16px.

### Shell

| Property | Value |
| --- | --- |
| Desktop sidebar | `256px` |
| Header height | `76px` |
| Content max width | `1280px` |
| Mobile quick nav | below `1024px` |
| Breakpoints | `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536` |

### Radii

| Token | Value | Use |
| --- | --- | --- |
| `radius-control` | 10px | Buttons, inputs, compact controls |
| `radius-panel` | 16px | Cards and panels |
| `radius-overlay` | 20px | Dialogs, sheets, menus |
| `xs / sm / md / lg / xl` | 4 / 6 / 8 / 10 / 12px | Fine-grained internal shapes |

### Shadows

- `shadow-soft` — menus, cards that float above the canvas.
- `shadow-lift` — dialogs and hover-lifted cards.
- `shadow-glow` — blue CTA panels only.

---

## 5. Icons

- Use **Lucide** on web and native. Do not mix icon families or filled/outline styles.
- Navigation and menu icons: **18–20px**, `strokeWidth 1.8`.
- Compact controls and account menu: **16px**.
- Standalone page actions: **20–24px**.
- Icon-only actions must have an accessible name.
- Decorative icons are `aria-hidden="true"`.
- Use the domain icon rather than a misleading substitute. All icons in one menu must share the same size and colour treatment.

---

## 6. Components

### Button

| Variant | Recipe | Use |
| --- | --- | --- |
| `primary` | `bg-brand-600 text-white hover:bg-brand-700` | One main action per area |
| `secondary` | `bg-brand-50 text-brand-700 border-brand-100` | Supportive action |
| `outline` | white, `line-strong` border | Neutral secondary action |
| `ghost` | transparent, hover canvas | Quiet action |
| `pink` | `bg-blush-600 text-white hover:bg-blush-700` | Rare festive/human CTA; never destructive |
| `blush` | `bg-blush-100 text-blush-700 border-blush-200` | Warm secondary action |
| `danger` | red fill, white text | Destructive action |
| `dangerSoft` | `bg-[#fdeced] text-[#c43d4d]` | Soft destructive action |
| `success` | `bg-mint-600 text-white` | Confirm/complete |
| `dark` | `bg-ink text-white` | High-contrast neutral |
| `link` | `text-brand-600` | Inline navigation |

Sizes: `xs 36px`, `sm 40px`, `md 44px`, `lg 48px`, `xl 56px`, `icon 44px`, `iconSm 40px`. Touch targets are at least 44px.

### Badge

Variants: `neutral`, `blue`, `pink`, `success`, `warning`, `danger`, `purple`, `outline`, `dark`.

Use `pink` for warm, non-error states: **Pinned**, **Inside**, **Committee**, amenity price, a waiting count. Use semantic red for denied/overdue/rejected.

### Stat

| Tone | Surface | Accent |
| --- | --- | --- |
| `neutral` | White | Muted icon |
| `blue` | `brand-50/60`, `brand-100` border | Blue icon |
| `pink` | Blush→white→blue gradient, `blush-200` border, blurred blush highlight | Blush icon |
| `green` | `mint-50/40`, mint border | Mint icon |
| `amber` | `amber-soft/60`, amber border | Amber icon |

Use `pink` for a warm attention metric (outstanding, vacant, waiting, satisfaction), not for hard errors.

### Page header

- Eyebrow: 11px, 700, uppercase, `0.14em`, `blush-700`.
- Title: 26px mobile / 30px desktop, 600, tight tracking.
- Description: 15px, `ink-soft`, max 2 columns.
- Actions: right-aligned on desktop, full-width wrap on mobile.

### Card

- White surface, 16px radius, 1px `line` border.
- Header: title 17px/600, optional description 15px muted, optional icon and action.
- Body: 16–24px padding.
- Do not nest cards more than one level deep.
- A card represents a repeated object or a distinct content region, not every block of text.

### Fields

- Use `Field`, `Input`, `Textarea`, `Select`.
- Labels are associated with inputs; hints and errors use `aria-describedby`.
- Errors set `aria-invalid` and red text; do not rely on colour alone.
- Touch inputs are 16px on coarse pointers.
- Checkbox and radio controls keep a visible focus ring.

### Dialogs and sheets

- Radix focus management, a title, a labelled close action, scrollable bounded body.
- Use `radius-overlay` and `shadow-lift`.
- Primary action at the end of the reading order; destructive actions use red, not blush.

### Tabs and navigation

- URL-backed page views use `QueryTabs`; local panels use Radix `Tabs`.
- Do not give ordinary navigation links tab semantics.
- Active navigation uses the warm gradient and `aria-current="page"`.
- Role filtering must run before every navigation representation renders. Visible navigation is never authorization.

### Charts

- Primary series: `brand-600` with a blue area gradient.
- Secondary series: slate `#8491a8`, dashed.
- Status colours are semantic; do not use blush for negative financial values.
- Include an accessible table and avoid animation-only communication.

---

## 7. Motion

| Token / pattern | Duration | Easing | Use |
| --- | --- | --- | --- |
| Colour and border | 150ms | ease | Hover, selected states |
| Progress width | 200ms | ease | Progress bars |
| Sheet/dialog | 250–300ms | ease-out | Overlays |
| Entrance (`animate-in-up`) | 550ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Page/section entrance |
| Fade (`animate-fade`) | 500ms | ease | Soft content reveal |
| Shimmer | 1.4s | ease infinite | Loading skeleton |
| Pulse ring | 2s | infinite | Live/emergency dot only |

- Motion explains state; it does not decorate idle UI.
- Respect `prefers-reduced-motion`: animations and smooth scrolling collapse to near-zero.
- Do not animate layout properties when a transform or opacity works.
- Do not animate every card on scroll.

---

## 8. Accessibility

- Focus ring: `2px solid brand-500`, `2px` offset.
- Body text meets AA; use `blush-700` for warm text.
- Every icon-only action has a name; decorative icons are hidden.
- Touch targets are at least 44×44px on coarse pointers.
- Preserve zoom, safe-area insets and keyboard order.
- Error messages are attached to fields, not only shown as colour.
- Charts and progress bars expose accessible names and values.
- Test desktop, tablet, phone, keyboard, long text and empty states.
- Browser viewport checks do not replace testing on real iOS and Android hardware.

---

## 9. Content and data

- Voice: calm, specific, kind. Use sentence case. Avoid hype and exclamation marks.
- Money: Indian rupees, `formatINR`, tabular numerals. State whether an amount is billed, collected or outstanding.
- Dates: Asia/Kolkata, `formatDate` / `formatDateTime`. State the range for “today”, “this month” and “last six months”.
- Empty states explain what will appear and the next action.
- Do not represent a demo integration, backup schedule or retention policy as live configuration.
- Marketing previews identify demo data explicitly.

---

## 10. Implementation

### Files

| Concern | File |
| --- | --- |
| Web tokens and utilities | `apps/web/src/app/globals.css` |
| Native tokens | `apps/mobile/lib/theme.ts` |
| Primitives | `apps/web/src/components/ui/primitives.tsx` |
| Fields | `apps/web/src/components/ui/field.tsx` |
| Client overlays | `apps/web/src/components/ui/client.tsx` |
| Shell and navigation | `apps/web/src/components/shell/*` |
| Brand assets | `brand/` and `apps/web/public/brand/` |

### Rules for new UI

1. Use tokens, not raw hex, for product UI.
2. Use `blush-700` for warm text on light surfaces.
3. Use `bg-blush-600 text-white` only for a filled pink action.
4. Keep one primary blue action per area.
5. Add blush where the screen has a warm moment: eyebrow, selected row, live state, attention stat or soft surface — not everywhere.
6. If you add a gradient, check text contrast and keep it below content.
7. Use Lucide, one icon size per menu or control group.
8. Register new typography roles in `extendTailwindMerge`.
9. Run `npm run check`, `npm run test:ui --workspace @mycommunity/web`, and `npm run build`.
10. Inspect the actual page at 1440px, 768px and 390px before calling it done.

### Definition of done

- The screen has a clear blue primary action and a readable neutral base.
- At least one intentional blush accent is present on primary screens.
- Pink is never used for errors or destructive actions.
- Focus, hover, disabled and pending states are visible and distinct.
- Long labels, long names, empty states and narrow widths do not break the layout.
- The implementation matches this document; if it does not, update the document or the code — not both in different directions.
