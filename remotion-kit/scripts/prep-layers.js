/**
 * Prepares a layered scene set: background plates + isolated character cutouts.
 *
 *   node scripts/prep-layers.js <src-dir> <reel-name>
 *
 * Plates get the same yellow-snap + upscale as flat scenes. Character cutouts
 * additionally get flood-filled to transparency and trimmed, so they can be
 * placed and moved independently of the plate behind them.
 *
 * The flood fill runs from the border inward — NOT a colour key. His skin sits
 * close enough to the brand yellow in hue that a key punches holes through his
 * face; a border fill can only ever remove background that reaches the edge.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { PNG } = require("pngjs");

const BRAND = [242, 255, 0];
const SNAP_DISTANCE = 78;
const FILL_TOLERANCE = 96;

const [srcDir, reelName = "reel2"] = process.argv.slice(2);
if (!srcDir) {
  console.error("usage: node scripts/prep-layers.js <src-dir> <reel-name>");
  process.exit(1);
}

// stem -> [slot, kind]
const MAP = {
  "04d562b6-230d-41bf-bf86-3ac68aee381e": ["street", "plate"],
  "3b6fb883-4511-4e26-91de-b32a869558ff": ["basement", "plate"],
  "b57b7e28-a4b0-4326-9a5c-24598e211020": ["dicky", "plate"],
  "0d1a641d-dbd3-4040-a770-ef10364ba639": ["sayyes", "plate"],
  "fc9c25d9-059a-40ae-b9aa-75485dc81961": ["congrats", "plate"],

  "e1c8ac9c-c845-47bd-b885-8e1d20304d07": ["street", "char"],
  "5b98b85f-87cf-4e91-9ec7-876914ecf6fa": ["basement", "char"],
  "6ac22d42-45c3-4d60-935c-82656f42f3f4": ["dicky", "char"],
  "1bcdddaf-e658-4b43-9140-e1ee7487eada": ["sayyes", "char"],
  "9abf41a6-778d-44a9-947a-6c34ac74a32b": ["congrats", "char"],
};

const OUT = path.join(__dirname, "..", "public", "layers", reelName);
fs.mkdirSync(OUT, { recursive: true });

const dist = (a, b) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

function dominantYellow(img) {
  const counts = new Map();
  for (let i = 0; i < img.width * img.height; i += 7) {
    const d = i << 2;
    const [r, g, b] = [img.data[d], img.data[d + 1], img.data[d + 2]];
    if (r < 170 || g < 170 || b > 130) continue;
    const key = `${r >> 3},${g >> 3},${b >> 3}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!counts.size) return null;
  let best = null;
  let bestN = -1;
  for (const [k, n] of counts) if (n > bestN) [best, bestN] = [k, n];
  return best.split(",").map((v) => (Number(v) << 3) + 4);
}

function snapYellow(img, dom) {
  if (!dom) return 0;
  let n = 0;
  for (let i = 0; i < img.width * img.height; i++) {
    const d = i << 2;
    if (dist([img.data[d], img.data[d + 1], img.data[d + 2]], dom) > SNAP_DISTANCE) continue;
    img.data[d] = BRAND[0];
    img.data[d + 1] = BRAND[1];
    img.data[d + 2] = BRAND[2];
    n++;
  }
  return n;
}

/** Border-inward flood fill to alpha 0. Returns pixels cleared. */
function cutOut(img, dom) {
  const { width: w, height: h } = img;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (seen[i]) return;
    seen[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  let cleared = 0;
  while (stack.length) {
    const i = stack.pop();
    const d = i << 2;
    if (dist([img.data[d], img.data[d + 1], img.data[d + 2]], dom) > FILL_TOLERANCE) continue;
    img.data[d + 3] = 0;
    cleared++;
    const x = i % w;
    const y = (i / w) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  // Second pass for background walled off from the edge — the gap between his
  // legs, the gap under an arm. A plain global threshold is safe HERE because
  // an isolated character contains no yellow of his own: his skin sits ~141
  // away from the brand yellow and the tolerance is 96. Never run this over a
  // full scene, where the yellow field IS the picture.
  for (let i = 0; i < w * h; i++) {
    const d = i << 2;
    if (img.data[d + 3] === 0) continue;
    if (dist([img.data[d], img.data[d + 1], img.data[d + 2]], dom) > FILL_TOLERANCE) continue;
    img.data[d + 3] = 0;
    cleared++;
  }

  return cleared;
}

function trim(img) {
  const { width: w, height: h } = img;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (img.data[((y * w + x) << 2) + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  if (maxX < 0) return img;
  const nw = maxX - minX + 1;
  const nh = maxY - minY + 1;
  const out = new PNG({ width: nw, height: nh });
  for (let y = 0; y < nh; y++)
    for (let x = 0; x < nw; x++) {
      const s = ((y + minY) * w + (x + minX)) << 2;
      const d = (y * nw + x) << 2;
      for (let k = 0; k < 4; k++) out.data[d + k] = img.data[s + k];
    }
  return out;
}

/**
 * Yellow becomes black, black becomes yellow, everything else inverts.
 * NOT a CSS invert — inverting #F2FF00 gives blue, which is nowhere in this
 * brand. Transparency is preserved so a flipped character still cuts out.
 */
function brandFlip(img) {
  const out = new PNG({ width: img.width, height: img.height });
  for (let i = 0; i < img.width * img.height; i++) {
    const d = i << 2;
    const [r, g, b, a] = [img.data[d], img.data[d + 1], img.data[d + 2], img.data[d + 3]];
    let px;
    if (r > 170 && g > 170 && b < 130) px = [0, 0, 0];
    else if (r < 90 && g < 90 && b < 90) px = BRAND;
    else px = [255 - r, 255 - g, 255 - b];
    out.data[d] = px[0];
    out.data[d + 1] = px[1];
    out.data[d + 2] = px[2];
    out.data[d + 3] = a;
  }
  return out;
}

for (const [stem, [slot, kind]] of Object.entries(MAP)) {
  const src = path.join(srcDir, `${stem}.png`);
  if (!fs.existsSync(src)) {
    console.log(`MISSING  ${slot}_${kind}`);
    continue;
  }

  let img = PNG.sync.read(fs.readFileSync(src));
  const dom = dominantYellow(img);

  if (kind === "plate") {
    const snapped = snapYellow(img, dom);
    const tmp = path.join(OUT, `.${slot}.tmp.png`);
    fs.writeFileSync(tmp, PNG.sync.write(img));
    execSync(
      `ffmpeg -v error -y -i ${JSON.stringify(tmp)} -vf "scale=1080:1920:flags=lanczos" ${JSON.stringify(
        path.join(OUT, `${slot}_bg.png`)
      )}`
    );
    fs.unlinkSync(tmp);

    const flipTmp = path.join(OUT, `.${slot}_flip.tmp.png`);
    fs.writeFileSync(flipTmp, PNG.sync.write(brandFlip(img)));
    execSync(
      `ffmpeg -v error -y -i ${JSON.stringify(flipTmp)} -vf "scale=1080:1920:flags=lanczos" ${JSON.stringify(
        path.join(OUT, `${slot}_bg_flip.png`)
      )}`
    );
    fs.unlinkSync(flipTmp);

    console.log(
      `${slot}_bg`.padEnd(16) + `snapped ${((snapped / (img.width * img.height)) * 100).toFixed(1)}%`
    );
  } else {
    const px = img.width * img.height;
    const cleared = cutOut(img, dom);
    img = trim(img);
    fs.writeFileSync(path.join(OUT, `${slot}_char.png`), PNG.sync.write(img));
    fs.writeFileSync(path.join(OUT, `${slot}_char_flip.png`), PNG.sync.write(brandFlip(img)));
    console.log(
      `${slot}_char`.padEnd(16) +
        `cut ${((cleared / px) * 100).toFixed(1)}%  ->  ${img.width}x${img.height}`
    );
  }
}
