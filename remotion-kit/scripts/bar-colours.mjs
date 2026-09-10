/**
 * Decides, per chapter, whether the caption bar may take that chapter's scene
 * colour or has to fall back to black.
 *
 *   node scripts/bar-colours.mjs <image-dir> <scene1> <scene2> ...
 *
 * ── Why this is measured and not chosen ──
 *
 * A scene-coloured bar is the nicest version when it reads: the colour change
 * lands on the section break, which is the job the scene colours were given.
 * But the bar sits ON the plate, and the plate is drawn in THAT SAME scene
 * colour — so on the chapters where the scene colour is the dominant field
 * rather than the furniture, the bar dissolves into its own background. That is
 * structural, not a tuning problem, and it is exactly what happened on ch9:
 * deep indigo bar, deep indigo room.
 *
 * ── What actually decides it: the OUTLINE, not the fill ──
 *
 * The first version of this gate compared the fill against the plate behind it
 * and failed six of nine chapters. That measurement was asking the wrong
 * question. The bar carries a HEAVY BLACK OUTLINE — which the depth rule
 * prescribes for the mid layer anyway — and the outline is what separates the
 * bar from the plate, whatever colour the plate is. With it, ch7 (night teal on
 * night teal) and ch8 (contrast 1.02, the worst on the episode) both read
 * cleanly.
 *
 * So the real risk is not the bar vanishing into the plate. It is the bar
 * vanishing into its own OUTLINE — a scene colour so dark it just looks like a
 * black bar, at which point the colour is doing nothing. That is what this
 * gates on. All six locked scene colours clear it, so on plates built to the
 * system the gate should never fire; it exists to catch an episode whose
 * palette drifts.
 *
 * Both numbers are reported. The sample window must match CaptionBar's
 * BAR_BOTTOM — if that moves, re-run.
 */

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const SCENE_COLOURS = {
  nightTeal: "#17494D",
  deepIndigo: "#23305E",
  rust: "#C0451F",
  plum: "#5B2A4E",
  sarkariGreen: "#3F6B4F",
  chaiBrown: "#7A4B2A",
};

/** must match CaptionBar */
const BAR_BOTTOM = 0.29;
const BAR_HEIGHT = 0.139;
/**
 * Minimum contrast between the bar fill and its own black outline. Below this
 * the "colour" is indistinguishable from a plain black bar. Not a WCAG number —
 * WCAG 4.5 is about reading text, and this is a filled shape.
 */
const MIN_VS_OUTLINE = 1.5;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]) => {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const [dir, ...scenes] = process.argv.slice(2);
if (!dir || !scenes.length) {
  console.error("usage: node scripts/bar-colours.mjs <image-dir> <scene> <scene> ...");
  process.exit(1);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => /^ch\d+.*\.png$/i.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

const out = [];
console.log(
  "chapter                scene         plate behind bar   vs plate   vs outline   bar\n"
);

files.forEach((f, i) => {
  const scene = scenes[i];
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));

  const y0 = Math.round(png.height * (1 - BAR_BOTTOM - BAR_HEIGHT));
  const y1 = Math.round(png.height * (1 - BAR_BOTTOM));
  const x0 = Math.round(png.width * 0.06);
  const x1 = Math.round(png.width * 0.94);

  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const k = (y * png.width + x) << 2;
      r += png.data[k];
      g += png.data[k + 1];
      b += png.data[k + 2];
      n++;
    }
  }
  const mean = [r / n, g / n, b / n].map(Math.round);

  const fill = hex(SCENE_COLOURS[scene]);
  const vsPlate = contrast(fill, mean);
  const vsOutline = contrast(fill, [0, 0, 0]);
  const use = vsOutline >= MIN_VS_OUTLINE ? scene : null;
  out.push(use);

  const swatch = `rgb(${mean.join(",")})`;
  console.log(
    `  ${f.padEnd(20)} ${scene.padEnd(13)} ${swatch.padEnd(18)} ${vsPlate
      .toFixed(2)
      .padStart(6)} ${vsOutline.toFixed(2).padStart(11)}     ${
      use ? scene : "BLACK (too dark to tell from its outline)"
    }`
  );
});

console.log(`\n${out.filter(Boolean).length} of ${out.length} chapters keep their scene colour.\n`);
console.log("paste into Root.tsx:");
console.log(out.map((s) => (s ? `"${s}"` : "null")).join(", "));
