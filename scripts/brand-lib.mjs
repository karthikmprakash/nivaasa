import { send } from "./craft-control.mjs";

export const C = {
  canvas: "#F5F6F8",
  surface: "#FFFFFF",
  line: "#E3E7EE",
  ink: "#131A2A",
  muted: "#626E82",
  blue: "#3155D8",
  blueDeep: "#223B94",
  periwinkle: "#7795F7",
  blush: "#EF7FA4",
  blushLight: "#F6ABC4",
};

let nextId = 5000;

export function client(port = 7979) {
  const run = async (command, params = {}) => {
    const res = await send(port, { id: nextId++, method: "engine.execute", params: { command, params } });
    if (!res.ok) throw new Error(`${command}: ${res.error}`);
    return res.result;
  };

  const rect = async (x, y, w, h, color, radius = 0, stroke = null) => {
    const { id } = await run("shape.rectangle", { x, y, width: w, height: h, radius });
    await run("paint.setFill", { id, color });
    if (stroke) {
      await run("paint.setStroke", { id, color: stroke.color });
      await run("stroke.set", { ids: [id], weight: stroke.weight ?? 1 });
    } else await run("paint.setStroke", { id, none: true });
    return id;
  };

  const path = async (d, color) => {
    const { id } = await run("path.create", { d });
    await run("paint.setFill", { id, color });
    await run("paint.setStroke", { id, none: true });
    return id;
  };

  const text = async (x, y, value, { size = 14, style = "Medium", color = C.ink, tracking = null } = {}) => {
    const { id } = await run("text.create", { x, y, text: value, size, font: "Plus Jakarta Sans", style, color });
    if (tracking !== null) await run("text.setStyle", { id, tracking });
    return id;
  };

  const move = (ids, dx, dy) => run("object.move", { ids, dx, dy });
  const group = async (ids) => (await run("object.group", { ids })).id;
  const name = (id, value) => run("object.setProps", { id, name: value });
  const inspect = async (ids) => (await run("document.inspect", { ids, depth: 0 })).nodes;

  /**
   * The Nivaasa mark: two pillars and a warm diagonal.
   * `s` is a multiplier on the 128-unit grid; returns the object ids.
   */
  const mark = async (ox, oy, s, { stems = C.ink, slash = C.blush } = {}) => {
    const left = await rect(ox, oy, 30 * s, 128 * s, stems, 0);
    const right = await rect(ox + 98 * s, oy, 30 * s, 128 * s, stems, 0);
    const slashId = await path(
      `M ${ox + 30 * s} ${oy} H ${ox + 54 * s} L ${ox + 98 * s} ${oy + 128 * s} H ${ox + 74 * s} Z`,
      slash,
    );
    return [left, right, slashId];
  };

  const wordmark = async (x, y, size, { fill = C.ink, dot = C.blush, tracking = -45 } = {}) => {
    const id = await text(x, y, "nivaasa.", { size, style: "ExtraBold", color: fill, tracking });
    await run("text.setStyle", { id, fill: dot, start: 7, end: 8 });
    return id;
  };

  const lockup = async ({ artX, artY, artW, artH, markSize, textSize, gap, stems, slash, fill, dot, tagline = null }) => {
    const mx = artX + 120;
    const my = artY + 120;
    const markIds = await mark(mx, my, markSize / 128, { stems, slash });
    const t = await wordmark(mx + markSize + gap, my, textSize, { fill, dot });
    const [tb] = await inspect([t]);
    const b = tb.bounds;
    const dyText = my + markSize / 2 - (b.y + b.height / 2);
    await move([t], 0, dyText);
    const totalW = markSize + gap + b.width;
    const dx = artX + artW / 2 - (mx + totalW / 2);
    const dy = artY + artH / 2 - (my + markSize / 2);
    await move([...markIds, t], dx, dy);
    const ids = [...markIds, t];
    if (tagline) {
      const tg = await text(0, 0, tagline, { size: textSize * 0.105, style: "Medium", color: fill, tracking: 190 });
      const [gb] = await inspect([tg]);
      await move([tg], artX + artW / 2 - (gb.bounds.x + gb.bounds.width / 2), artY + artH / 2 + markSize / 2 + textSize * 0.55);
      ids.push(tg);
    }
    const g = await group(ids);
    await name(g, "Nivaasa lockup");
    return g;
  };

  return { run, rect, path, text, move, group, name, inspect, mark, wordmark, lockup };
}
