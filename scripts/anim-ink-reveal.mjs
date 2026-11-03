import { send } from "./craft-control.mjs";
import fs from "node:fs";

const ROOT = process.cwd();
const LAYERS = `${ROOT}/brand/source/anim`;
const OUT = `${ROOT}/brand/animations/frames/ink-reveal`;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let id = 1;
const run = async (command, params = {}) => {
  const r = await send(9877, { id: id++, method: "engine.execute", params: { command, params } });
  if (!r.ok) throw new Error(`${command}: ${r.error}`);
  return r.result;
};

await run("file.newProject");
const items = (await run("file.import", {
  paths: [`${LAYERS}/glyph.png`, `${LAYERS}/wordmark.png`],
})).items;
const [glyphItem, wordItem] = items;

const W = 1080, H = 1080, DUR = 3.3;
const comp = (await run("comp.new", { name: "Ink Reveal", width: W, height: H, frameRate: 30, duration: DUR })).comp;

const glyph = (await run("layer.addItem", { item: glyphItem, position: [540, 450], duration: DUR })).layer;
await run("prop.set", { layer: glyph, path: "transform/scale", value: [91.43, 91.43, 100] });

const pts = [
  [260, 750], [330, 735], [430, 715], [540, 755], [660, 735], [780, 670],
  [830, 560], [830, 430], [790, 300], [710, 210], [610, 160], [525, 190],
  [480, 235], [472, 247],
];
const inT = [], outT = [];
for (let i = 0; i < pts.length; i++) {
  const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
  const tx = (next[0] - prev[0]) / 9, ty = (next[1] - prev[1]) / 9;
  inT.push([-tx, -ty]); outT.push([tx, ty]);
}
const cubic = (a, b, c, d, u) => {
  const v = 1 - u;
  return [
    v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0],
    v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1],
  ];
};
const at = (seg, u) => cubic(
  pts[seg],
  [pts[seg][0] + outT[seg][0], pts[seg][1] + outT[seg][1]],
  [pts[seg + 1][0] + inT[seg + 1][0], pts[seg + 1][1] + inT[seg + 1][1]],
  pts[seg + 1], u,
);
const samples = [];
let arc = 0, last = at(0, 0);
for (let seg = 0; seg < pts.length - 1; seg++) {
  for (let j = 0; j <= 160; j++) {
    const u = j / 160;
    const p = at(seg, u);
    if (seg > 0 || j > 0) arc += Math.hypot(p[0] - last[0], p[1] - last[1]);
    samples.push({ d: arc, seg, u });
    last = p;
  }
}
const totalLen = arc;
function pointAt(fraction) {
  const target = Math.max(0, Math.min(1, fraction)) * totalLen;
  let lo = 0, hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].d < target) lo = mid + 1; else hi = mid;
  }
  const b = samples[lo], a = samples[Math.max(0, lo - 1)];
  const span = b.d - a.d || 1;
  const k = (target - a.d) / span;
  return at(b.seg, a.seg === b.seg ? a.u + (b.u - a.u) * k : b.u);
}

const t0 = 0.16, t1 = 2.0;

// the letter is revealed by a wide stroke that grows along the route
const matte = (await run("layer.newShape", { kind: "none", name: "Reveal Stroke", position: [0, 0] })).layer;
const mattePath = await run("shape.newPath", {
  layer: matte, vertices: pts, inTangents: inT, outTangents: outT,
  closed: false, space: "comp", fill: false, stroke: "#FFFFFF", strokeWidth: 190,
});
await run("prop.set", { layer: matte, path: "contents/group/contents/stroke/cap", value: 1 });
await run("prop.set", { layer: matte, path: "contents/group/contents/stroke/join", value: 1 });
await run("layer.addShapeItem", { layer: matte, kind: "trim", group: mattePath.group });
await run("effect.apply", { effect: "Gaussian Blur", layers: [matte] });
await run("prop.set", { layer: matte, path: "effects/#1/blurriness", value: 14 });
await run("prop.set", { layer: matte, path: "transform/anchor", value: [540, 450, 0] });
await run("prop.set", { layer: matte, path: "transform/position", value: [540, 450, 0] });
await run("layer.setTrackMatte", { layer: glyph, matte, kind: "alpha" });

// the ink line that leads the reveal
const thread = (await run("layer.newShape", { kind: "none", name: "Ink Line", position: [0, 0] })).layer;
const threadPath = await run("shape.newPath", {
  layer: thread, vertices: pts, inTangents: inT, outTangents: outT,
  closed: false, space: "comp", fill: false, stroke: "#EF7FA4", strokeWidth: 6,
});
await run("prop.set", { layer: thread, path: "contents/group/contents/stroke/cap", value: 1 });
await run("prop.set", { layer: thread, path: "contents/group/contents/stroke/join", value: 1 });
await run("layer.addShapeItem", { layer: thread, kind: "trim", group: threadPath.group });

// bake the line at 30 fps along the spline, one smooth speed curve
const FPS = 30;
const steps = Math.round((t1 - t0) * FPS);
const baked = [];
for (let k = 0; k <= steps; k++) {
  const raw = k / steps;
  const e = raw * raw * (3 - 2 * raw);
  const t = +(t0 + (t1 - t0) * raw).toFixed(4);
  await run("prop.addKey", { layer: thread, path: "contents/group/contents/trim/end", time: t, value: e * 100 });
  await run("prop.addKey", { layer: matte, path: "contents/group/contents/trim/end", time: t, value: e * 100 });
  baked.push(
    { layer: thread, prop: "contents/group/contents/trim/end", time: t },
    { layer: matte, prop: "contents/group/contents/trim/end", time: t },
  );
}
await run("keys.select", { keys: baked });
await run("keys.interpolation", { interpolation: "linear", spatial: "linear" });

// open the reveal to the full letter
await run("prop.addKey", { layer: matte, path: "contents/group/contents/stroke/width", time: 2.0, value: 190 });
await run("prop.addKey", { layer: matte, path: "contents/group/contents/stroke/width", time: 2.5, value: 1100 });

await run("prop.addKey", { layer: thread, path: "transform/opacity", time: 0, value: 0 });
await run("prop.addKey", { layer: thread, path: "transform/opacity", time: 0.14, value: 100 });
await run("prop.addKey", { layer: thread, path: "transform/opacity", time: 1.95, value: 100 });
await run("prop.addKey", { layer: thread, path: "transform/opacity", time: 2.4, value: 0 });

// the window switches on once the letter is whole
const windowLight = (await run("layer.newShape", {
  kind: "ellipse", name: "Window", size: [50, 34], fill: "#EF7FA4", position: [472, 247],
})).layer;
await run("prop.set", { layer: windowLight, path: "transform/scale", value: [0, 0, 100] });
await run("prop.addKey", { layer: windowLight, path: "transform/scale", time: 2.3, value: [0, 0, 100] });
await run("prop.addKey", { layer: windowLight, path: "transform/scale", time: 2.42, value: [112, 112, 100] });
await run("prop.addKey", { layer: windowLight, path: "transform/scale", time: 2.58, value: [100, 100, 100] });
await run("prop.addKey", { layer: windowLight, path: "transform/opacity", time: 0, value: 0 });
await run("prop.addKey", { layer: windowLight, path: "transform/opacity", time: 2.3, value: 0 });
await run("prop.addKey", { layer: windowLight, path: "transform/opacity", time: 2.35, value: 100 });

// wordmark
const word = (await run("layer.addItem", { item: wordItem, position: [540, 915], duration: DUR })).layer;
await run("prop.set", { layer: word, path: "transform/scale", value: [48.5, 48.5, 100] });
await run("prop.addKey", { layer: word, path: "transform/opacity", time: 2.55, value: 0 });
await run("prop.addKey", { layer: word, path: "transform/opacity", time: 2.9, value: 100 });
await run("prop.addKey", { layer: word, path: "transform/position", time: 2.55, value: [540, 945, 0] });
await run("prop.addKey", { layer: word, path: "transform/position", time: 2.9, value: [540, 885, 0] });

await run("keys.select", { keys: [
  { layer: matte, prop: "contents/group/contents/stroke/width", time: 2.0 }, { layer: matte, prop: "contents/group/contents/stroke/width", time: 2.5 },
  { layer: thread, prop: "transform/opacity", time: 0 }, { layer: thread, prop: "transform/opacity", time: 0.14 },
  { layer: thread, prop: "transform/opacity", time: 1.95 }, { layer: thread, prop: "transform/opacity", time: 2.4 },
  { layer: windowLight, prop: "transform/scale", time: 2.3 }, { layer: windowLight, prop: "transform/scale", time: 2.42 }, { layer: windowLight, prop: "transform/scale", time: 2.58 },
  { layer: windowLight, prop: "transform/opacity", time: 2.3 }, { layer: windowLight, prop: "transform/opacity", time: 2.35 },
  { layer: word, prop: "transform/opacity", time: 2.55 }, { layer: word, prop: "transform/opacity", time: 2.9 },
  { layer: word, prop: "transform/position", time: 2.55 }, { layer: word, prop: "transform/position", time: 2.9 },
]});
await run("keys.easyEase", { which: "both" });

await run("file.saveAs", { path: `${ROOT}/brand/source/nivaasa-ink-reveal.ecproj` });
console.log("comp", comp);

const q = await run("renderQueue.add", {
  comp, format: "png", output: `${OUT}/frame-[#####].png`,
  timeSpan: "comp", channels: "rgba", resolution: "full",
});
console.log("queued", q.frames);
const ren = await run("renderQueue.render", { wait: true });
console.log("rendered", ren.items?.[0]?.statusLabel);
