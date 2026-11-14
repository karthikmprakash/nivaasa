# Nivaasa · cinematic landing page — build spec

## 0. Brief
Build a full landing page (Hero → marquee → Day stage → Platform bento → Roles stack → Security → Open source → CTA → Footer) for **Nivaasa**, the open-source operating system for gated communities (RWAs, apartment complexes, townships). Visitor: a committee member or resident evaluating community software, plus developers who want to self-host.

- Aesthetic: **calm, owned, alive** — light canvas, ink type, royal-blue action, one blush accent, one deep-navy act.
- Signature idea: **"A day inside Verdant Heights"** — a pinned scroll stage where a clock runs 07:00→21:40, the stage light shifts dawn→day→dusk→night, and five real community events hand off around the clock. Second signature: the brand mark "write-on" animated webp in the final CTA.
- Output: single `landing/index.html`, inline CSS/JS, vanilla (no JS libs), Google Fonts CDN, media from the MotionSites shelf CDN + `../brand/` assets. Opens anywhere via file://.
- Fidelity: build exactly as specified; no extra sections or decorations.

## 1. Stack & files
- Single `index.html`: inline `<style>` + `<script>`, `document.documentElement.classList.add('js')` in `<head>`.
- Fonts (Google Fonts, pinned families): `Plus Jakarta Sans:wght@300;400;500;600;700;800` + `Instrument Serif:ital@0;1`, `display=swap`, preconnect to fonts.googleapis.com / fonts.gstatic.com (crossorigin).
- Icons: inline SVG (lucide-style strokes, 24 viewBox, stroke-width 2) — no emoji.
- No build step, no framework. GSAP not used; scroll choreography is vanilla rAF + CSS custom properties.

## 2. Fonts
| Role | Family | Weights | Used on |
|---|---|---|---|
| UI/body | Plus Jakarta Sans | 300–800 | everything |
| Display accent | Instrument Serif italic 400 | 400 ital | `<em>` accent words in H1/H2 |
| Mono (terminal) | ui-monospace stack | 400 | terminal card, clock |

## 3. Colour tokens (from brand/tokens + DESIGN.md)
```css
:root{
  --canvas:#F5F6F8; --surface:#FFFFFF; --ink:#131A2A; --ink-soft:#4B566C; --muted:#626E82;
  --line:#E3E7EE; --line-strong:#CBD2DF;
  --brand-50:#F2F5FF; --brand-100:#E7EDFF; --brand-200:#CFDBFF; --brand-300:#A9BEFF; --brand-400:#7795F7;
  --brand-500:#4F70E8; --brand-600:#3155D8; --brand-700:#2643B8; --brand-800:#223B94; --brand-900:#1E3274;
  --blush-50:#FFF5F8; --blush-100:#FDEAF0; --blush-200:#FBD2DF; --blush-300:#F6ABC4; --blush-400:#EF7FA4;
  --blush-500:#E55D8B; --blush-600:#CC3D71; --blush-700:#A82E5B;
  --mint-50:#EEFAF4; --mint-600:#18764E;
  --amber-soft:#FFF6E2; --amber-ink:#87530E;
  --night:#0F1C33;
  --ease-expo:cubic-bezier(.16,1,.3,1); --ease-quint:cubic-bezier(.22,1,.36,1); --ease-reveal:cubic-bezier(.25,.1,.25,1);
}
html,body{background:var(--canvas);color:var(--ink)}   /* first rule: no white flash */
::selection{background:rgba(49,85,216,.22)}
```

## 4. Global utilities
- `.glass` — `background:rgb(255 255 255/.72); backdrop-filter:blur(14px); border:1px solid rgb(255 255 255/.65)` (light page). Dark variant `.glass--dark` for the night section.
- `.eyebrow` — 12px, 700, uppercase, letter-spacing .18em, brand-600 with a leading 24px hairline.
- `h2 em`, `h1 em` — Instrument Serif italic, 1.06em, brand-600 (or blush-500 on hero), sharpen-in animation.
- Entrance vocabulary (rest state visible; hide only via `animation-fill-mode:both`): `.appear` 1.05s expo, `--d` delay; variants `--mask` (translateY(110%) inside overflow-hidden line), `--soft` (y 16), `--pop`, `--btn`, `--down` (nav, y −16). `.is-in` releases animation after `animationend`. Gate on `.fonts-ready` (document.fonts.ready + 1500ms failsafe).
- `[data-reveal]` — IO threshold .15, rootMargin `0px 0px -10% 0px`, once: opacity 0 / translate3d(var(--x,0), var(--y,30px), 0) → rest, .7s `--ease-reveal`, delay `--d`. Only hidden under `.js`.
- Grain: SVG fractal-noise data-URI layer, opacity .05, fixed, pointer-events none, z-index 90. (Kills banding on washes.)
- Reduced motion: all entrance/reveal animations off (final state), scroll scrub keeps mapping without smoothing, parallax off, marquee static, videos show first frame.

## 5. Assets
| Slot | Type | URL / path | Element | Behaviour | Fallback |
|---|---|---|---|---|---|
| hero visual | in-page product UI mock (no media) | n/a — the app's own dashboard mock (Verdant Heights admin home: stat cards, collections chart, gate/SLA tiles, attention list), same as the app landing hero | `.appmock` inside `.hero-frame`, white card | frame pops in `.appear--scale` d .45; chart bars grow via `[data-reveal]` IO | plain white card |
| security bg | MP4 loop | `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4` (shelf #52, city towers at dusk) | absolute bg, opacity .32, object-cover | autoplay muted loop; IO pause | night bg colour |
| CTA mark | animated WebP | `../brand/animations/nivaasa-mark-write-540.webp` | `<img width=150>` centered | plays on in-view (native animation); static frame if reduced motion | inline SVG mark |
| nav/footer mark | inline SVG | path from `brand/svg/nivaasa-mark.svg` (viewBox 0 0 480 480; blush ellipse + ink path; white variant for footer) | 30px nav disc, 36px footer | none | — |
| favicon | SVG | `../brand/svg/nivaasa-favicon.svg` | `<link rel="icon">` | — | — |

Art direction: hero video is bright green valley — sky top-left is the calm zone for the floating chip; subject (stream/hills) sits low-right. Security video: towers centre, sky top — copy sits left over a scrim.

## 6. Layers & root
Root: `overflow-x:clip`. z-ladder: section media 0 → scrims 1 → content 10 → sticky nav 50 → mobile menu 70 → grain 90.
Max content width 1180px, gutters 20px mobile / 40px desktop (`--gutter: clamp(20px, 4vw, 40px)`).

## 7. Navbar
Fixed top 16px, grid `1fr auto 1fr`, side padding var(--gutter).
- Left: white 46px circle disc (border line, shadow-sm) with ink mark 26px + wordmark "Nivaasa" (Jakarta 800, 19px, tracking −0.045em).
- Centre pill (hidden <860px): `.glass`, radius 999, padding 6px; links Platform / A day / Security / Open source — 14px 500 ink-soft, padding 8px 14px, radius 999, hover bg white/70 + ink; underline none. Active section highlight optional — skip.
- Right: primary pill "Open the demo" — bg brand-600, white, 14px 600, padding 11px 20px, radius 999, arrow ↗ in white/20 circle that rotates −45→0 on hover; hover bg brand-700 + translateY(-1px). Gains shadow when scrollY>40 (class on header).
- Mobile (<860px): 2-line burger (32×1.5px ink bars) in white circle 44px; overlay menu: fixed inset 0, canvas/85 blur 24, links 32px Jakarta 600 stacked, stagger 100+i·80ms, plus demo CTA; body scroll locked; Esc/link/resize closes; `inert` when closed.
- Entrance: `.appear--down` .8s.

## 8. Hero (first viewport; min-height 100svh, padding-top calc(96px + safe-area))
Grid `lg:grid-cols-[1.02fr_.98fr]` gap 48, align center.
- Eyebrow chip: inline-flex, white/80 blur, border line, radius 999, padding 8px 14px, 12.5px 600 ink-soft; blush dot 8px with one-time ping; text "Open source · Self-hosted · MIT licensed". `.appear--pop`, d .2s.
- H1: two masked lines. `font:600 clamp(44px,7.4vw,86px)/1.02 Jakarta; letter-spacing:-.045em; color:ink`.
  Line 1: `Your community,` Line 2: `running <em>beautifully.</em>` — em: Instrument Serif italic 400, 1.06em, color blush-500, `em-sharpen` 1.2s @ .9s (from opacity .35 blur 4). Lines `.appear--mask` d .35 / .5.
- Sub: 17px/1.6 ink-soft, max-width 470px, mt 22. "Security at the gate, calm at home, clarity in the accounts. Nivaasa is the open-source operating system for gated communities — self-hosted, no per-resident fees." `.appear--soft` d .68.
- CTAs (mt 28, flex gap 12, wrap): primary `.btn-primary` (see §10) "Explore the live demo" → `/login?demo=1`, d .82; secondary `.btn-glass` "See a day inside" with ↓ icon → `#day`, d .94.
- Proof row (mt 22): three items 13px 500 muted, mint check-circle SVG 15px: "Free to self-host" · "Your data, your server" · "Native iOS + Android apps". fade only, d 1.05.
- Right visual: `.hero-media` relative, `.appear--pop`-ish scale .96→1 d .45, 1.1s.
  - Frame: radius 28, border 1px line, overflow hidden, aspect-ratio 5/4.4 (≈), shadow `0 40px 90px -40px rgba(19,26,42,.35)`, bg brand-100. Video inside absolute cover, settle-zoom.
  - Top-left chip inside frame: glass pill "● Verdant Heights — demo community" 12px, live dot mint.
  - Floating card A (visitor approval): absolute, left −24px bottom −24px (mobile: left 8px bottom −18px), width 240px, `.glass` strong (white .9, blur 16), radius 18, padding 14, shadow; blush chip "Visitor approval · now"; row: avatar blush-100 "YS", "Yash Sharma" 13px 700, "Swiggy · A-402" 11.5px muted; buttons row: × / "Leave at gate" / "Approve" (mint-600 bg white text). data-depth 14.
  - Floating card B (payment): absolute right −18px top −20px, glass, radius 16, padding 10 14, flex: mint check circle 26px, "₹5,935 received" 13px 700, "UPI · receipt sent" 11.5px muted. data-depth 22. Hidden <480px? keep, smaller.
  - Pointer parallax on the two cards + media frame slight (depth 6), lerp .12, desktop hover only.
- Stats strip (mt 56, full width): grid 2×2 mobile / 4 cols, hairline top border, each cell padding 18 0: value Jakarta 300? use 600 30px tracking −.03em ink (count-up), label 12.5px muted. Values: `3` connected surfaces (web · iOS · Android) / `100%` data ownership / `0` per-resident licence fees / `1` command to self-host. Reveal stagger i·90ms.

## 9. Sections
### 9.1 Marquee strip
border-y line, bg surface, padding 18 0, overflow hidden. Track: flex gap 40, width max-content, animation marquee 26s linear infinite; two identical sets (aria-hidden on 2nd). Item: 15px 600 ink-soft + 7px blush diamond separator. Items: Gate & security, Community life, Payments & ERP, Helpdesk & SLAs, Amenities, Staff & vendors, Governance & audit. Reduced motion: no animation.

### 9.2 Day stage — SIGNATURE (`#day`)
`<section class="day" style="--runway:220vh">` + sticky `.day__stage` (top 0, height 100svh, overflow hidden, isolation isolate). A persistent bottom rail (`.day__rail`, 5 event chips: time + label) is always visible; items get `.is-done` (blush dot) / `.is-active` (blush pill) from scroll progress. Event windows overlap so 1–2 cards are visible at once; runway kept short (220vh) for information density.
- Stage bg: canvas; overlay div `.day__wash` with two radial washes (blush dawn top-left, brand day top-right) whose opacity/color are driven by `--day-t` (0..1); night overlay `.day__night` = night color, opacity `--night` (0→.92 via smoothstep .5→.95). Stage text color lerped ink→#F5F6F8 by JS (`--stage-fg`).
- Header row (top, within gutter): eyebrow "A day inside" + phase label right: `.day__phase` 13px 600 uppercase .14em, crossfades between Morning/Afternoon/Evening/Night (4 stacked spans, opacity by segment).
- Centre: clock `.day__clock` — Jakarta 300, clamp(76px,15vw,190px), tracking −.05em, tabular-nums, color var(--stage-fg); maps p→07:00–21:40. Under it: progress hairline 220px, 2px line white/20→fg/20 with blush dot at `--prog`%.
- 5 event cards `.ev` absolute, width 300px (mobile: bottom-centre stack, single active): glass (white .88 blur 16 border line radius 20 shadow soft padding 16). Contents: time chip (blush-100/blush-700 11px 700 uppercase) + title 15px 700 ink + sub 12.5px muted + status pill (mint-50/mint-600 or brand-50/brand-700). Windows (p): ev1 enter [.04,.10] exit [.20,.26]; ev2 [.22,.28]/[.38,.44]; ev3 [.40,.46]/[.56,.62]; ev4 [.58,.64]/[.74,.80]; ev5 [.76,.82]/[.90,.96]. active = enter·(1−exit) → per-card `--o`, `--x` (∓70px by side), `--y` (50px). Desktop positions: ev1 left 5% top 22%; ev2 right 5% top 18%; ev3 left 7% bottom 20%; ev4 right 7% bottom 24%; ev5 left 50% translateX(-50%) top 12%? — instead ev5 right 22% top 44%. Tune in fix loop. Mobile (<760px): all `.ev` at left 50% bottom 96px translateX(-50%), only max-active visible.
- Events: 08:12 Delivery approved — Yash Sharma · Swiggy → A-402 — Approved; 12:30 Poll closed — “Second EV charger in B2?” — 72% yes; 15:05 Payment received — ₹5,935 · UPI · receipt sent; 18:40 Patrol complete — 6/6 checkpoints · Gate 1; 21:10 Ticket resolved — “Lift stuck, B block” · SLA met.
- Copy line under header (centre-left on desktop): rotating phase blurb, e.g. Morning “The gate wakes up — deliveries and daily help check in.” etc. Implement as part of phase crossfade block near clock.
- JS: rAF on scroll, target = clamp(−rect.top, 0, runway−vh), smooth lerp .14 (snap if reduced), write ~10 CSS vars per frame; pointer parallax mx,my lerp .12 added to card transforms via `calc(var(--x) + var(--mx)*var(--depth)*1px)`. Clock text updates only on minute change. Reduced motion: no lerp (snap), no parallax.
- Section intro above runway? No — the stage IS the section; add a small floating hint "Scroll — 07:00" bottom-centre that fades out after p>0.05 (`.day__hint`).

### 9.3 Platform bento (`#platform`)
padding 140 0. Header: eyebrow "The platform"; H2 `The whole community, <em>one quiet system.</em>` (em brand-600) clamp(34px,4.6vw,56px) tracking −.04em lh 1.05; sub 16px ink-soft max-w 560. Grid mt 48: `lg:grid-cols-6` gap 16. Cards `.pcard` white radius 24 border line padding 26, hover translateY(-4px)+shadow-lift, transition .35s; `[data-reveal]` stagger i·90ms, scale .97.
- Card A (span 4): Gate & security — mini gate card (blush chip "At the gate · 2 min ago", YS row, 3 buttons) + right mini stats (Pre-approved passes 12 / Entries today 184 / Patrol 5/6).
- Card B (span 2, blush-50 bg, blush-200 border): Community — poll card with 3 bars that grow to width on `.is-in` (72/18/10%), "24 votes · owners only".
- Card C (span 2): Payments — gradient card brand-600→800 white text: "Total due · Nov" ₹5,935, "Pay with UPI" white pill; below mint row "Receipt ready instantly".
- Card D (span 2): Helpdesk — vertical timeline 3 steps with dots (2 mint done, 1 blush pending).
- Card E (span 2): Amenities — 4 icon tiles + slot chips (6:00–9:00, one active brand, one blush).
- Card F (span 3, bg #FBFCFF): Accounting — 3 stat cells Collections ₹18.6L (mint) / Expenses ₹9.8L (blush-700) / Balance ₹8.8L (brand-700), "Audit-ready" chip.
- Card G (span 3): Notices & discussions — moderated row card.
Each card: icon chip 40px radius 12 tinted bg + 20px stroke icon; h3 19px 700 tracking −.02em; p 14px/1.6 ink-soft.

### 9.4 Roles stack (`#roles`)
Header: eyebrow "One source of truth"; H2 `Three experiences. <em>One community.</em>`; right sub. Then `.stack` with 3 slots; each slot sticky top 0 height 100svh flex justify-center align-start padding-top calc(110px + i*26px); card width min(1080px, 100%), radius 32, border, min-height 68vh, padding 36, scale via JS (target 1−(n−1−i)*.035). Card bg: Resident → brand-50 border brand-200; Admin → white; Guard → night (white text). Inner: role chip, h3 26px, 3 feature rows (check icons), and a mini mock strip (resident: approval row; admin: 8 bars chart growing on reveal; guard: two big buttons Approve/Deny). Reveal bars on in-view.

### 9.5 Security (`#security`)
Dark sheet: margin-top −56, radius 56 56 0 0, bg night, overflow hidden, padding 140 0 120, position relative z 10. Video bg absolute cover opacity .32 + scrims (top night→transparent, bottom night). grid-paper overlay opacity .05.
Grid 2 cols gap 48: left eyebrow chip (glass dark "Security & governance"), H2 white `Built to be trusted, <em>not just used.</em>` (em blush-300) clamp(34px,4.4vw,54px); sub white/75 15.5px max-w 480; 4 glass-dark cards 2×2 (icon blush-300, t white 14.5 600, d white/65 12.5): Granular roles / Full audit trail / Private by default / Self-hosted.
Right: `.glass--dark` panel radius 24 padding 20: header "Live gate activity" + emerald live dot "Demo activity"; 4 rows (avatar initials circle white/10, name 13 600 white, type 11.5 white/60, status pill right + time): Sunita Devi · Daily help · A-402 · Entered (emerald) 8:12; Anil Kumar · Vendor · CoolCare · Approved (sky) 9:02; Yash Sharma · Delivery · Swiggy · At gate (blush) 9:38; Suresh Babu · Cab · Uber · Pending (amber) 9:45. Panic row: blush-400/10 border blush-400/25, BellRing icon, "Panic alert · A-503", blush pill "Acknowledge". Footer row: Fingerprint icon "Gate actions are recorded in the audit log". Rows `[data-reveal]` stagger.

### 9.6 Open source (`#open-source`)
White bg (surface), padding 140 0, border-y line. Grid 2 cols gap 56 align center.
Left: eyebrow "Open source, by design"; H2 `Software your community can <em>actually own.</em>`; sub; 4 points (icon + t + d) in 2×2: Readable TypeScript / One-command deploy (Docker) / Native apps included (Expo) / Your integrations (Razorpay/Stripe-ready). Buttons: "Star on GitHub" (night pill, GitHub SVG) → https://github.com/karthikmprakash/nivaasa ; "Read the docs" ghost → #.
Right: terminal card: night bg radius 20 border #24344F shadow; title bar with 3 dots + "terminal — nivaasa" mono 11 white/60; `<pre>` mono 12.5/1.9 white/70 with lines; `$` blush-300, `✓` emerald-300. Lines fade in staggered when in view (data-reveal on each line, --d i·90ms):
`# clone and run your community` / `$ git clone https://github.com/karthikmprakash/nivaasa` / `$ cd nivaasa && npm install && npm run setup` / `✓ DB seeded at data/nivaasa.db` / `✓ Web ready at http://localhost:3000` / `✓ Mobile ready with Expo` / `# demo: resident@nivaasa.app / demo1234`.
Below (full width, mt 56): 3 plan cards row (Self-hosted · Free / For your community · Your workspace (featured brand-600) / Explore first · Live demo) each with CTA link. [data-reveal] stagger.

### 9.7 CTA (`#cta`)
padding 150 0; centered; relative; bg canvas with dot-paper radial mask + soft brand-100/blush-50 washes. `<img src="../brand/animations/nivaasa-mark-write-540.webp" width="150" height="150">` (alt "Nivaasa mark drawing itself"), reveal pop. H2 clamp(38px,5.4vw,64px) `Bring your community <em>home.</em>` (em brand-600); sub 16px ink-soft max-w 520: "Step into a fully seeded demo community — approve a visitor, pay a bill, resolve a ticket."; CTAs: primary "Enter the demo community" → /login?demo=1; ghost "Self-host it" → #open-source; microcopy 12.5px muted "Demo logins on the sign-in page · no email required".

### 9.8 Footer
bg night, color white, padding 72 0 calc(40px+safe), radius 48 48 0 0? (sheet continues from CTA? keep simple square). Grid: brand col (white mark 34 + "Nivaasa" 800 20, tagline white/65 14 max-w 300, "Built for India · ready everywhere" with emerald dot) + 3 cols (Platform / Community / Open source) links 13.5 white/75 hover white. Bottom bar border-t white/10: © 2026 Nivaasa · MIT licence; right: Privacy · Security · Licence anchors.

## 10. Buttons & materials (verbatim)
```css
.btn-primary{display:inline-flex;align-items:center;gap:10px;background:var(--brand-600);color:#fff;
  font:600 14.5px/1 Jakarta;padding:15px 22px;border-radius:999px;text-decoration:none;
  box-shadow:0 16px 36px -14px rgba(49,85,216,.65);transition:transform .25s var(--ease-quint),background .2s,box-shadow .25s}
.btn-primary:hover{background:var(--brand-700);transform:translateY(-2px)}
.btn-primary:active{transform:scale(.97)}
.btn-primary .arr{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:rgb(255 255 255/.18);transition:transform .3s var(--ease-quint)}
.btn-primary:hover .arr{transform:translateX(3px)}
.btn-glass{...glass pill, ink text, hover bg white}
```
Focus-visible: `outline:2px solid var(--brand-500); outline-offset:3px` on all interactive.

## 11. Motion table
Default easing `--ease-expo`. Entrance completes by ~1.5s (nav .1 → chip .2 → H1 lines .35/.5 → sub .68 → CTAs .82/.94 → proof 1.05 → media .45 (1.1s) → stats 1.1+). Hovers ≤350ms. NOT animated: backgrounds, washes (except day-stage scroll-driven), no infinite pulses (live dots: single soft pulse ok at 2.4s), no shimmer.
Scroll: reveals once .7s; day stage scrub (lerp .14); stack scale scrub; marquee 26s linear; count-ups 1.6s easeOutCubic on IO threshold .25 (final value in HTML; JS zeroes only when animating).
Reduced motion: everything above off/snap; videos paused (poster/first frame); stage shows final frame mapping without smoothing.

## 12. Responsive
- Breakpoints: 640 / 860 (nav) / 1024 (hero grid, bento cols).
- Hero: <1024 stack — copy first, media below (aspect 16/10), floating cards kept but inset (left 10px / right 10px).
- Day stage <760: compact mode (single bottom card).
- Bento <1024: cards span full/half (`sm:grid-cols-2`, A spans 2).
- Stats 4→2×2 <720. Tap targets ≥44px. No horizontal scroll at 375px (`overflow-x:clip` on html,body; vw type clipped).
- 100svh everywhere with 100vh fallback; safe-area insets on nav padding-top and footer padding-bottom.

## 13. Constraints & acceptance
Do not: purple/indigo gradients, glow orbs, emoji icons, lorem ipsum, placeholder boxes, white flash, horizontal overflow, CSS transitions on `<video>`, hiding content without JS (`.js` gate), transforms left held after entrance (`.is-in` release).
Must: semantic landmarks (header/nav/main/section/footer), real `<title>` "Nivaasa — the open-source operating system for gated communities", alt text, aria on menu/video, focus states, prefers-reduced-motion, fonts gated entrance with 1.5s failsafe.
Acceptance (first viewport, 1440×900): floating glass nav (mark disc + 4 links + blue demo pill); left column eyebrow chip, three-line H1 with serif-italic blush "beautifully.", sub, blue pill + glass pill, 3-item proof row; right framed in-page product UI mock (Verdant Heights dashboard) with two floating glass cards (visitor approval bottom-left, ₹5,935 toast top-right) and caption below; stats hairline strip below.
