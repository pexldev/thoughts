"""
Registers a 4-up sheet of talking heads into a swappable set.

    python3 scripts/prep-heads.py            # build h0..h3
    python3 scripts/prep-heads.py --debug    # + write diagnostic sheets

Reads  assets/incoming/heads_4.png  ->  public/mascot/rig/h0..h3.png

WHY WHOLE HEADS INSTEAD OF A MOUTH OVERLAY
Six attempts at compositing a mouth onto a fixed face were rejected, and the
reason was always the same: a pasted shape does not belong to the drawing under
it. No amount of lip-ring, tongue or aperture tuning fixes that. Here the mouth
is drawn by the same hand as the face, so there is nothing to paste.

WHY THE SWAP STILL SHIMMERED, AND WHAT THIS SCRIPT NOW DOES ABOUT IT
The prompt asked for four heads identical but for the mouth. The generator did
not comply — it redrew the character four times. Measured on the registered
output, only 7-11% of the change between heads was the MOUTH. The other ~90%
was hair, glasses, ears, nose, beard edge, collar and shoulders. Swapping those
at 30fps does not animate a mouth, it redraws the man four times a second, and
that is the shimmer.

So the swap is no longer whole-head. Every output frame is head 0's face —
one drawing, frozen — with ONLY a soft-edged window over the mouth taken from
its sibling. That is not a return to the six failed pasted-mouth attempts:
those pasted a SEPARATE mouth sheet onto a BLANK patch, with nothing around it
to agree with. This lifts a mouth out of a sibling drawing WITH its own lips,
teeth, tongue, moustache and chin shadow, made by the same hand in the same
pass, and lands it in a registered position. Nothing is invented and nothing is
bare.

WHY ALIGNMENT NO LONGER ANCHORS ON THE EYES
It used to, on the theory that eyes are the one feature guaranteed not to move.
Measurement killed that: the eyes-and-glasses band was the LARGEST disagreement
in the set (mean 40-46, higher than the mouth region itself). The anchor was
measuring a moving target.

What actually has to line up is the SEAM — the ring of beard and skin where the
window meets the frozen face. So that is what is optimised directly: a search
over translation and scale that minimises difference in an annulus around the
mouth window. Align the seam and the seam disappears; nothing else has to agree
because nothing else is used.

WHY THIS ONE IS PYTHON WHEN THE REST OF scripts/ IS NODE
Sub-pixel affine resampling and a masked image search. pngjs cannot resize, and
hand-rolling bilinear in node to save a language is the wrong trade.
"""
import json
import math
import sys
from PIL import Image, ImageChops, ImageStat, ImageDraw, ImageFilter
from pathlib import Path
from collections import deque

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "incoming" / "heads_4.png"
OUT = ROOT / "public" / "mascot" / "rig"
DBG = ROOT / "out" / "rig-debug"
OUT.mkdir(parents=True, exist_ok=True)

DEBUG = "--debug" in sys.argv

N = 4
YELLOW = (242, 255, 0)
TOL = 118

# The mouth window, as fractions of the keyed head's own box. Generous on
# purpose: it has to hold the WIDEST aperture plus the chin shadow that drops
# with it, because a window that clips the open mouth puts a seam through the
# jaw. Feathering hides the edges, so paying for margin costs nothing.
MOUTH = (0.30, 0.415, 0.70, 0.60)   # x0, y0, x1, y1
# The eye window, same idea, for the optional blink sheet. Wide enough to take
# both lenses and their frames — a blink that moves the eyes but not the glasses
# sitting over them would tear.
EYES = (0.10, 0.235, 0.90, 0.45)
FEATHER = 14                        # px of blur on the window edge
SEAM = 26                           # px band outside the window that must match

# Search bounds. The sheet's own drift was measured at up to 6px and 4% scale.
COARSE_T, COARSE_STEP = 14, 2
COARSE_S = [0.96 + 0.005 * i for i in range(17)]

# ----------------------------------------------------------------- expression
# THE GENERATED MOUTH IS A FROWN, IN ALL FOUR APERTURES.
#
# The upper lip is drawn as a straight flat line and the lower lip bulges
# DOWNWARD, so the corners sit at or below the centre in every version. The
# aperture changes as he speaks but the emotional read never does — he sulks
# through the entire runtime no matter what the line says.
#
# Worth being exact about what is wrong, because it is NOT that he fails to
# smile: the house rule is that the mascot plays deadpan. But deadpan means
# NEUTRAL, and this is not neutral, it is sad. A downturned rest face editorialises
# every line it sits under.
#
# Fixed by warping rather than redrawing. The displacement is purely vertical and
# parabolic across the mouth — zero at the centre, maximum at the corners — which
# is what a smile geometrically IS. Gaussian falloff vertically and past the
# corners means the moustache travels with the lip (as it must, it is attached)
# while the beard edge, chin and nose never move.
#
# Measured on h0: the closed lip line sits at y=356, spanning x=182..263.
LIP_CX, LIP_Y, LIP_HW = 222.0, 356.0, 46.0
LIP_SIGMA, LIP_TAPER = 46.0, 26.0

# Baked expression sets. Every mood is the SAME four apertures, so lip sync is
# untouched by the choice — a mood is a mask over the whole shot, not a per-frame
# decision. Numbers are corner lift in px at the head's native 464px width.
MOODS = {
    "grim": -8,      # the line is the joke and he is not enjoying it
    "asbuilt": 0,    # what the generator drew. Kept so the old look is recoverable.
    "deadpan": 10,   # a genuinely FLAT mouth. This is the house default.
    "smirk": 18,     # he knows something you do not. The guru voice.
    "smile": 26,     # rare on purpose; it stops meaning anything if he wears it.
}
DEFAULT_MOOD = "deadpan"


def near(p, t=YELLOW, tol=TOL):
    return (p[0] - t[0]) ** 2 + (p[1] - t[1]) ** 2 + (p[2] - t[2]) ** 2 < tol * tol


def key_out(img):
    """Border-seeded flood fill. Never a colour key — his skin sits close enough
    to the yellow in hue that a key punches holes through his face. And yellow
    SEALED INSIDE an outline is not background: a fill can never reach it, which
    is what keeps a half-open mouth from rendering as a glowing slot."""
    img = img.convert("RGBA")
    W, H = img.size
    px = img.load()
    seen = bytearray(W * H)
    q = deque()
    for x in range(W):
        q.append((x, 0)); q.append((x, H - 1))
    for y in range(H):
        q.append((0, y)); q.append((W - 1, y))
    while q:
        x, y = q.popleft()
        i = y * W + x
        if seen[i]:
            continue
        p = px[x, y]
        if p[3] == 0 or not near(p):
            continue
        seen[i] = 1
        px[x, y] = (0, 0, 0, 0)
        if x > 0: q.append((x - 1, y))
        if x < W - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < H - 1: q.append((x, y + 1))
    return img


def clear_sealed(img, label=""):
    """SEALED YELLOW IS STILL BACKGROUND.

    The border fill only reaches yellow with an unbroken path to the sheet edge.
    The gaps between his hair spikes do not have one — they are walled off by the
    outline — so they survive as bright #F2FF00 specks in his hair. Invisible on
    the yellow plate the rig was previewed against; sparks on a room plate.

    He contains no yellow anywhere (skin orange, hair black, shirt grey), so
    anything still strongly yellow after the border pass is unreachable
    background. Seed a second fill from those cores and let it spread at the
    normal tolerance, which clears the anti-aliased ring too — a flat threshold
    would leave that behind as a halo."""
    W, H = img.size
    px = img.load()
    q = deque()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            # tighter than TOL to SEED: his skin is close to yellow in hue and
            # seeding off a cheek would eat his face. Loose is safe to spread.
            if a > 40 and g > 200 and r > 190 and b < 60:
                q.append((x, y))
    n = 0
    while q:
        x, y = q.popleft()
        p = px[x, y]
        if p[3] == 0 or not near(p):
            continue
        px[x, y] = (0, 0, 0, 0)
        n += 1
        if x > 0: q.append((x - 1, y))
        if x < W - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < H - 1: q.append((x, y + 1))
    print(f"  cleared {n} sealed-yellow px {label}")
    return img


def un_matte(img, label=""):
    """UN-MATTE THE EDGE PIXELS.

    Keying is binary, but the linework was ANTI-ALIASED against the yellow
    plate: its edge pixels are a real blend of black stroke and #F2FF00. They
    survive the key (correctly — they are partly ink) still carrying yellow,
    which puts a green-gold rim around him on any non-yellow plate.

    They are PARTIAL COVERAGE pixels, so recover the coverage rather than
    recolour: for a dark stroke over yellow, green runs 255 at no coverage to ~0
    at full, so a = 1 - g/255. Undo the blend for colour, put the rest in alpha.
    The stroke returns as what it was — ink at partial opacity — and composites
    over ANY plate instead of only the one it was drawn on.

    Only near-neutral yellow-cast pixels qualify; his skin is orange (r-g ~90)
    and is excluded by the r/g test."""
    W, H = img.size
    px = img.load()
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 40 or abs(r - g) >= 25 or g - b <= 25:
                continue
            cov = 1 - g / 255
            if cov < 0.02:
                px[x, y] = (0, 0, 0, 0)
                n += 1
                continue
            out = tuple(
                max(0, min(255, round((c - (1 - cov) * yc) / cov)))
                for c, yc in zip((r, g, b), YELLOW)
            )
            px[x, y] = out + (min(a, round(cov * 255)),)
            n += 1
    print(f"  un-matted {n} yellow-cast edge px {label}")
    return img


def warp(img, s, dx, dy, size):
    """Scale about the origin then translate. AFFINE maps OUTPUT -> INPUT, so
    the coefficients are the inverse of the transform being described."""
    return img.transform(
        size, Image.AFFINE, (1 / s, 0, -dx / s, 0, 1 / s, -dy / s),
        resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0),
    )


def flat(img, bg=(120, 120, 120)):
    """Composite onto neutral grey. Difference on RGBA ignores alpha, so a
    silhouette change would otherwise score zero — flattening makes the
    OUTLINE part of the objective, which is most of what we are aligning."""
    b = Image.new("RGB", img.size, bg)
    b.paste(img, (0, 0), img)
    return b


def score(a, b, mask):
    """Mean masked difference. ImageChops/ImageStat are C, so this is cheap
    enough to brute-force a few thousand times."""
    d = ImageChops.difference(a, b).convert("L")
    return ImageStat.Stat(ImageChops.multiply(d, mask)).sum[0]


def seam_mask(size, box, feather, band):
    """The ring just OUTSIDE a window — the pixels that have to agree or the
    join shows. Inside the window we do not care: it gets replaced."""
    x0, y0, x1, y1 = box
    outer = Image.new("L", size, 0)
    ImageDraw.Draw(outer).rectangle(
        [x0 - band - feather, y0 - band - feather, x1 + band + feather, y1 + band + feather],
        fill=255)
    inner = Image.new("L", size, 0)
    ImageDraw.Draw(inner).rectangle([x0, y0, x1, y1], fill=255)
    return ImageChops.subtract(outer, inner)


def window_mask(size, box, feather):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle(list(box), radius=feather * 2, fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))


# ------------------------------------------------------------- the window pass
def place_window(base, sib, box, label):
    """Register `sib` onto `base` and graft the contents of `box` across.

    This is the whole technique, and it is used for both features. Only the
    inside of the window comes from the sibling drawing; every other pixel stays
    the base. So the generator is not being asked to redraw the character
    consistently — a thing it demonstrably cannot do — it is only being asked to
    put a usable mouth, or a usable pair of shut eyes, somewhere in frame.

    Alignment optimises the SEAM: the annulus just outside the window, where the
    graft meets the frozen face. Align the seam and the seam disappears. Nothing
    outside it has to agree, because nothing outside it is used.
    """
    SZ = base.size
    fbase = flat(base)
    smask = seam_mask(SZ, box, FEATHER, SEAM)
    wmask = window_mask(SZ, box, FEATHER)

    HALF = (SZ[0] // 2, SZ[1] // 2)
    fbase_h = fbase.resize(HALF, Image.BILINEAR)
    smask_h = smask.resize(HALF, Image.BILINEAR)
    sib_h = sib.resize(HALF, Image.BILINEAR)

    best, bs, bdx, bdy = None, 1.0, 0, 0
    for sc in COARSE_S:
        for dx in range(-COARSE_T, COARSE_T + 1, COARSE_STEP):
            for dy in range(-COARSE_T, COARSE_T + 1, COARSE_STEP):
                c = score(fbase_h, flat(warp(sib_h, sc, dx / 2, dy / 2, HALF)), smask_h)
                if best is None or c < best:
                    best, bs, bdx, bdy = c, sc, dx, dy

    # refine at full resolution around the coarse winner
    for sc in [bs + 0.001 * k for k in range(-4, 5)]:
        for dx in [bdx + k for k in range(-2, 3)]:
            for dy in [bdy + k for k in range(-2, 3)]:
                c = score(fbase, flat(warp(sib, sc, dx, dy, SZ)), smask)
                if c < best:
                    best, bs, bdx, bdy = c, sc, dx, dy

    # A winner sitting ON the edge of the search means the real optimum is
    # outside it, and the result is a best-effort clamp rather than a fit. It
    # still produces a plausible-looking PNG, which is exactly why it has to be
    # said out loud instead of left for the eye to catch at 30fps.
    pinned = []
    if bs <= COARSE_S[0] + 1e-9 or bs >= COARSE_S[-1] - 1e-9:
        pinned.append("scale")
    if abs(bdx) >= COARSE_T:
        pinned.append("dx")
    if abs(bdy) >= COARSE_T:
        pinned.append("dy")
    warn = f"   !! {'+'.join(pinned)} PINNED AT SEARCH LIMIT — widen COARSE_S/COARSE_T" if pinned else ""
    print(f"  {label}  scale {bs:.4f}  shift ({bdx:+d},{bdy:+d})  "
          f"seam residual {best/1e6:.2f}{warn}")
    a = warp(sib, bs, bdx, bdy, SZ)
    out = base.copy()
    out.paste(a, (0, 0), ImageChops.multiply(wmask, a.getchannel("A")))
    return out


def curve_mouth(img, lift):
    """Lift the mouth corners by `lift` px. Positive smiles, negative sulks.

    Bilinear vertical resample of a bounded region — everything outside the
    falloff is copied untouched, so this cannot disturb the registration the
    window pass just established."""
    if not lift:
        return img
    out = img.copy()
    src, dst = img.load(), out.load()
    W, H = img.size
    y0, y1 = int(LIP_Y - 3 * LIP_SIGMA), int(LIP_Y + 3 * LIP_SIGMA)
    x0, x1 = int(LIP_CX - LIP_HW - 3 * LIP_TAPER), int(LIP_CX + LIP_HW + 3 * LIP_TAPER)
    for y in range(max(0, y0), min(H, y1)):
        fy = math.exp(-((y - LIP_Y) / LIP_SIGMA) ** 2)
        if fy < 0.004:
            continue
        for x in range(max(0, x0), min(W, x1)):
            dx = abs(x - LIP_CX)
            fx = 1.0 if dx <= LIP_HW else math.exp(-((dx - LIP_HW) / LIP_TAPER) ** 2)
            d = lift * ((min(dx, LIP_HW) / LIP_HW) ** 2) * fy * fx
            if abs(d) < 0.01:
                continue
            sy = y + d
            iy = int(math.floor(sy))
            t = sy - iy
            if iy < 0 or iy + 1 >= H:
                continue
            a, b = src[x, iy], src[x, iy + 1]
            dst[x, y] = tuple(int(a[c] + (b[c] - a[c]) * t) for c in range(4))
    return out


def to_box(frac, size):
    return (int(frac[0] * size[0]), int(frac[1] * size[1]),
            int(frac[2] * size[0]), int(frac[3] * size[1]))


# ---------------------------------------------------------------- load + key
src = Image.open(SRC).convert("RGB")
W, H = src.size
cell = W / N
print(f"sheet {W}x{H}  ->  {N} cells of {cell:.0f}x{H}")

cells = [un_matte(clear_sealed(key_out(src.crop((int(i * cell), 0, int((i + 1) * cell), H))),
                               f"head{i}"), f"head{i}")
         for i in range(N)]

# Head 0 is THE face. Every output is this drawing plus a graft.
base = cells[0]
bbox = base.getbbox()
base = base.crop(bbox)
SZ = base.size
print(f"base head cropped to {SZ[0]}x{SZ[1]}")

# Put the siblings in base coordinates first, so the search only has to close
# the residual drift rather than the crop offset.
sibs = [c.crop(bbox) for c in cells]

MBOX = to_box(MOUTH, SZ)
EBOX = to_box(EYES, SZ)
print(f"mouth window {MBOX}")

# ------------------------------------------------------------------- mouths
# h0 is the base untouched, so at rest nothing is grafted and the face is
# simply the face.
print("registering mouths:")
open_heads = [base] + [place_window(base, sibs[i], MBOX, f"head{i}") for i in range(1, N)]

# -------------------------------------------------------------------- blink
# A face that never blinks is a corpse with a hinge, and it is the cheapest
# liveliness available: ONE generation.
#
# The window pass makes the ask much smaller than it used to be. The old plan
# needed a blink head identical to the others in every respect. Now only the EYE
# REGION is used, so the generator has to get the eyes right and nothing else —
# hair, beard and collar are discarded, because they come from head 0 like
# everything else does.
BLINK_SRC = ROOT / "assets" / "incoming" / "head_blink.png"
blink_heads = []
if BLINK_SRC.exists():
    print("registering blink:")
    bl = Image.open(BLINK_SRC).convert("RGB")
    # Accept a lone head or a sheet — take the first cell either way.
    if bl.width > bl.height * 1.4:
        bl = bl.crop((0, 0, bl.width // N, bl.height))
    bl = un_matte(clear_sealed(key_out(bl), "blink"), "blink")
    bl = bl.resize(SZ) if bl.size != SZ else bl

    shut = place_window(base, bl, EBOX, "blink")
    # blink x each mouth aperture, so he can blink mid-word
    blink_heads = [shut] + [place_window(shut, sibs[i], MBOX, f"blink+head{i}")
                            for i in range(1, N)]
else:
    print(f"no blink sheet at {BLINK_SRC.relative_to(ROOT)} — skipping "
          f"(see PUPPET_RIG.md for the prompt; it is one generation)")

# ------------------------------------------------------------------- moods
# Every mood is the same four apertures with the corners re-curved, so choosing
# one costs nothing at render time and cannot desync the lip track.
#
# DEFAULT_MOOD is also written to the bare h0..h3 / hb0..hb3 names, so anything
# that just wants "the head set" keeps working and silently gets the house look.
print(f"baking {len(MOODS)} moods (default: {DEFAULT_MOOD}):")
mood_manifest = {}
for mood, lift in MOODS.items():
    srcs, bsrcs = [], []
    for i, im in enumerate(curve_mouth(h, lift) for h in open_heads):
        im.save(OUT / f"hm_{mood}_{i}.png")
        srcs.append(f"mascot/rig/hm_{mood}_{i}.png")
        if mood == DEFAULT_MOOD:
            im.save(OUT / f"h{i}.png")
    for i, im in enumerate(curve_mouth(h, lift) for h in blink_heads):
        im.save(OUT / f"hmb_{mood}_{i}.png")
        bsrcs.append(f"mascot/rig/hmb_{mood}_{i}.png")
        if mood == DEFAULT_MOOD:
            im.save(OUT / f"hb{i}.png")
    mood_manifest[mood] = {"lift": lift, "srcs": srcs, "blinkSrcs": bsrcs}
    print(f"  {mood:9s} lift {lift:+3d}  {len(srcs)} apertures"
          f"{'  <- default, also written as h0..h3' if mood == DEFAULT_MOOD else ''}")

# ----------------------------------------------------------------- manifest
# The components used to carry the aspect ratio as a hand-typed fraction, which
# silently goes stale the moment a sheet is recut — and a stale aspect does not
# throw, it just quietly stretches his face. Emit it instead.
(ROOT / "src" / "rig.heads.json").write_text(json.dumps({
    "width": SZ[0],
    "height": SZ[1],
    "aspect": SZ[0] / SZ[1],
    "srcs": [f"mascot/rig/h{i}.png" for i in range(N)],
    "blinkSrcs": [f"mascot/rig/hb{i}.png" for i in range(N)] if blink_heads else [],
    "labels": ["shut", "ajar", "half", "wide"],
    "defaultMood": DEFAULT_MOOD,
    "moods": mood_manifest,
}, indent=2) + "\n")
print(f"  src/rig.heads.json  aspect {SZ[0] / SZ[1]:.4f}  blink {bool(blink_heads)}")

# --------------------------------------------------------------- diagnostics
if DEBUG:
    DBG.mkdir(parents=True, exist_ok=True)
    outs = [Image.open(OUT / f"h{i}.png").convert("RGB") for i in range(N)]

    # How much of the remaining change is actually the mouth? Before the window
    # pass the answer was 7-11%.
    print("\n  share of change that is the mouth:")
    for i in range(1, N):
        d = ImageChops.difference(outs[i], outs[0]).convert("L")
        tot = ImageStat.Stat(d).sum[0]
        inb = ImageStat.Stat(d.crop(MBOX)).sum[0]
        print(f"    h{i}: {100 * inb / tot:.1f}%" if tot else f"    h{i}: n/a")

    sheet = Image.new("RGB", (SZ[0] * N, SZ[1] * 2), (0, 0, 0))
    for i, o in enumerate(outs):
        sheet.paste(o, (SZ[0] * i, 0))
        d = ImageChops.difference(o, outs[0]).convert("L").point(lambda v: min(255, v * 4))
        sheet.paste(d.convert("RGB"), (SZ[0] * i, SZ[1]))
    sheet.resize((SZ[0] * N // 2, SZ[1])).save(DBG / "heads.png")

    ov = base.copy()
    d = ImageDraw.Draw(ov)
    d.rectangle(list(MBOX), outline=(255, 0, 255, 255), width=3)
    d.rectangle(list(EBOX), outline=(0, 255, 255, 255), width=3)
    ov.save(DBG / "windows.png")
    print(f"\n  debug -> {DBG}")
