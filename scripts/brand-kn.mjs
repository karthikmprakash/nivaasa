import { client, C } from "./brand-lib.mjs";

export { C };

export const KANNADA_FONT = "Noto Sans Kannada";

export function knClient(port = 7979) {
  const vc = client(port);

  // Outlined Kannada "ನಿ" (ni), normalised so its ink box starts at (0, 0).
  async function glyphShape(size, color) {
    const id = await vc.text(0, 0, "ನಿ", { size: 400, style: "Black", color });
    await vc.run("text.setStyle", { id, font: KANNADA_FONT, style: "Black", size: 400, fill: color });
    await vc.run("select.set", { ids: [id] });
    const out = await vc.run("type.createOutlines", {});
    const g = await vc.group(out.ids);
    const [n] = await vc.inspect([g]);
    const k = size / n.bounds.height;
    await vc.run("object.scale", { ids: [g], sx: k * 100, sy: k * 100, origin: [n.bounds.x, n.bounds.y], strokes: true });
    const [n2] = await vc.inspect([g]);
    await vc.move([g], -n2.bounds.x, -n2.bounds.y);
    return g;
  }

  // The Nivaasa mark: the Kannada syllable ನಿ (ni), the first sound of
  // ನಿವಾಸ, with a warm light in the letter's window. H is the glyph height.
  async function mark(H, { glyph = C.ink, window = C.blush } = {}) {
    const g = await glyphShape(H, glyph);
    const ids = [];
    if (window) {
      const [gn] = await vc.inspect([g]);
      const gb = gn.bounds;
      const e = await vc.run("shape.ellipse", {
        x: gb.x + gb.width * 0.39 - gb.width * 0.04175,
        y: gb.y + gb.height * 0.184 - gb.height * 0.02785,
        width: gb.width * 0.0835,
        height: gb.height * 0.0557,
      });
      await vc.run("paint.setFill", { id: e.id, color: window });
      await vc.run("paint.setStroke", { id: e.id, none: true });
      ids.push(e.id);
      await vc.run("object.arrange.bringToFront", { ids: [g] });
    }
    ids.push(g);
    return vc.group(ids);
  }

  // Duplicate an existing mark group and scale it to a new height.
  async function placeMark(ref, refH, H, x, y) {
    const dup = (await vc.run("edit.duplicate", { ids: [ref], dx: 0, dy: 0 })).ids[0];
    const [n] = await vc.inspect([dup]);
    const k = H / refH;
    await vc.run("object.scale", { ids: [dup], sx: k * 100, sy: k * 100, origin: [n.bounds.x, n.bounds.y], strokes: true });
    const [n2] = await vc.inspect([dup]);
    await vc.move([dup], x - n2.bounds.x, y - n2.bounds.y);
    return dup;
  }

  async function wordmark(x, baseline, size, { fill = C.ink, dot = C.blush } = {}) {
    const id = await vc.text(x, baseline, "nivaasa.", { size, style: "ExtraBold", color: fill });
    await vc.run("text.setStyle", { id, tracking: -45 });
    await vc.run("text.setStyle", { id, fill: dot, start: 7, end: 8 });
    return id;
  }

  async function wordmarkOutlined(size, { fill = C.ink, dot = C.blush } = {}) {
    const id = await vc.text(0, 0, "nivaasa.", { size, style: "ExtraBold", color: fill });
    await vc.run("text.setStyle", { id, tracking: -45 });
    await vc.run("text.setStyle", { id, fill: dot, start: 7, end: 8 });
    await vc.run("select.set", { ids: [id] });
    const out = await vc.run("type.createOutlines", {});
    return vc.group(out.ids);
  }

  async function kannadaWord(x, baseline, size, color = C.ink, style = "Medium") {
    const id = await vc.text(x, baseline, "ನಿವಾಸ", { size, style, color });
    await vc.run("text.setStyle", { id, font: KANNADA_FONT, style, size, fill: color });
    return id;
  }

  async function kannadaWordOutlined(size, color = C.ink, style = "Medium") {
    const id = await vc.text(0, 0, "ನಿವಾಸ", { size, style, color });
    await vc.run("text.setStyle", { id, font: KANNADA_FONT, style, size, fill: color });
    await vc.run("select.set", { ids: [id] });
    const out = await vc.run("type.createOutlines", {});
    return vc.group(out.ids);
  }

  return { ...vc, mark, placeMark, wordmark, wordmarkOutlined, kannadaWord, kannadaWordOutlined, glyphShape };
}
