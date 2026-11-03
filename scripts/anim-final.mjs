import { send } from "./craft-control.mjs";
import fs from "node:fs";

const ROOT = process.cwd();
const ANIM = `${ROOT}/brand/animations`;
const WORK = `${ANIM}/frames`;
fs.mkdirSync(WORK, { recursive: true });
const LAYERS = `${ROOT}/brand/source/anim`;

let id = 1;
const run = async (command, params = {}) => {
  const r = await send(9877, { id: id++, method: "engine.execute", params: { command, params } });
  if (!r.ok) throw new Error(`${command}: ${r.error}`);
  return r.result;
};

await run("file.newProject");
const items = (await run("file.import", {
  paths: [`${LAYERS}/glyph.png`, `${LAYERS}/window.png`, `${LAYERS}/wordmark.png`],
})).items;
const [glyphItem, windowItem, wordItem] = items;

async function addMark(duration, { cx = 540, cy = 540, scale = 100 } = {}) {
  const glyph = (await run("layer.addItem", { item: glyphItem, position: [cx, cy], duration })).layer;
  const win = (await run("layer.addItem", { item: windowItem, position: [cx, cy], duration })).layer;
  if (scale !== 100) {
    for (const l of [glyph, win]) await run("prop.set", { layer: l, path: "transform/scale", value: [scale, scale, 100] });
  }
  return { glyph, win };
}

// ---------- 1. mark reveal ----------
const reveal = (await run("comp.new", { name: "Mark Reveal", width: 1080, height: 1080, frameRate: 30, duration: 2.4 })).comp;
{
  const { glyph, win } = await addMark(2.4);
  await run("prop.addKey", { layer: glyph, path: "transform/opacity", time: 0.05, value: 0 });
  await run("prop.addKey", { layer: glyph, path: "transform/opacity", time: 0.36, value: 100 });
  await run("prop.addKey", { layer: glyph, path: "transform/position", time: 0.05, value: [540, 568, 0] });
  await run("prop.addKey", { layer: glyph, path: "transform/position", time: 0.42, value: [540, 540, 0] });

  await run("prop.set", { layer: win, path: "transform/anchor", value: [438.5, 290.5, 0] });
  await run("prop.set", { layer: win, path: "transform/position", value: [466.5, 318.5, 0] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 0.42, value: [0, 0, 100] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 0.58, value: [118, 118, 100] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 0.7, value: [100, 100, 100] });
  await run("prop.addKey", { layer: win, path: "transform/opacity", time: 0.42, value: 0 });
  await run("prop.addKey", { layer: win, path: "transform/opacity", time: 0.46, value: 100 });

  await run("keys.select", { keys: [
    { layer: glyph, prop: "transform/opacity", time: 0.05 }, { layer: glyph, prop: "transform/opacity", time: 0.36 },
    { layer: glyph, prop: "transform/position", time: 0.05 }, { layer: glyph, prop: "transform/position", time: 0.42 },
    { layer: win, prop: "transform/scale", time: 0.42 }, { layer: win, prop: "transform/scale", time: 0.58 }, { layer: win, prop: "transform/scale", time: 0.7 },
    { layer: win, prop: "transform/opacity", time: 0.42 }, { layer: win, prop: "transform/opacity", time: 0.46 },
  ]});
  await run("keys.easyEase", { which: "both" });
}

// ---------- 2. logo reveal, horizontal ----------
const logo = (await run("comp.new", { name: "Logo Reveal", width: 1920, height: 1080, frameRate: 30, duration: 2.8 })).comp;
{
  const { glyph, win } = await addMark(2.8, { cx: 425, cy: 540, scale: 60 });
  await run("prop.addKey", { layer: glyph, path: "transform/opacity", time: 0.05, value: 0 });
  await run("prop.addKey", { layer: glyph, path: "transform/opacity", time: 0.4, value: 100 });
  await run("prop.addKey", { layer: glyph, path: "transform/position", time: 0.05, value: [425, 568, 0] });
  await run("prop.addKey", { layer: glyph, path: "transform/position", time: 0.45, value: [425, 540, 0] });

  await run("prop.set", { layer: win, path: "transform/anchor", value: [438.5, 290.5, 0] });
  await run("prop.set", { layer: win, path: "transform/position", value: [380.9, 407.1, 0] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 0.45, value: [0, 0, 100] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 0.62, value: [70.8, 70.8, 100] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 0.74, value: [60, 60, 100] });
  await run("prop.addKey", { layer: win, path: "transform/opacity", time: 0.45, value: 0 });
  await run("prop.addKey", { layer: win, path: "transform/opacity", time: 0.5, value: 100 });

  const word = (await run("layer.addItem", { item: wordItem, position: [1220, 540], duration: 2.8 })).layer;
  await run("prop.set", { layer: word, path: "transform/scale", value: [78.3, 78.3, 100] });
  await run("prop.addKey", { layer: word, path: "transform/opacity", time: 0.8, value: 0 });
  await run("prop.addKey", { layer: word, path: "transform/opacity", time: 1.15, value: 100 });
  await run("prop.addKey", { layer: word, path: "transform/position", time: 0.8, value: [1260, 540, 0] });
  await run("prop.addKey", { layer: word, path: "transform/position", time: 1.15, value: [1220, 540, 0] });

  await run("keys.select", { keys: [
    { layer: glyph, prop: "transform/opacity", time: 0.05 }, { layer: glyph, prop: "transform/opacity", time: 0.4 },
    { layer: glyph, prop: "transform/position", time: 0.05 }, { layer: glyph, prop: "transform/position", time: 0.45 },
    { layer: win, prop: "transform/scale", time: 0.45 }, { layer: win, prop: "transform/scale", time: 0.62 }, { layer: win, prop: "transform/scale", time: 0.74 },
    { layer: win, prop: "transform/opacity", time: 0.45 }, { layer: win, prop: "transform/opacity", time: 0.5 },
    { layer: word, prop: "transform/opacity", time: 0.8 }, { layer: word, prop: "transform/opacity", time: 1.15 },
    { layer: word, prop: "transform/position", time: 0.8 }, { layer: word, prop: "transform/position", time: 1.15 },
  ]});
  await run("keys.easyEase", { which: "both" });
}

// ---------- 3. seamless mark loop ----------
const loop = (await run("comp.new", { name: "Mark Loop", width: 1080, height: 1080, frameRate: 30, duration: 2 })).comp;
{
  const { win } = await addMark(2);
  await run("prop.set", { layer: win, path: "transform/anchor", value: [438.5, 290.5, 0] });
  await run("prop.set", { layer: win, path: "transform/position", value: [466.5, 318.5, 0] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 0, value: [100, 100, 100] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 1, value: [126, 126, 100] });
  await run("prop.addKey", { layer: win, path: "transform/scale", time: 2, value: [100, 100, 100] });
  await run("prop.addKey", { layer: win, path: "transform/opacity", time: 0, value: 100 });
  await run("prop.addKey", { layer: win, path: "transform/opacity", time: 1, value: 78 });
  await run("prop.addKey", { layer: win, path: "transform/opacity", time: 2, value: 100 });
  await run("keys.select", { keys: [
    { layer: win, prop: "transform/scale", time: 0 }, { layer: win, prop: "transform/scale", time: 1 }, { layer: win, prop: "transform/scale", time: 2 },
    { layer: win, prop: "transform/opacity", time: 0 }, { layer: win, prop: "transform/opacity", time: 1 }, { layer: win, prop: "transform/opacity", time: 2 },
  ]});
  await run("keys.easyEase", { which: "both" });
}

// ---------- 4. success check ----------
const success = (await run("comp.new", { name: "Success Check", width: 1080, height: 1080, frameRate: 30, duration: 1.8 })).comp;
{
  const circle = (await run("layer.newShape", { kind: "ellipse", name: "Circle", size: [340, 340], fill: "#3155D8", position: [540, 540] })).layer;
  await run("prop.addKey", { layer: circle, path: "transform/scale", time: 0.05, value: [0, 0, 100] });
  await run("prop.addKey", { layer: circle, path: "transform/scale", time: 0.34, value: [108, 108, 100] });
  await run("prop.addKey", { layer: circle, path: "transform/scale", time: 0.46, value: [100, 100, 100] });

  const check = (await run("layer.newShape", { kind: "none", name: "Check", position: [540, 540] })).layer;
  const p = await run("shape.newPath", { layer: check, vertices: [[-78, 0], [-18, 62], [92, -72]], closed: false, fill: false, stroke: "#FFFFFF", strokeWidth: 30, space: "layer" });
  await run("prop.set", { layer: check, path: "contents/group/contents/stroke/cap", value: 1 });
  await run("prop.set", { layer: check, path: "contents/group/contents/stroke/join", value: 1 });
  await run("layer.addShapeItem", { layer: check, kind: "trim", group: p.group });
  await run("prop.addKey", { layer: check, path: "contents/group/contents/trim/end", time: 0.38, value: 0 });
  await run("prop.addKey", { layer: check, path: "contents/group/contents/trim/end", time: 0.92, value: 100 });

  const dot = (await run("layer.newShape", { kind: "ellipse", name: "Spark", size: [54, 54], fill: "#EF7FA4", position: [675, 405] })).layer;
  await run("prop.addKey", { layer: dot, path: "transform/scale", time: 0.75, value: [0, 0, 100] });
  await run("prop.addKey", { layer: dot, path: "transform/scale", time: 0.9, value: [115, 115, 100] });
  await run("prop.addKey", { layer: dot, path: "transform/scale", time: 1.0, value: [100, 100, 100] });

  await run("keys.select", { keys: [
    { layer: circle, prop: "transform/scale", time: 0.05 }, { layer: circle, prop: "transform/scale", time: 0.34 }, { layer: circle, prop: "transform/scale", time: 0.46 },
    { layer: check, prop: "contents/group/contents/trim/end", time: 0.38 }, { layer: check, prop: "contents/group/contents/trim/end", time: 0.92 },
    { layer: dot, prop: "transform/scale", time: 0.75 }, { layer: dot, prop: "transform/scale", time: 0.9 }, { layer: dot, prop: "transform/scale", time: 1.0 },
  ]});
  await run("keys.easyEase", { which: "both" });
}

await run("file.saveAs", { path: `${ROOT}/brand/source/nivaasa-animations.ecproj` });
console.log("comps", { reveal, logo, loop, success });

// ---------- render alpha PNG sequences ----------
const jobs = [
  { comp: reveal, name: "mark-reveal" },
  { comp: logo, name: "logo-reveal" },
  { comp: loop, name: "mark-loop" },
  { comp: success, name: "success-check" },
];
for (const j of jobs) {
  const dir = `${WORK}/${j.name}`;
  fs.mkdirSync(dir, { recursive: true });
  const q = await run("renderQueue.add", {
    comp: j.comp, format: "png", output: `${dir}/frame-[#####].png`,
    timeSpan: "comp", channels: "rgba", resolution: "full",
  });
  console.log("queued", j.name, q.frames, q.width + "x" + q.height);
}
const ren = await run("renderQueue.render", { wait: true });
console.log("rendered", ren.items?.map((i) => [i.compName, i.statusLabel]).slice(-4));
