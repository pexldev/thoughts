/**
 * Cuts the mascot poses out of brand_artefacts/mascot_character_sheet.png.
 *
 * Why a flood fill and not a chroma key: the mascot's skin tone sits close
 * enough to the sheet's yellow that a hue-distance key punches holes through
 * his face. A flood fill from the crop border only removes background that is
 * actually connected to the edge, so the skin is never at risk.
 *
 *   node scripts/extract-mascot.js
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const REPO = path.join(__dirname, "..", "..");
const SRC = path.join(REPO, "brand_artefacts", "mascot_character_sheet.png");
const OUT = path.join(__dirname, "..", "assets", "mascot");

// The sheet is NOT painted in the brand yellow — it's a shade off.
const SHEET_YELLOW = [233, 249, 22]; // #E9F916
const TOLERANCE = 60; // euclidean distance in RGB

// box: x, y, w, h on the 1122x1402 sheet. Boxes avoid the annotation arrows,
// the dead "SIDE EFFECTS OF THINKING" wordmark and the section rules.
//
// seeds: extra flood-fill start points, in box-local coords, for background
// pockets that are walled off from the border — the gap between his legs, the
// gap under an arm. The fill can't reach those from the edge on its own.
const POSES = {
  standing: { box: [212, 28, 212, 830], seeds: [[106, 620], [106, 700], [100, 300], [96, 360]] },
  bust: { box: [695, 82, 395, 275] },
  chin: { box: [572, 402, 148, 188] },
  mug: { box: [762, 400, 150, 190] },
  lookaway: { box: [947, 402, 142, 186] },
  sitting_floor: { box: [740, 660, 118, 220] },
  walking: { box: [858, 658, 96, 222], seeds: [[48, 170], [40, 190]] },
  sitting_chair: { box: [950, 658, 116, 222] },
  bust_yellow: { box: [44, 976, 132, 240] },
  bust_thumb: { box: [737, 990, 162, 224] },
};

const sheet = PNG.sync.read(fs.readFileSync(SRC));

const isBackground = (r, g, b) => {
  const dr = r - SHEET_YELLOW[0];
  const dg = g - SHEET_YELLOW[1];
  const db = b - SHEET_YELLOW[2];
  return Math.sqrt(dr * dr + dg * dg + db * db) <= TOLERANCE;
};

function extract(name, { box: [cx, cy, cw, ch], seeds = [] }) {
  const out = new PNG({ width: cw, height: ch });

  // copy the crop out of the sheet, fully opaque
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const s = ((cy + y) * sheet.width + (cx + x)) << 2;
      const d = (y * cw + x) << 2;
      out.data[d] = sheet.data[s];
      out.data[d + 1] = sheet.data[s + 1];
      out.data[d + 2] = sheet.data[s + 2];
      out.data[d + 3] = 255;
    }
  }

  // flood fill inward from every border pixel that reads as background
  const seen = new Uint8Array(cw * ch);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= cw || y >= ch) return;
    const i = y * cw + x;
    if (seen[i]) return;
    seen[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < cw; x++) {
    push(x, 0);
    push(x, ch - 1);
  }
  for (let y = 0; y < ch; y++) {
    push(0, y);
    push(cw - 1, y);
  }
  for (const [sx, sy] of seeds) push(sx, sy);

  let cleared = 0;
  while (stack.length) {
    const i = stack.pop();
    const d = i << 2;
    if (!isBackground(out.data[d], out.data[d + 1], out.data[d + 2])) continue;
    out.data[d + 3] = 0;
    cleared++;
    const x = i % cw;
    const y = (i / cw) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  // Drop floating debris: annotation arrows, stray wordmark letters, the thin
  // section rules off the sheet. After the fill those are isolated opaque
  // islands in transparent space, so "keep the big components" removes them
  // without any per-pose hand-tuning.
  const dropped = keepLargestComponents(out, cw, ch, 0.02);

  // Trim transparent margin so the figure is tight in its own frame. Without
  // this the crop's leftover padding decides where he sits, and a centred
  // placement renders visibly off-centre.
  const trimmed = trimTransparent(out, cw, ch);

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.png`), PNG.sync.write(trimmed.img));

  const pct = ((cleared / (cw * ch)) * 100).toFixed(1);
  console.log(
    `${name.padEnd(15)} ${trimmed.width}x${trimmed.height}`.padEnd(28) +
      `cleared ${pct}%` +
      (dropped ? `  ·  debris ${dropped}px` : "")
  );
  return { name, width: trimmed.width, height: trimmed.height };
}

/** Crops away fully transparent rows and columns around the figure. */
function trimTransparent(img, w, h) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (img.data[((y * w + x) << 2) + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return { img, width: w, height: h };

  const nw = maxX - minX + 1;
  const nh = maxY - minY + 1;
  const out = new PNG({ width: nw, height: nh });

  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const s = ((y + minY) * w + (x + minX)) << 2;
      const d = (y * nw + x) << 2;
      out.data[d] = img.data[s];
      out.data[d + 1] = img.data[s + 1];
      out.data[d + 2] = img.data[s + 2];
      out.data[d + 3] = img.data[s + 3];
    }
  }
  return { img: out, width: nw, height: nh };
}

/**
 * Erases every opaque connected component smaller than `minRatio` of the
 * largest one. Returns how many pixels were removed.
 */
function keepLargestComponents(img, w, h, minRatio) {
  const label = new Int32Array(w * h).fill(-1);
  const sizes = [];

  for (let i = 0; i < w * h; i++) {
    if (img.data[(i << 2) + 3] === 0 || label[i] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [i];
    label[i] = id;
    while (stack.length) {
      const j = stack.pop();
      size++;
      const x = j % w;
      const y = (j / w) | 0;
      const nbrs = [
        x > 0 ? j - 1 : -1,
        x < w - 1 ? j + 1 : -1,
        y > 0 ? j - w : -1,
        y < h - 1 ? j + w : -1,
      ];
      for (const n of nbrs) {
        if (n < 0 || label[n] !== -1) continue;
        if (img.data[(n << 2) + 3] === 0) continue;
        label[n] = id;
        stack.push(n);
      }
    }
    sizes.push(size);
  }

  if (!sizes.length) return 0;
  const biggest = Math.max(...sizes);
  const cutoff = biggest * minRatio;

  let removed = 0;
  for (let i = 0; i < w * h; i++) {
    const id = label[i];
    if (id === -1) continue;
    if (sizes[id] >= cutoff) continue;
    img.data[(i << 2) + 3] = 0;
    removed++;
  }
  return removed;
}

const dims = Object.entries(POSES).map(([name, cfg]) => extract(name, cfg));
console.log("\nASPECT map for src/components/Mascot.tsx:");
for (const d of dims) console.log(`  ${d.name}: ${d.width} / ${d.height},`);
