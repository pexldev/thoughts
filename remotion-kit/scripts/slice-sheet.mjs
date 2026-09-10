/**
 * Slices a generated SHEET into separate transparent PNGs.
 *
 *   node scripts/slice-sheet.mjs <sheet.png> <out-name> [--cols 3] [--rows 2] [--dir mascot]
 *
 * ── Why sheets at all ──
 *
 * Asking ChatGPT for the same character three times gives you three different
 * characters — a different room, a different chair, a slightly different man —
 * and cycling between them reads as a glitch rather than as animation. Asking
 * for ONE image containing all of them locks style, palette and character,
 * because the model drew them together. So everything multi-frame arrives as a
 * grid and gets cut up here.
 *
 * ── The white key, and why it is a flood fill ──
 *
 * The sheet comes on flat white. Keying every white pixel would also punch out
 * the whites INSIDE the drawing — the eyes first, which is the one place it is
 * unmissable, and then any highlight. So this floods in from the border and
 * only removes white that is CONNECTED to the edge. Interior white survives
 * because it is fenced in by his line work.
 *
 * Each cell is then trimmed to its own ink, so the drawings can be laid out by
 * height in the composition without inheriting the sheet's padding.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const argv = process.argv.slice(2);
const positional = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const [sheetPath, outName] = positional;
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};

if (!sheetPath || !outName) {
  console.error("usage: node scripts/slice-sheet.mjs <sheet.png> <out-name> [--cols 3] [--rows 2]");
  process.exit(1);
}

const COLS = Number(flag("cols", 3));
const ROWS = Number(flag("rows", 2));
const OUT_DIR = path.join(ROOT, "public", flag("dir", "mascot"));
/** how close to white counts as background. Generated "white" is never #FFFFFF. */
const WHITE = Number(flag("threshold", 236));
const KEY = flag("no-key", null) === null;

const sheet = PNG.sync.read(fs.readFileSync(sheetPath));
const cellW = Math.floor(sheet.width / COLS);
const cellH = Math.floor(sheet.height / ROWS);

fs.mkdirSync(OUT_DIR, { recursive: true });
console.log(`${sheet.width}x${sheet.height} -> ${COLS}x${ROWS} cells of ${cellW}x${cellH}\n`);

const isWhite = (png, i) =>
  png.data[i] >= WHITE && png.data[i + 1] >= WHITE && png.data[i + 2] >= WHITE;

let n = 0;
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    n++;
    const cell = new PNG({ width: cellW, height: cellH });

    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        const src = ((r * cellH + y) * sheet.width + (c * cellW + x)) << 2;
        const dst = (y * cellW + x) << 2;
        cell.data[dst] = sheet.data[src];
        cell.data[dst + 1] = sheet.data[src + 1];
        cell.data[dst + 2] = sheet.data[src + 2];
        cell.data[dst + 3] = 255;
      }
    }

    if (KEY) {
      // Flood from every border pixel that is white. Only background reachable
      // from outside the drawing is removed.
      const seen = new Uint8Array(cellW * cellH);
      const stack = [];
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= cellW || y >= cellH) return;
        const p = y * cellW + x;
        if (seen[p]) return;
        if (!isWhite(cell, p << 2)) return;
        seen[p] = 1;
        stack.push(p);
      };
      for (let x = 0; x < cellW; x++) {
        push(x, 0);
        push(x, cellH - 1);
      }
      for (let y = 0; y < cellH; y++) {
        push(0, y);
        push(cellW - 1, y);
      }
      while (stack.length) {
        const p = stack.pop();
        cell.data[(p << 2) + 3] = 0;
        const x = p % cellW;
        const y = (p / cellW) | 0;
        push(x + 1, y);
        push(x - 1, y);
        push(x, y + 1);
        push(x, y - 1);
      }
    }

    // trim to the ink
    let minX = cellW, minY = cellH, maxX = -1, maxY = -1;
    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        if (cell.data[((y * cellW + x) << 2) + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      console.log(`  ${n}. EMPTY — nothing but background in this cell`);
      continue;
    }

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const trimmed = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const src = ((y + minY) * cellW + (x + minX)) << 2;
        const dst = (y * w + x) << 2;
        trimmed.data[dst] = cell.data[src];
        trimmed.data[dst + 1] = cell.data[src + 1];
        trimmed.data[dst + 2] = cell.data[src + 2];
        trimmed.data[dst + 3] = cell.data[src + 3];
      }
    }

    const file = path.join(OUT_DIR, `${outName}_${n}.png`);
    fs.writeFileSync(file, PNG.sync.write(trimmed));
    console.log(`  ${n}. ${w}x${h}  ->  ${path.relative(ROOT, file)}`);
  }
}

console.log(`\n${n} cells. Aspect ratios (w/h), for laying them out:`);
