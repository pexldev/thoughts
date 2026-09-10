/**
 * Prepares generated scene images for a reel.
 *
 *   node scripts/prep-images.js <src-dir> <reel-name>
 *
 * Two jobs, both of which matter more than they sound:
 *
 * 1. SNAP THE YELLOW. Image generators land near the brand colour but never on
 *    it, and never twice the same — this batch came in at #F7F200, #F1ED01 and
 *    #FDF206. Full-bleed frames cutting between those flicker. Every pixel
 *    close to the frame's dominant yellow is forced to exact #F2FF00.
 *
 * 2. UPSCALE to the 1080x1920 the composition renders at.
 *
 * Mapping of image -> beat lives in MAP below, keyed by the beat its baked-in
 * text belongs to.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { PNG } = require("pngjs");

const BRAND = [242, 255, 0];

const [srcDir, reelName = "reel2", snapArg] = process.argv.slice(2);

/**
 * How far from the frame's dominant yellow a pixel can sit and still be
 * treated as background.
 *
 * 78 was tuned on reel2 and is DANGEROUS on warmer art: the corporate frames
 * draw the mascot's skin at rgb(247,181,40), which is only 67 away from that
 * batch's background — inside the ball, so his face and forearms were being
 * flattened to brand yellow. Real background noise never exceeded 14.
 *
 * Pass a third arg to override per batch. Keep it well below the closest
 * skin/ink tone in the art, and comfortably above the background's own spread.
 */
const SNAP_DISTANCE = snapArg ? Number(snapArg) : 78;
if (!srcDir) {
  console.error("usage: node scripts/prep-images.js <src-dir> <reel-name>");
  process.exit(1);
}

// filename stem -> the slot it fills, per reel.
// Keyed by reel name so each reel keeps its own mapping instead of this file
// being rewritten every time.
const MAPS = {
  reel2: {
    "c5283995-4046-4638-80f2-4daa44a0df93": "a_car",
    "1a18e699-601d-427a-84c3-da025b0136bc": "b_basement",
    "944b8b65-5d8c-4b5f-9eb1-57dc8f573211": "c_dicky",
    "b0268647-46a3-494d-b7cd-7ad773c69c2d": "d_sayyes",
    "14e8e439-4c22-498e-81e2-9289b781f9e7": "e_congrats",
  },
  // Corporate sermon, reel 1 — the recruiter block.
  corp1: {
    "24bb2642-d926-4293-8525-cc462c6b5196": "a_call",
    "c1e8aaf7-4380-4c46-bc57-7da56c1028f4": "b_brb",
    "83b2a9d7-0082-4efb-b208-28f070a001c6": "c_budget",
    "dc84295d-be85-4171-80ba-df5f1b613635": "d_back",
    "0fd24b05-f11b-4cbf-a8ad-da682bd8e687": "e_pto",
  },
  // Corporate sermon, reel 2 — the certification block.
  //
  // First batch built under the colour system (prep/color_system.md): anchor
  // "hero" on sarkari green, so unlike every earlier reel these frames are
  // NOT yellow-dominant — measured yellow runs 0.5%-7.2% of frame, and the
  // background is green, not yellow. Two consequences for this script:
  //
  //  - dominantYellow() still finds the right colour (the glowing object is
  //    unambiguously yellow) but it is voting on very few pixels
  //  - the default SNAP_DISTANCE of 78 is far too wide here. The mascot is lit
  //    BY the yellow object in every frame, so his face and forearms sit much
  //    closer to the background yellow than in the corp1 art. Run this batch
  //    at 20.
  corp2: {
    "5409299a-ca2b-43b4-9d93-614a3b83a1ad": "a_cert",
    "9402320a-aaab-449d-ad6f-ab1eea46e3e6": "b_door",
    "0a30094e-53bc-4538-b591-6d36b856b57c": "c_ai",
    "8df73157-753b-4536-bc5f-05421fadbeca": "d_manager",
    "d574f338-4a0a-4437-9478-021943abc745": "e_list",
    "84cbb34b-4abc-4299-a9d9-4cd235782737": "f_phone",
    "a122f2fb-f929-42dc-acdf-72a00e80d5fc": "g_ringlight",
  },
};

const MAP = MAPS[reelName];
if (!MAP) {
  console.error(`no image map for reel "${reelName}" — add one to MAPS in this file`);
  process.exit(1);
}

const OUT = path.join(__dirname, "..", "public", "images", reelName);
fs.mkdirSync(OUT, { recursive: true });

/**
 * The most common YELLOW in the frame.
 *
 * Deliberately not "the most common colour": the rainy-basement frame is
 * mostly black line work, so a plain dominant-colour pass picked #040404 and
 * snapped a third of the image to yellow. Only pixels that are already
 * unambiguously yellow get a vote.
 */
function dominantYellow(img) {
  const counts = new Map();
  for (let i = 0; i < img.width * img.height; i += 7) {
    const d = i << 2;
    const [r, g, b] = [img.data[d], img.data[d + 1], img.data[d + 2]];
    if (img.data[d + 3] === 0) continue;
    if (r < 170 || g < 170 || b > 130) continue;
    const key = `${r >> 3},${g >> 3},${b >> 3}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let best = null;
  let bestN = -1;
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = k;
    }
  }
  return best.split(",").map((v) => (Number(v) << 3) + 4);
}

for (const [stem, slot] of Object.entries(MAP)) {
  const src = path.join(srcDir, `${stem}.png`);
  if (!fs.existsSync(src)) {
    console.log(`MISSING  ${slot}  (${stem}.png)`);
    continue;
  }

  const img = PNG.sync.read(fs.readFileSync(src));
  const dom = dominantYellow(img);

  if (!dom) {
    console.log(`${slot.padEnd(12)} no yellow field found — copied through unchanged`);
  }

  let snapped = 0;
  for (let i = 0; i < img.width * img.height; i++) {
    const d = i << 2;
    const dr = img.data[d] - (dom ? dom[0] : -999);
    const dg = img.data[d + 1] - (dom ? dom[1] : -999);
    const db = img.data[d + 2] - (dom ? dom[2] : -999);
    if (!dom || Math.sqrt(dr * dr + dg * dg + db * db) > SNAP_DISTANCE) continue;
    img.data[d] = BRAND[0];
    img.data[d + 1] = BRAND[1];
    img.data[d + 2] = BRAND[2];
    snapped++;
  }

  // Brand-flip copy: yellow becomes black, black becomes yellow.
  //
  // NOT a CSS invert — inverting #F2FF00 gives blue, which is nowhere in this
  // brand. The flip has to be an explicit two-colour swap to land on the same
  // black the CTA card uses.
  const flip = new PNG({ width: img.width, height: img.height });
  for (let i = 0; i < img.width * img.height; i++) {
    const d = i << 2;
    const [r, g, b] = [img.data[d], img.data[d + 1], img.data[d + 2]];
    let px;
    if (r > 170 && g > 170 && b < 130) px = [0, 0, 0];
    else if (r < 90 && g < 90 && b < 90) px = BRAND;
    else px = [255 - r, 255 - g, 255 - b];
    flip.data[d] = px[0];
    flip.data[d + 1] = px[1];
    flip.data[d + 2] = px[2];
    flip.data[d + 3] = 255;
  }
  const flipTmp = path.join(OUT, `.${slot}_flip.tmp.png`);
  fs.writeFileSync(flipTmp, PNG.sync.write(flip));
  execSync(
    `ffmpeg -v error -y -i ${JSON.stringify(flipTmp)} -vf "scale=1080:1920:flags=lanczos" ${JSON.stringify(
      path.join(OUT, `${slot}_flip.png`)
    )}`
  );
  fs.unlinkSync(flipTmp);

  const tmp = path.join(OUT, `.${slot}.tmp.png`);
  fs.writeFileSync(tmp, PNG.sync.write(img));
  execSync(
    `ffmpeg -v error -y -i ${JSON.stringify(tmp)} -vf "scale=1080:1920:flags=lanczos" ${JSON.stringify(
      path.join(OUT, `${slot}.png`)
    )}`
  );
  fs.unlinkSync(tmp);

  const pct = ((snapped / (img.width * img.height)) * 100).toFixed(1);
  console.log(
    `${slot.padEnd(12)} was #${(dom||[0,0,0])
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")}  ->  #F2FF00 on ${pct}% of pixels`
  );
}
