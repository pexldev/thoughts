/**
 * Turns the two generated puppet plates into a usable rig.
 *
 *   node scripts/prep-puppet.js
 *
 * Reads  assets/incoming/head_v2.png       -> public/mascot/rig/head.png
 *        assets/incoming/mouths_v3.png     -> public/mascot/rig/m0..mN.png
 *        assets/incoming/bodies.png        -> public/mascot/rig/b0..b4.png
 *
 * Falls back to the v1 names when the v2 files are absent. v1 is kept on disk
 * but is NOT the rig: its head had a blank mouth patch that read as a muzzle at
 * rest, and its mouths were round. See PUPPET_RIG.md.
 *
 * Yellow goes to transparent by FLOOD FILL FROM THE BORDER, never a colour key.
 * His skin sits close enough to brand yellow in hue that a key punches holes
 * through his face; a border fill can only remove background that reaches an
 * edge, so a highlight sealed inside the drawing survives. Same reason
 * prep-layers.js works the way it does.
 *
 * THE MOUTHS ARE WRITTEN ONTO A SHARED CANVAS, not trimmed individually.
 * Six separately-trimmed PNGs each get their own origin, so swapping between
 * them makes the mouth jump around the face. Every mouth here lands on the same
 * canvas, centred horizontally, keeping its own height and vertical offset — so
 * the component drops all six at one anchor and they register.
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const YELLOW = [242, 255, 0];
const TOLERANCE = 110;

const IN = path.join(__dirname, "..", "assets", "incoming");
const OUT = path.join(__dirname, "..", "public", "mascot", "rig");
fs.mkdirSync(OUT, { recursive: true });

function near(d, i, target, tol) {
  const dr = d[i] - target[0], dg = d[i + 1] - target[1], db = d[i + 2] - target[2];
  return dr * dr + dg * dg + db * db < tol * tol;
}

/**
 * SEALED YELLOW IS STILL BACKGROUND.
 *
 * The border fill can only reach yellow that has an unbroken path to the edge
 * of the sheet. The gap between his legs does not: it is walled off by the two
 * trouser outlines and the ground-shadow line under his feet. Same for the gaps
 * between hair spikes, and the slivers between the shadow hatching.
 *
 * Left alone that cost ~7,000px per pose — a glowing acid-yellow slab standing
 * between his shins. On the yellow plate the whole rig was previewed against it
 * is invisible, which is exactly why it survived; drop him into a room and he
 * has a hole in him.
 *
 * The character contains no yellow at all — skin is orange, shirt grey, hair
 * and trousers black — so anything still strongly yellow after the border pass
 * is unreachable background by definition. Seeding a second fill from those
 * cores (at the same tolerance) clears the core AND crawls out through the
 * anti-aliased ring to the black outline, which a flat threshold would leave
 * behind as a yellow halo.
 */
function clearSealed(png) {
  const { width: W, height: H, data } = png;
  const stack = [];
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    // deliberately tighter than TOLERANCE: only unmistakable #F2FF00 may SEED.
    // His skin sits close to yellow in hue and seeding off a cheek would eat
    // his face — the loose tolerance is safe to spread with, not to start from.
    if (data[i + 3] > 40 && data[i + 1] > 200 && data[i] > 190 && data[i + 2] < 60) {
      stack.push(p);
    }
  }
  let cleared = 0;
  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    if (data[i + 3] === 0) continue;
    if (!near(data, i, YELLOW, TOLERANCE)) continue;
    data[i + 3] = 0;
    cleared++;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }
  console.log(`cleared ${cleared} sealed-yellow px`);
  return png;
}

/**
 * UN-MATTE THE EDGE PIXELS.
 *
 * Keying is binary — a pixel is background or it is not. But the drawing's
 * outlines and the hatching under his feet were ANTI-ALIASED against the yellow
 * plate, so their edge pixels are a genuine blend of black stroke and #F2FF00.
 * They survive the key (correctly — they are partly ink) still carrying the
 * yellow, which is why the shadow at his feet read as olive-green scribble on a
 * grey plate. ~3.5% of every body.
 *
 * Recolouring them to grey would be a hack. These are PARTIAL COVERAGE pixels
 * and the honest fix is to recover that coverage: for a dark stroke over
 * yellow, green runs 255 at no coverage to ~0 at full, so a = 1 - g/255. Undo
 * the blend for the colour and put the rest into the alpha channel. The stroke
 * comes back as what it was — black ink at partial opacity — and then composites
 * correctly over ANY plate instead of only over the one it was drawn on.
 *
 * Only near-neutral yellow-cast pixels qualify. His skin is orange (r-g ~90) so
 * it is excluded by the r/g test and never touched.
 */
function unMatte(png) {
  const { data } = png;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 40) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.abs(r - g) >= 25 || g - b <= 25) continue;
    const a = 1 - g / 255;
    if (a < 0.02) { data[i + 3] = 0; n++; continue; }
    for (let c = 0; c < 3; c++) {
      const v = (data[i + c] - (1 - a) * YELLOW[c]) / a;
      data[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
    data[i + 3] = Math.min(data[i + 3], Math.round(a * 255));
    n++;
  }
  console.log(`un-matted ${n} yellow-cast edge px`);
  return png;
}

/** Border-seeded flood fill to transparency. */
function keyOut(png) {
  const { width: W, height: H, data } = png;
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) {
    stack.push(x, (H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    stack.push(y * W, y * W + W - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    const i = p * 4;
    if (!near(data, i, YELLOW, TOLERANCE)) continue;
    seen[p] = 1;
    data[i + 3] = 0;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }
  return png;
}

function bbox(png, x0 = 0, x1 = png.width - 1) {
  const { width: W, height: H, data } = png;
  let bx0 = x1, bx1 = x0, by0 = H, by1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = x0; x <= x1; x++) {
      if (data[(y * W + x) * 4 + 3] > 40) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
  return by1 < 0 ? null : { x0: bx0, x1: bx1, y0: by0, y1: by1 };
}

function blit(src, box, dst, dx, dy) {
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      const s = (y * src.width + x) * 4;
      const tx = dx + (x - box.x0), ty = dy + (y - box.y0);
      if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) continue;
      const t = (ty * dst.width + tx) * 4;
      for (let c = 0; c < 4; c++) dst.data[t + c] = src.data[s + c];
    }
}

/* ---------------- head ---------------- */
function pick(...names) {
  for (const n of names) {
    const f = path.join(IN, n);
    if (fs.existsSync(f)) return f;
  }
  throw new Error(`none of ${names.join(", ")} found in ${IN}`);
}

const head = keyOut(PNG.sync.read(fs.readFileSync(pick("head_v2.png", "head_nomouth.png"))));
const hb = bbox(head);
const headOut = new PNG({ width: hb.x1 - hb.x0 + 1, height: hb.y1 - hb.y0 + 1 });
blit(head, hb, headOut, 0, 0);
fs.writeFileSync(path.join(OUT, "head.png"), PNG.sync.write(headOut));
console.log(`head.png  ${headOut.width}x${headOut.height}`);

/* ---------------- mouths ---------------- */
const strip = keyOut(PNG.sync.read(fs.readFileSync(pick("mouths_v3.png", "mouths_v2.png", "mouths.png"))));

/**
 * Yellow SEALED INSIDE a mouth is not background — it is the model leaving the
 * interior unpainted, and the border flood fill can never reach it because the
 * black outline walls it off. Left alone, the half-open mouth renders as a
 * glowing yellow slot in his beard.
 *
 * Anything still yellow after the keying pass is therefore interior, and gets
 * the dark the wide-open mouth already uses (#201810, measured off m3).
 */
const MOUTH_DARK = [32, 24, 16];
let filled = 0;
for (let i = 0; i < strip.data.length; i += 4) {
  if (strip.data[i + 3] > 40 && near(strip.data, i, YELLOW, TOLERANCE + 40)) {
    strip.data[i] = MOUTH_DARK[0];
    strip.data[i + 1] = MOUTH_DARK[1];
    strip.data[i + 2] = MOUTH_DARK[2];
    filled++;
  }
}
console.log(`filled ${filled} trapped-yellow interior px`);

/**
 * TAME THE TONGUE.
 *
 * The generated mouths come back with a big bright tongue filling most of the
 * opening, in almost exactly his skin hue. At feed size that is not a tongue,
 * it is a glowing blob inside his beard — and because it is the same family as
 * the face it reads as a hole rather than a mouth interior.
 *
 * Two corrections, both conservative:
 *   1. Only the bottom TONGUE_KEEP of an opening may be tongue. Above that line
 *      it becomes interior dark. A mouth is mostly shadow.
 *   2. What survives is pulled toward a muted maroon, away from skin.
 */
const TONGUE_KEEP = 0.34;
const TONGUE_COLOUR = [122, 58, 48];

/**
 * THE LOWER LIP — the thing that makes an opening a MOUTH instead of a hole.
 *
 * The generated mouths are a dark interior inside a BLACK outline. His beard is
 * also black. Composite one on the other and the outline vanishes into the
 * beard, leaving a dark shape with no edge — a hole punched in his face.
 *
 * The first attempt DILATED the whole silhouette and painted the ring skin
 * colour. That reads as a border drawn around a hole, and it was rejected on
 * sight, correctly: a uniform donut is not what lips look like. Lips are
 * ASYMMETRIC. Above the opening there is essentially nothing — the moustache
 * comes straight down to the lip line. Below it there is a full pad that is
 * thickest at the centre and tapers to nothing at the corners.
 *
 * So: no band on top at all, and a tapered pad hugging the bottom curve. It
 * scales with the mouth's own height, so the lip fattens as he opens — which is
 * what a lower lip does.
 */
const LIP_COLOUR = [233, 141, 44];
const LIP_EDGE = [150, 78, 24];
const LIP_MIN = 6;
const LIP_RATIO = 0.24;

function isTongue(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  return d[i + 3] > 40 && r > 150 && g > 70 && g < 165 && b < 110 && r - b > 70;
}


// column occupancy -> gaps -> segments
const cols = new Uint8Array(strip.width);
for (let x = 0; x < strip.width; x++)
  for (let y = 0; y < strip.height; y++)
    if (strip.data[(y * strip.width + x) * 4 + 3] > 40) { cols[x] = 1; break; }

const segs = [];
let start = -1;
for (let x = 0; x < strip.width; x++) {
  if (cols[x] && start < 0) start = x;
  if ((!cols[x] || x === strip.width - 1) && start >= 0) {
    segs.push([start, cols[x] ? x : x - 1]);
    start = -1;
  }
}
console.log(`found ${segs.length} mouth shapes`);

const boxes = segs.map(([a, b]) => bbox(strip, a, b)).filter(Boolean);
const canvasWRaw = Math.max(...boxes.map((b) => b.x1 - b.x0 + 1));
const unionY0 = Math.min(...boxes.map((b) => b.y0));
const unionY1 = Math.max(...boxes.map((b) => b.y1));

/**
 * THE LIP LINE IS THE FIRST MOUTH'S CENTRE, AND THE CANVAS IS PADDED TO PUT IT
 * DEAD CENTRE.
 *
 * v3's lens mouths open about a centre line rather than dropping from a fixed
 * top edge — the upper lip lifts a little too, which is what a real mouth does.
 * Anchoring those by their top edge makes the whole mouth jump UP as it opens,
 * because the widest shape starts highest on the canvas.
 *
 * So: find the closed mouth's centre, pad the canvas until that row is the
 * exact middle, and the component can anchor on a plain centre with no per-file
 * offsets to carry around.
 */
const rest = boxes[0];
const restCy = (rest.y0 + rest.y1) / 2 - unionY0;
const rawH = unionY1 - unionY0 + 1;
const padTop = Math.max(0, Math.round(rawH - 2 * restCy));
const padBottom = Math.max(0, Math.round(2 * restCy - rawH));
/**
 * The lip ring grows OUTWARD, so the canvas needs room for it or the widest
 * mouth gets its lip sliced off at the frame edge. Pad by the largest radius
 * any mouth will use, on all four sides, and keep the lip line centred.
 */
const maxR = Math.max(
  ...boxes.map((b) => Math.max(LIP_MIN, Math.round((b.y1 - b.y0 + 1) * LIP_RATIO)))
);
const canvasW = canvasWRaw + maxR * 2;
const canvasH = rawH + padTop + padBottom + maxR * 2;
console.log(`  lip line at ${restCy} of ${rawH} -> canvas ${canvasW}x${canvasH}, lip pad ${maxR}`);

boxes.forEach((b, i) => {
  const out = new PNG({ width: canvasW, height: canvasH, fill: true });
  out.data.fill(0);
  const dx = Math.round((canvasW - (b.x1 - b.x0 + 1)) / 2);
  const dy = b.y0 - unionY0 + padTop + maxR;
  blit(strip, b, out, dx, dy);

  // tongue pass, per mouth, measured against THIS mouth's own opening
  let ty0 = out.height, ty1 = -1;
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++)
      if (isTongue(out.data, (y * out.width + x) * 4)) {
        if (y < ty0) ty0 = y;
        if (y > ty1) ty1 = y;
      }
  if (ty1 >= 0) {
    const cut = ty1 - (ty1 - ty0) * TONGUE_KEEP;
    let darkened = 0;
    for (let y = 0; y < out.height; y++)
      for (let x = 0; x < out.width; x++) {
        const j = (y * out.width + x) * 4;
        if (!isTongue(out.data, j)) continue;
        if (y < cut) {
          out.data[j] = MOUTH_DARK[0];
          out.data[j + 1] = MOUTH_DARK[1];
          out.data[j + 2] = MOUTH_DARK[2];
          darkened++;
        } else {
          out.data[j] = TONGUE_COLOUR[0];
          out.data[j + 1] = TONGUE_COLOUR[1];
          out.data[j + 2] = TONGUE_COLOUR[2];
        }
      }
    console.log(`    m${i} tongue rows ${ty0}-${ty1}, darkened ${darkened}px above ${Math.round(cut)}`);
  }

  // lower lip: a tapered pad hugging the bottom of the opening, nothing on top
  const mh = b.y1 - b.y0 + 1;
  const lipMax = Math.max(LIP_MIN, Math.round(mh * LIP_RATIO));
  const W2 = out.width, H2 = out.height;
  const solid = new Uint8Array(W2 * H2);
  for (let k = 0; k < W2 * H2; k++) solid[k] = out.data[k * 4 + 3] > 40 ? 1 : 0;

  // bottom edge of the opening, per column
  const bottom = new Int32Array(W2).fill(-1);
  let mx0 = W2, mx1 = -1;
  for (let x = 0; x < W2; x++)
    for (let y = H2 - 1; y >= 0; y--)
      if (solid[y * W2 + x]) {
        bottom[x] = y;
        if (x < mx0) mx0 = x;
        if (x > mx1) mx1 = x;
        break;
      }

  const lip = new PNG({ width: W2, height: H2 });
  lip.data.fill(0);
  const cx = (mx0 + mx1) / 2;
  const hw = Math.max(1, (mx1 - mx0) / 2);
  for (let x = mx0; x <= mx1; x++) {
    if (bottom[x] < 0) continue;
    const t = Math.sqrt(Math.max(0, 1 - ((x - cx) / hw) ** 2)); // taper to the corners
    const thick = Math.round(lipMax * t);
    for (let d = 1; d <= thick; d++) {
      const y = bottom[x] + d;
      if (y >= H2) break;
      const j = (y * W2 + x) * 4;
      const edge = d > thick - 2;
      const col = edge ? LIP_EDGE : LIP_COLOUR;
      lip.data[j] = col[0];
      lip.data[j + 1] = col[1];
      lip.data[j + 2] = col[2];
      lip.data[j + 3] = 255;
    }
  }
  for (let k = 0; k < W2 * H2; k++)
    if (out.data[k * 4 + 3] > 40) {
      const j = k * 4;
      for (let c = 0; c < 4; c++) lip.data[j + c] = out.data[j + c];
    }

  fs.writeFileSync(path.join(OUT, `m${i}.png`), PNG.sync.write(lip));
  console.log(`  m${i}.png  ${b.x1 - b.x0 + 1}x${b.y1 - b.y0 + 1} on ${canvasW}x${canvasH}  lip pad ${lipMax}`);
});

/* ---------------- bodies ---------------- */
/**
 * Five full-length poses. Unlike the mouths these are NOT put on a shared
 * canvas — they are individually trimmed, and the component places each by its
 * own foot line. A shared canvas would only help if they were meant to swap in
 * place, and they are not: a pose change here is a CUT, not a substitution.
 *
 * Their heads carry a drawn-on mouth. That is fine and deliberate — bodies are
 * for wide shots, where a mouth is a handful of pixels and lip sync buys
 * nothing. Talking stays on the close-up head.
 */
const bodiesPath = path.join(IN, "bodies.png");
if (fs.existsSync(bodiesPath)) {
  const bodies = unMatte(clearSealed(keyOut(PNG.sync.read(fs.readFileSync(bodiesPath)))));

  const bcols = new Uint8Array(bodies.width);
  for (let x = 0; x < bodies.width; x++)
    for (let y = 0; y < bodies.height; y++)
      if (bodies.data[(y * bodies.width + x) * 4 + 3] > 40) { bcols[x] = 1; break; }

  const bsegs = [];
  let bstart = -1;
  for (let x = 0; x < bodies.width; x++) {
    if (bcols[x] && bstart < 0) bstart = x;
    if ((!bcols[x] || x === bodies.width - 1) && bstart >= 0) {
      // ignore slivers - the ground-shadow ticks sit apart from the figure
      if (x - bstart > bodies.width * 0.05) bsegs.push([bstart, bcols[x] ? x : x - 1]);
      bstart = -1;
    }
  }
  console.log(`found ${bsegs.length} body poses`);

  const POSE_LABELS = [
    "hands at sides",
    "arm out, explaining",
    "arms folded",
    "hands in pockets, leaning",
    "pointing off",
  ];

  const manifest = bsegs.map(([a, b], i) => {
    const box = bbox(bodies, a, b);
    const out = new PNG({ width: box.x1 - box.x0 + 1, height: box.y1 - box.y0 + 1 });
    out.data.fill(0);
    blit(bodies, box, out, 0, 0);
    fs.writeFileSync(path.join(OUT, `b${i}.png`), PNG.sync.write(out));
    console.log(`  b${i}.png  ${out.width}x${out.height}   aspect ${(out.width / out.height).toFixed(4)}`);
    return {
      src: `mascot/rig/b${i}.png`,
      label: POSE_LABELS[i] ?? `pose ${i}`,
      width: out.width,
      height: out.height,
      aspect: out.width / out.height,
    };
  });

  // The scene used to carry these aspects as hand-typed fractions, which go
  // stale the moment a sheet is recut — and a stale aspect does not throw, it
  // just quietly stretches him. Emit them instead.
  fs.writeFileSync(
    path.join(__dirname, "..", "src", "rig.bodies.json"),
    JSON.stringify({ poses: manifest }, null, 2) + "\n"
  );
  console.log(`  src/rig.bodies.json  ${manifest.length} poses`);
}
