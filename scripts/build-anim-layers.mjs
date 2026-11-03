import { knClient, C } from "./brand-kn.mjs";
import fs from "node:fs";

const ROOT = process.cwd();
const OUT = `${ROOT}/brand/source/anim`;
fs.mkdirSync(OUT, { recursive: true });
const vc = knClient(7979);

const SIZE = 1024;
const H = 700;
const LEFT = (SIZE - H * 0.952) / 2;
const TOP = (SIZE - H) / 2;

const boards = [];
async function board(name, x, y, draw) {
  const index = boards.length;
  if (index === 0) await vc.run("artboard.setProps", { index: 0, name, x, y, width: SIZE, height: SIZE });
  else await vc.run("artboard.new", { name, x, y, width: SIZE, height: SIZE });
  boards.push({ name, index, x, y });
  await draw(x, y);
  return index;
}
const idx = (name) => boards.find((b) => b.name === name).index;

async function exportPng(name, file) {
  const r = await vc.run("document.export", {
    path: `${OUT}/${file}.png`, format: "png", artboard: idx(name), width: SIZE,
    background: "transparent", antiAlias: "art",
  });
  console.log(name, r.bytes);
}

await vc.run("file.new", {
  name: "Nivaasa Motion Layers", width: SIZE, height: SIZE,
  units: "Pixels", backgroundContents: "transparent", colorMode: "rgb",
});

await board("Glyph", 0, 0, async (x, y) => {
  const g = await vc.glyphShape(H, C.ink);
  const [n] = await vc.inspect([g]);
  await vc.move([g], x + LEFT - n.bounds.x, y + TOP - n.bounds.y);
});

await board("Window", 1200, 0, async (x, y) => {
  const gx = LEFT + 0.39 * (H * 0.952);
  const gy = TOP + 0.184 * H;
  const w = H * 0.952 * 0.0835;
  const h = H * 0.0557;
  const e = await vc.run("shape.ellipse", { x: x + gx - w / 2, y: y + gy - h / 2, width: w, height: h });
  await vc.run("paint.setFill", { id: e.id, color: C.blush });
  await vc.run("paint.setStroke", { id: e.id, none: true });
});

await board("Mark", 2400, 0, async (x, y) => {
  const m = await vc.mark(H);
  const [n] = await vc.inspect([m]);
  await vc.move([m], x + LEFT - n.bounds.x, y + TOP - n.bounds.y);
});

await exportPng("Glyph", "glyph");
await exportPng("Window", "window");
await exportPng("Mark", "mark");

const saved = await vc.run("file.saveAs", { path: `${ROOT}/brand/source/nivaasa-motion-layers.vectorcraft` });
console.log("saved", saved.path);
