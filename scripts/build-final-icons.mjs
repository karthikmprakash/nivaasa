import { knClient, C } from "./brand-kn.mjs";

const ROOT = process.cwd();
const SVG = `${ROOT}/brand/svg`;
const PNG = `${ROOT}/brand/png`;
const vc = knClient(7979);

const boards = [];
async function board(name, x, y, w, h, draw) {
  const index = boards.length;
  if (index === 0) await vc.run("artboard.setProps", { index: 0, name, x, y, width: w, height: h });
  else await vc.run("artboard.new", { name, x, y, width: w, height: h });
  boards.push({ name, index });
  return draw(x, y, w, h);
}
const idx = (name) => boards.find((b) => b.name === name).index;

async function icon(cx, cy, H, { glyph = C.surface, window = C.blush } = {}) {
  const m = await vc.mark(H, { glyph, window });
  const [n] = await vc.inspect([m]);
  await vc.move([m], cx - (n.bounds.x + n.bounds.width / 2), cy - (n.bounds.y + n.bounds.height / 2));
  return m;
}

async function lockupAt(left, centerY, markH, textSize, { glyph, window, fill, dot, gap = 44 }) {
  const m = await vc.mark(markH, { glyph, window });
  const [mb] = await vc.inspect([m]);
  await vc.move([m], left - mb.bounds.x, centerY - (mb.bounds.y + mb.bounds.height / 2));
  const t = await vc.wordmark(left + mb.bounds.width + gap, centerY + textSize * 0.365, textSize, { fill, dot });
  return { mark: m, text: t, width: mb.bounds.width + gap };
}

async function stackedAt(cx, top, markH, textSize, { glyph, window, fill, dot, tagline, taglineColor }) {
  const m = await vc.mark(markH, { glyph, window });
  const [mb] = await vc.inspect([m]);
  await vc.move([m], cx - (mb.bounds.x + mb.bounds.width / 2), top - mb.bounds.y);
  const baseline = top + markH + 64 + textSize * 0.73;
  const t = await vc.wordmark(cx, baseline, textSize, { fill, dot });
  await vc.run("text.setStyle", { id: t, justify: "center" });
  const ids = [m, t];
  if (tagline) {
    const tg = await vc.text(cx, baseline + 52, tagline, { size: 10.5, style: "Medium", color: taglineColor, tracking: 230 });
    await vc.run("text.setStyle", { id: tg, justify: "center" });
    ids.push(tg);
  }
  return vc.group(ids);
}

await vc.run("file.new", {
  name: "Nivaasa Icons", width: 1024, height: 1024, units: "Pixels",
  backgroundContents: "transparent", colorMode: "rgb",
});

// 0 — app icon, full bleed
await board("App Icon", 0, 0, 1024, 1024, async (x, y, w, h) => {
  await vc.rect(x, y, w, h, C.blue, 0);
  await icon(x + w / 2, y + h / 2, 620);
});

// 1 — rounded icon
await board("App Icon Rounded", 1200, 0, 1024, 1024, async (x, y, w, h) => {
  await vc.rect(x, y, w, h, C.blue, 230);
  await icon(x + w / 2, y + h / 2, 620);
});

// 2 — maskable
await board("Maskable", 2400, 0, 1024, 1024, async (x, y, w, h) => {
  await vc.rect(x, y, w, h, C.blue, 0);
  await icon(x + w / 2, y + h / 2, 470);
});

// 3 — favicon
await board("Favicon", 0, 1200, 512, 512, async (x, y, w, h) => {
  await vc.rect(x, y, w, h, C.blue, 115);
  await icon(x + w / 2, y + h / 2, 300);
});

// 4 — notification mono
await board("Notification Icon", 640, 1200, 512, 512, async (x, y, w, h) => {
  await icon(x + w / 2, y + h / 2, 430, { glyph: "#FFFFFF", window: null });
});

// 5 — avatar
await board("Avatar", 1280, 1200, 512, 512, async (x, y, w, h) => {
  await vc.rect(x, y, w, h, C.blue, 0);
  await icon(x + w / 2, y + h / 2, 330);
});

// 6 — banner
await board("Banner", 1920, 1200, 1500, 500, async (x, y, w, h) => {
  await vc.rect(x, y, w, h, C.canvas, 0);
  const wm = await vc.mark(380, { glyph: "#E7EDFF", window: "#FDEAF0" });
  const [wn] = await vc.inspect([wm]);
  await vc.move([wm], x + 1080 - wn.bounds.x, y + 60 - wn.bounds.y);
  const markH = 168;
  const textSize = 112;
  const lock = await lockupAt(x + 108, y + 186, markH, textSize, {
    glyph: C.ink, window: C.blush, fill: C.ink, dot: C.blush,
  });
  const tg = await vc.text(x + 108 + lock.width, y + 186 + textSize * 0.365 + 46, "COMMUNITY, IN ONE PLACE", {
    size: 10.5, style: "Medium", color: C.muted, tracking: 230,
  });
  await vc.name(tg, "Tagline");
});

// 7 — social post
await board("Post", 1920, 1900, 1080, 1080, async (x, y, w, h) => {
  await vc.rect(x, y, w, h, C.blue, 0);
  const g = await stackedAt(x + w / 2, y + 200, 320, 104, {
    glyph: C.surface, window: C.blush, fill: C.surface, dot: C.blush,
    tagline: "COMMUNITY, IN ONE PLACE", taglineColor: "#CFDBFF",
  });
  const [n] = await vc.inspect([g]);
  await vc.move([g], x + w / 2 - (n.bounds.x + n.bounds.width / 2), y + h / 2 - (n.bounds.y + n.bounds.height / 2));
});

// ---------- exports ----------
async function svg(name, file) {
  const r = await vc.run("document.export", {
    path: `${SVG}/${file}.svg`, format: "svg", artboard: idx(name),
    svg: { outlineText: true, responsive: true, decimals: 2, minify: true },
  });
  console.log("svg", file, r.bytes, r.warnings);
}
async function png(name, file, width) {
  const r = await vc.run("document.export", {
    path: `${PNG}/${file}.png`, format: "png", artboard: idx(name), width,
    background: "transparent", antiAlias: "art",
  });
  console.log("png", file, r.bytes);
}

await svg("App Icon", "nivaasa-icon-square");
await svg("App Icon Rounded", "nivaasa-icon");
await svg("Favicon", "nivaasa-favicon");
await svg("Avatar", "nivaasa-avatar");
await svg("Banner", "nivaasa-banner");
await svg("Post", "nivaasa-post");

await png("App Icon", "nivaasa-icon-1024", 1024);
await png("App Icon", "nivaasa-icon-512", 512);
await png("App Icon", "nivaasa-icon-192", 192);
await png("App Icon", "nivaasa-apple-touch-180", 180);
await png("App Icon Rounded", "nivaasa-icon-rounded-512", 512);
await png("Maskable", "nivaasa-icon-maskable-512", 512);
await png("Favicon", "nivaasa-favicon-180", 180);
await png("Favicon", "nivaasa-favicon-32", 32);
await png("Favicon", "nivaasa-favicon-16", 16);
await png("Notification Icon", "nivaasa-notification-96", 96);
await png("Notification Icon", "nivaasa-notification-24", 24);
await png("Avatar", "nivaasa-avatar-512", 512);
await png("Banner", "nivaasa-banner-1500", 1500);
await png("Post", "nivaasa-post-1080", 1080);

const saved = await vc.run("file.saveAs", { path: `${ROOT}/brand/source/nivaasa-icons.vectorcraft` });
console.log("saved", saved.path, boards.length);
