import { knClient, C } from "./brand-kn.mjs";

const ROOT = process.cwd();
const SVG = `${ROOT}/brand/svg`;
const PNG = `${ROOT}/brand/png`;
const vc = knClient(7979);

const boards = [];
async function board(name, x, y, w, h, draw, bg = null) {
  const index = boards.length;
  if (index === 0) await vc.run("artboard.setProps", { index: 0, name, x, y, width: w, height: h });
  else await vc.run("artboard.new", { name, x, y, width: w, height: h });
  boards.push({ name, x, y, w, h, index });
  if (bg) await vc.rect(x, y, w, h, bg, 0);
  const group = await draw({ x, y, w, h });
  if (group) {
    const [n] = await vc.inspect([group]);
    const b = n.bounds;
    await vc.move([group], x + w / 2 - (b.x + b.width / 2), y + h / 2 - (b.y + b.height / 2));
    await vc.name(group, name);
  }
  return index;
}
const idx = (name) => boards.find((b) => b.name === name).index;

async function horizontal({ x, y, w, h }, { ref, refH, markH, textSize, fill, dot, gap = 50 }) {
  const t = await vc.wordmark(0, 0, textSize, { fill, dot });
  const [tb] = await vc.inspect([t]);
  const m = await vc.placeMark(ref, refH, markH, 0, 0);
  const [mb] = await vc.inspect([m]);
  const total = mb.bounds.width + gap + tb.bounds.width;
  const left = x + (w - total) / 2;
  const cy = y + h / 2;
  await vc.move([m], left - mb.bounds.x, cy - (mb.bounds.y + mb.bounds.height / 2));
  await vc.move([t], left + mb.bounds.width + gap - tb.bounds.x, cy + textSize * 0.365);
  const g = await vc.group([m, t]);
  await vc.name(g, "Nivaasa lockup");
  return g;
}

async function stacked({ x, y, w, h }, ref, refH) {
  const cx = x + w / 2;
  const markH = 300;
  const markTop = y + 80;
  const m = await vc.placeMark(ref, refH, markH, cx - markH * 0.508, markTop);
  const textSize = 116;
  const baseline = markTop + markH + 74 + textSize * 0.73;
  const t = await vc.wordmark(0, baseline, textSize, { fill: C.ink, dot: C.blush });
  await vc.run("text.setStyle", { id: t, justify: "center" });
  const tg = await vc.text(0, baseline + 54, "COMMUNITY, IN ONE PLACE", { size: 10.5, style: "Medium", color: C.muted, tracking: 230 });
  await vc.run("text.setStyle", { id: tg, justify: "center" });
  const [tbn] = await vc.inspect([t]);
  await vc.move([t], cx - (tbn.bounds.x + tbn.bounds.width / 2), 0);
  const [tgn] = await vc.inspect([tg]);
  await vc.move([tg], cx - (tgn.bounds.x + tgn.bounds.width / 2), 0);
  const g = await vc.group([m, t, tg]);
  await vc.name(g, "Nivaasa stacked lockup");
  return g;
}

async function bilingual({ x, y, w, h }, ref, refH) {
  const markH = 200;
  const m = await vc.placeMark(ref, refH, markH, 0, 0);
  const [mb] = await vc.inspect([m]);
  const latinSize = 108;
  const kannadaSize = 64;
  const t = await vc.wordmark(0, 0, latinSize, { fill: C.ink, dot: C.blush });
  const [tb] = await vc.inspect([t]);
  const k = await vc.kannadaWord(0, 0, kannadaSize, C.ink);
  const [kb] = await vc.inspect([k]);
  const blockW = Math.max(tb.bounds.width, kb.bounds.width);
  const gap = 50;
  const total = mb.bounds.width + gap + blockW;
  const left = x + (w - total) / 2;
  const cy = y + h / 2;
  await vc.move([m], left - mb.bounds.x, cy - (mb.bounds.y + mb.bounds.height / 2));
  const blockLeft = left + mb.bounds.width + gap;
  const latinBaseline = cy - 6;
  const kannadaBaseline = latinBaseline + 66;
  await vc.move([t], blockLeft - tb.bounds.x, latinBaseline);
  await vc.move([k], blockLeft - kb.bounds.x, kannadaBaseline);
  const g = await vc.group([m, t, k]);
  await vc.name(g, "Nivaasa bilingual lockup");
  return g;
}

await vc.run("file.new", {
  name: "Nivaasa Logo", width: 480, height: 480, units: "Pixels",
  backgroundContents: "transparent", colorMode: "rgb",
});

// mark references
let colorRef, whiteRef, monoRef;
await board("Mark", 0, 0, 480, 480, async ({ x, y }) => {
  colorRef = await vc.mark(400);
  const [n] = await vc.inspect([colorRef]);
  await vc.move([colorRef], x + 240 - (n.bounds.x + n.bounds.width / 2), y + 240 - (n.bounds.y + n.bounds.height / 2));
  return colorRef;
});
await board("Mark White", 560, 0, 480, 480, async () => {
  whiteRef = await vc.mark(400, { glyph: C.surface, window: C.blush });
  return whiteRef;
});
await board("Mark Mono", 1120, 0, 480, 480, async () => {
  monoRef = await vc.mark(400, { glyph: C.ink, window: null });
  return monoRef;
});

await board("Lockup Light", 0, 600, 980, 340, (a) =>
  horizontal(a, { ref: colorRef, refH: 400, markH: 200, textSize: 132, fill: C.ink, dot: C.blush }));

await board("Lockup Reverse", 0, 1040, 980, 340, (a) =>
  horizontal(a, { ref: whiteRef, refH: 400, markH: 200, textSize: 132, fill: C.surface, dot: C.blush }), C.blue);

await board("Lockup Mono Black", 0, 1480, 980, 340, (a) =>
  horizontal(a, { ref: monoRef, refH: 400, markH: 200, textSize: 132, fill: "#000000", dot: "#000000" }));

await board("Lockup Mono White", 0, 1920, 980, 340, async (a) => {
  const whiteMono = await vc.mark(200, { glyph: "#FFFFFF", window: null });
  const t = await vc.wordmark(0, 0, 132, { fill: "#FFFFFF", dot: "#FFFFFF" });
  const [tb] = await vc.inspect([t]);
  const [mb] = await vc.inspect([whiteMono]);
  const total = mb.bounds.width + 50 + tb.bounds.width;
  const left = a.x + (a.w - total) / 2;
  const cy = a.y + a.h / 2;
  await vc.move([whiteMono], left - mb.bounds.x, cy - (mb.bounds.y + mb.bounds.height / 2));
  await vc.move([t], left + mb.bounds.width + 50 - tb.bounds.x, cy + 132 * 0.365);
  const g = await vc.group([whiteMono, t]);
  await vc.name(g, "Nivaasa lockup mono white");
  return g;
}, C.ink);

await board("Lockup Stacked", 1040, 600, 760, 800, (a) => stacked(a, colorRef, 400));

await board("Lockup Bilingual", 1040, 1480, 980, 360, (a) => bilingual(a, colorRef, 400));

await board("Wordmark", 2080, 0, 1200, 300, async (a) => {
  const g = await vc.wordmarkOutlined(170, { fill: C.ink, dot: C.blush });
  const [n] = await vc.inspect([g]);
  await vc.move([g], a.x + a.w / 2 - (n.bounds.x + n.bounds.width / 2), a.y + a.h / 2 - (n.bounds.y + n.bounds.height / 2));
  return g;
});

await board("Wordmark Kannada", 2080, 400, 1200, 320, async (a) => {
  const g = await vc.kannadaWordOutlined(140, C.ink, "Medium");
  const [n] = await vc.inspect([g]);
  await vc.move([g], a.x + a.w / 2 - (n.bounds.x + n.bounds.width / 2), a.y + a.h / 2 - (n.bounds.y + n.bounds.height / 2));
  return g;
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

for (const [name, file] of [
  ["Mark", "nivaasa-mark"],
  ["Mark White", "nivaasa-mark-white"],
  ["Mark Mono", "nivaasa-mark-mono"],
  ["Lockup Light", "nivaasa-logo-horizontal"],
  ["Lockup Reverse", "nivaasa-logo-horizontal-reverse"],
  ["Lockup Mono Black", "nivaasa-logo-horizontal-mono-black"],
  ["Lockup Mono White", "nivaasa-logo-horizontal-mono-white"],
  ["Lockup Stacked", "nivaasa-logo-stacked"],
  ["Lockup Bilingual", "nivaasa-logo-bilingual"],
  ["Wordmark", "nivaasa-wordmark"],
  ["Wordmark Kannada", "nivaasa-wordmark-kannada"],
]) await svg(name, file);

await png("Mark", "nivaasa-mark-1024", 1024);
await png("Mark", "nivaasa-mark-512", 512);
await png("Mark", "nivaasa-mark-128", 128);
await png("Mark White", "nivaasa-mark-white-512", 512);
await png("Lockup Light", "nivaasa-logo-horizontal-3200", 3200);
await png("Lockup Light", "nivaasa-logo-horizontal-1600", 1600);
await png("Lockup Reverse", "nivaasa-logo-horizontal-reverse-1600", 1600);
await png("Lockup Mono Black", "nivaasa-logo-horizontal-mono-black-1600", 1600);
await png("Lockup Mono White", "nivaasa-logo-horizontal-mono-white-1600", 1600);
await png("Lockup Stacked", "nivaasa-logo-stacked-1600", 1600);
await png("Lockup Bilingual", "nivaasa-logo-bilingual-1600", 1600);
await png("Wordmark", "nivaasa-wordmark-2400", 2400);
await png("Wordmark Kannada", "nivaasa-wordmark-kannada-2400", 2400);

const saved = await vc.run("file.saveAs", { path: `${ROOT}/brand/source/nivaasa-logo.vectorcraft` });
console.log("saved", saved.path, "boards", boards.length);
