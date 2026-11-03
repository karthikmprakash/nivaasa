import { send } from "./craft-control.mjs";
import fs from "node:fs";

const ROOT = process.cwd();
const LAYERS = `${ROOT}/brand/source/anim`;
const OUT = `${ROOT}/brand/animations/frames/light-reveal`;
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

const W = 1080, H = 1080, DUR = 3.8;
const comp = (await run("comp.new", { name: "Light Reveal", width: W, height: H, frameRate: 30, duration: DUR })).comp;

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

// sample the exact cubic the thread is drawn from
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

// arc-length table
const samples = [];
let arc = 0;
let last = at(0, 0);
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
  const u = a.seg === b.seg ? a.u + (b.u - a.u) * k : b.u;
  return at(b.seg, u);
}

const t0 = 0.22, t1 = 2.35;

// cumulative reveal: a wide stroke that grows along the route
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

// the thread of light that leads the reveal
const thread = (await run("layer.newShape", { kind: "none", name: "Light Thread", position: [0, 0] })).layer;
const threadPath = await run("shape.newPath", {
  layer: thread, vertices: pts, inTangents: inT, outTangents: outT,
  closed: false, space: "comp", fill: false, stroke: "#EF7FA4", strokeWidth: 8,
});
await run("prop.set", { layer: thread, path: "contents/group/contents/stroke/cap", value: 1 });
await run("prop.set", { layer: thread, path: "contents/group/contents/stroke/join", value: 1 });
await run("layer.addShapeItem", { layer: thread, kind: "trim", group: threadPath.group });

// the travelling light / final window
const light = (await run("layer.newShape", {
  kind: "ellipse", name: "Window Light", size: [50, 34], fill: "#EF7FA4",
  position: [pts[0][0], pts[0][1]],
})).layer;
const glow = (await run("layer.newShape", {
  kind: "ellipse", name: "Light Glow", size: [170, 120], fill: "#EF7FA4",
  position: [pts[0][0], pts[0][1]],
})).layer;
await run("effect.apply", { effect: "Gaussian Blur", layers: [glow] });
await run("prop.set", { layer: glow, path: "effects/#1/blurriness", value: 42 });
await run("prop.set", { layer: glow, path: "transform/opacity", value: 26 });

// bake the light along the spline: one smooth speed curve, no per-key easing
const FPS = 30;
const steps = Math.round((t1 - t0) * FPS);
const baked = [];
for (let k = 0; k <= steps; k++) {
  const raw = k / steps;
  const e = raw * raw * (3 - 2 * raw);           // smoothstep: gentle start and stop
  const [x, y] = pointAt(e);
  const t = +(t0 + (t1 - t0) * raw).toFixed(4);
  await run("prop.addKey", { layer: light, path: "transform/position", time: t, value: [x, y, 0] });
  await run("prop.addKey", { layer: glow, path: "transform/position", time: t, value: [x, y, 0] });
  await run("prop.addKey", { layer: thread, path: "contents/group/contents/trim/end", time: t, value: e * 100 });
  await run("prop.addKey", { layer: matte, path: "contents/group/contents/trim/end", time: t, value: e * 100 });
  baked.push(
    { layer: light, prop: "transform/position", time: t },
    { layer: glow, prop: "transform/position", time: t },
    { layer: thread, prop: "contents/group/contents/trim/end", time: t },
    { layer: matte, prop: "contents/group/contents/trim/end", time: t },
  );
}
await run("keys.select", { keys: baked });
await run("keys.interpolation", { interpolation: "linear", spatial: "linear" });

// scale of the light / window
await run("prop.addKey", { layer: light, path: "transform/scale", time: 0, value: [0, 0, 100] });
await run("prop.addKey", { layer: light, path: "transform/scale", time: 0.14, value: [70, 70, 100] });
await run("prop.addKey", { layer: light, path: "transform/scale", time: 2.3, value: [74, 74, 100] });
await run("prop.addKey", { layer: light, path: "transform/scale", time: 2.38, value: [100, 100, 100] });
await run("prop.addKey", { layer: light, path: "transform/scale", time: 2.52, value: [112, 112, 100] });
await run("prop.addKey", { layer: light, path: "transform/scale", time: 2.66, value: [100, 100, 100] });
await run("prop.addKey", { layer: light, path: "transform/opacity", time: 0, value: 0 });
await run("prop.addKey", { layer: light, path: "transform/opacity", time: 0.1, value: 100 });
await run("prop.addKey", { layer: glow, path: "transform/opacity", time: 0, value: 0 });
await run("prop.addKey", { layer: glow, path: "transform/opacity", time: 0.16, value: 26 });
await run("prop.addKey", { layer: glow, path: "transform/opacity", time: 2.35, value: 26 });
await run("prop.addKey", { layer: glow, path: "transform/opacity", time: 2.75, value: 0 });
await run("prop.addKey", { layer: thread, path: "transform/opacity", time: 0, value: 0 });
await run("prop.addKey", { layer: thread, path: "transform/opacity", time: 0.16, value: 90 });
await run("prop.addKey", { layer: thread, path: "transform/opacity", time: 2.3, value: 90 });
await run("prop.addKey", { layer: thread, path: "transform/opacity", time: 2.75, value: 0 });

// open the reveal to the full letter
await run("prop.addKey", { layer: matte, path: "contents/group/contents/stroke/width", time: 2.35, value: 190 });
await run("prop.addKey", { layer: matte, path: "contents/group/contents/stroke/width", time: 2.85, value: 1100 });

// wordmark
const word = (await run("layer.addItem", { item: wordItem, position: [540, 915], duration: DUR })).layer;
await run("prop.set", { layer: word, path: "transform/scale", value: [48.5, 48.5, 100] });
await run("prop.addKey", { layer: word, path: "transform/opacity", time: 2.82, value: 0 });
await run("prop.addKey", { layer: word, path: "transform/opacity", time: 3.18, value: 100 });
await run("prop.addKey", { layer: word, path: "transform/position", time: 2.82, value: [540, 945, 0] });
await run("prop.addKey", { layer: word, path: "transform/position", time: 3.18, value: [540, 885, 0] });

// ease only the non-baked keys
await run("keys.select", { keys: [
  { layer: light, prop: "transform/scale", time: 0 }, { layer: light, prop: "transform/scale", time: 0.14 },
  { layer: light, prop: "transform/scale", time: 2.3 }, { layer: light, prop: "transform/scale", time: 2.38 },
  { layer: light, prop: "transform/scale", time: 2.52 }, { layer: light, prop: "transform/scale", time: 2.66 },
  { layer: light, prop: "transform/opacity", time: 0 }, { layer: light, prop: "transform/opacity", time: 0.1 },
  { layer: glow, prop: "transform/opacity", time: 0 }, { layer: glow, prop: "transform/opacity", time: 0.16 },
  { layer: glow, prop: "transform/opacity", time: 2.35 }, { layer: glow, prop: "transform/opacity", time: 2.75 },
  { layer: thread, prop: "transform/opacity", time: 0 }, { layer: thread, prop: "transform/opacity", time: 0.16 },
  { layer: thread, prop: "transform/opacity", time: 2.3 }, { layer: thread, prop: "transform/opacity", time: 2.75 },
  { layer: matte, prop: "contents/group/contents/stroke/width", time: 2.35 }, { layer: matte, prop: "contents/group/contents/stroke/width", time: 2.85 },
  { layer: word, prop: "transform/opacity", time: 2.82 }, { layer: word, prop: "transform/opacity", time: 3.18 },
  { layer: word, prop: "transform/position", time: 2.82 }, { layer: word, prop: "transform/position", time: 3.18 },
]});
await run("keys.easyEase", { which: "both" });

await run("file.saveAs", { path: `${ROOT}/brand/source/nivaasa-light-reveal.ecproj` });
console.log("comp", comp, "baked", steps + 1, "frames along", totalLen.toFixed(0), "px");

const q = await run("renderQueue.add", {
  comp, format: "png", output: `${OUT}/frame-[#####].png`,
  timeSpan: "comp", channels: "rgba", resolution: "full",
});
console.log("queued", q.frames);
const ren = await run("renderQueue.render", { wait: true });
console.log("rendered", ren.items?.[0]?.statusLabel);
