# CoinForge Studio — User Guide

Welcome to **CoinForge Studio**, a designer built for one job: making beautiful coins and
challenge coins you can engrave on metal blanks with a fiber laser.

Everything in the app works in **real millimetres**. The canvas is your coin blank; what you
see (including the relief preview) is what your laser will mark.

---

## 1. The workspace

| Area | What it does |
| --- | --- |
| **Top bar** | File & Tools menus, undo/redo, zoom, Export, Help |
| **Left panel** | Add elements · Symbol library · Ring presets · Templates · Layers |
| **Canvas** | Your coin. Scroll to zoom, drag empty space (or hold Space/Alt) to pan |
| **Right panel** | Properties of the selected element + coin settings |
| **Status bar** | Cursor position in mm / radius / angle, project state |

### Canvas navigation
- **Scroll wheel** — zoom at the cursor
- **Drag empty space**, **middle-drag**, **Space+drag**, or **Alt+drag** — pan
- **F** — fit the coin to the window · click the zoom % label does the same
- **G** — toggle guides (safe-margin circle + center cross)

### On a phone or tablet
The hosted app adapts to small screens. The tool and property panels become
slide-in drawers driven by the bottom bar — **☰ Tools**, **🪙 Coin**,
**⚙ Properties** — and the canvas gets touch gestures:
- **Pinch** to zoom, **two fingers** to pan
- **One finger on empty space** to pan; **one finger on an element** to move it
- Selection handles are enlarged for fingertips
Tablets are great for real design work; phones are best for quick edits, tweaks,
and exporting on the go. For heavy work, the desktop app still rules.

---

## 2. Blank setup (coins, cards, tokens & stamps)

**File → New design… (Ctrl+N)** picks the blank:

- **● Coin** — round metal blank by diameter.
- **▭ Card / Tag** — rectangular blanks: credit-card (85.6 × 54 mm CR80), US/EU business
  cards, dog tag, key fob, or custom width/height/corner radius.
- **⬡ Token** — shaped metal blanks: hexagon, octagon, oval, shield, heart, dog bone.
- **◉ Stamp** — rubber stamp dies, rectangular or round. You design it *readable*; the
  export flips and inverts it automatically so the raised die prints correctly.

With nothing selected, the right panel shows the blank's section (Coin/Card/Token/Stamp):

- **Size** — coins take a diameter (mm or inches); cards and tokens take width/height
  (cards also a corner radius; tokens a shape picker).
- **Safe margin** — draws a dashed guide. Keep art inside it so nothing falls off the
  edge bevel of the blank. (On shaped tokens the guide is approximate near curves.)
- **Material** — *Metal / hard surface* or *Rubber stamp*. Rubber switches the preview to
  a die look and sets the stamp export defaults.
- **Metal preview** — brass, gold, silver, copper, antique bronze, matte black, gunmetal.
  Preview only; it never changes the exported art.
- **Laser mark appears as** — *Dark marks* for bare metal (steel, brass, titanium
  oxidation marking) or *Light marks* for anodized/coated/painted blanks where the laser
  removes a dark coating. This flips the preview so you can judge contrast correctly.
- **Relief preview** — adds a subtle emboss illusion so you can judge depth composition.

Ring presets, arc text, symbol rings and ring bands need a **round** blank (coins and
round stamp dies). On cards and tokens use the **Frame** element for borders, and the
**Align to blank** buttons (right panel, with a selection) to snap elements to the safe
margin — left/center/right, top/middle/bottom.

---

## 3. Elements

Add elements from the **Add** tab. Every element has:

- **Position / rotation** (except center-locked rings)
- **Shade** — 0 = fully marked (black), 100 = untouched bare metal. Mid values = partial
  power (grayscale). *Knockout trick:* put a shade-100 element on top of a marked band and
  the laser skips it — bare-metal text on a dark band, like a real minted coin.
- **Opacity** — preview/art blending (use shade for engraving strength; opacity is mostly
  for layering photos).

### Text
Straight text, multi-line (`Enter` for new lines in the panel), any bundled or system font,
letter spacing in mm. **Double-click text on the canvas to edit it in place.**

### Arc Text
Text that follows a circle — the coin classic.
- **Radius** is the *outer edge of the capitals*, so setting it just inside a ring band
  lines everything up.
- **Reads along**: *Top* (upright at 12 o'clock) or *Bottom* (upright at 6 o'clock, like
  "QUARTER DOLLAR" on real coinage).
- **Center angle** slides the text around the circle; the rotate handle does the same.
- **Spread over arc** justifies the letters across a fixed sweep (e.g. exactly 120°).
- Drag the ring body to change the radius; drag the yellow rotate handle to slide it around.

### Symbol
One of 90+ curated vector symbols (see the **Symbols** tab) or any Unicode glyph
(stars, ornaments, zodiac, chess…). Search by name. With a Symbol selected, clicking
another symbol in the Symbols tab *swaps* it in place.

### Symbol Ring
A circle of repeated symbols — the star ring on classic challenge coins.
- **Count**, **ring radius**, **symbol size**
- **Sweep** < 360° makes a partial arc (e.g. stars only across the top)
- **Rotate with ring** — symbols point outward like compass needles, or stay upright
- Works with any symbol or glyph, including knockout (shade 100) over bands

### Ring Band
Circular border bands: solid, double pinstripe, triple, **beaded**, **rope**, **reeded**
(mint edge), dashed, **scalloped**, **chain**, and a **laurel wreath**. Adjust radius,
thickness and pattern density. Drag the band to resize its radius live.

### Banner
A motto ribbon with curved text, swallowtail or square ends, adjustable curve
(+ curves up, − curves down). Text defaults to **knockout** (bare metal) like an
engraved ribbon. Classic at the bottom of a crest.

### Image (Smart Import)
Bring in any photo, logo, or screenshot:
1. **Add → Image** (or drag-drop a file onto the canvas, or paste with **Ctrl+V**)
2. The **Smart Import** studio opens and auto-removes plain backgrounds. Use **AI subject
   detect** for busy photos (finds the person/animal/object), White/Black BG for scans,
   or the color picker for logos. Refine with erase/restore brushes.
3. **Place on coin** — the cutout is auto-cropped and fitted to the coin center.

After placing, the right panel has full **laser prep controls**: grayscale, brightness,
contrast, gamma, levels (black/white point), sharpen, posterize, invert, plus an optional
**circle mask** with feather. `Fit to center` re-centers and sizes it in one click.

### Shape
Parametric shapes: star (any points/inner ratio), sunburst, polygon, ring, gear, cross,
heart, drop, crescent, bar. Filled or outline.

### QR Code
A real, scannable QR code generated **entirely offline** — nothing leaves your machine.
Content can be a URL, phone number, Wi-Fi string or vCard text. Pick an error-correction
level (**H** is the safest for engraving), keep the **quiet zone** on, and don't go below
~12 mm on metal if you want phones to scan it reliably. Test-scan an export before
engraving a batch.

### Frame
A rectangular border — the card/stamp counterpart to ring bands. Width, height, line
thickness, corner radius, single or double line. The Add button pre-sizes it to the
blank's safe margin.

---

## 4. Selecting & editing

- **Click** to select, **Shift+click** for multi-select, **Ctrl+A** all, **Esc** none
- **Drag** to move (snaps to the center axes) · **Shift** constrains to one axis
- **Corner handles** scale · **yellow handle** rotates (Shift = 15° steps)
- **Green diamond** on rings = drag the radius
- Ring-type elements are **center-locked** by default — dragging their body changes the
  radius instead of moving them. Untick *Lock to coin center* to free them.
- **Arrows** nudge 0.2 mm (Shift = 1 mm) · **[** and **]** rotate 1° (Shift = 15°)
- **Ctrl+D** duplicate · **Delete** remove
- **Layers tab**: rename (double-click), hide 👁, lock 🔒, drag to reorder, ⋯ to group

---

## 5. Rings & Templates

- **Rings tab** — one-click curated frames (stars & border, rope, beaded, military band
  with knockout stars, text-on-band, sunburst…). They insert normal editable elements
  sized to your coin — tweak or delete any part afterwards.
- **Templates tab** — complete starting layouts (Veteran Eagle, Police, Fire, EMS, Family
  Crest, Anniversary, Graduation, Memorial, Biker, Corporate, Liberty, Minimal…). Choose
  **Replace** to start from the template or **Merge** to stack it on your current design.

---

## 5½. Layer groups — multi-pass engraving *(new in 1.1)*

Real coins are engraved in **passes**: deep-engrave the background field at one setting,
anneal the dark linework at another, run a light shading pass last. Groups map your
design onto those passes:

- In the **Layers** tab hit **+ Group** (with elements selected, they join it), or use
  the **⋯** button on any layer / the *Group* dropdown in the inspector. Drag a layer
  onto a group header to assign it.
- Groups are **color-coded tags** — they never change stacking order. A knockout star
  ring stays above its band no matter which group each is in.
- **◎ Solo** previews one group alone; **🔈 Mute** hides a group. Preview-only — exports
  ignore them.
- **Export → One file per group** produces one PNG per group with *identical framing*,
  so every file lands in exactly the same spot in your laser software — assign each its
  own power/speed/passes.
- **Export → SVG → Laser layers** writes one color per group; LightBurn-style software
  auto-splits colors into its own setting layers on import. One file, all passes.

## 5¾. Cut outline *(new in 1.1)*

**Tools → Generate Cut Outline (Ctrl+L)** traces a smooth vector silhouette around
everything visible — even when the art has no continuous edge of its own.

- **Offset** grows the path outward; raising it merges nearby parts (a star ring + a
  center emblem) into one continuous cuttable path.
- **Outer silhouette only** ignores interior holes; untick it to cut them too.
- The result is a **red machine path**: visible on the canvas, selectable, but never
  engraved and never rasterized into PNG exports. It exports as the red layer in SVG
  (the near-universal "cut" convention) with its own stroke width.
- It's a snapshot — after editing the art, hit *Regenerate outline* in its inspector.

---

## 6. Projects

- **Ctrl+S** saves to the built-in project library (with thumbnails) — in the desktop app
  they live in `Documents\CoinForge Projects`, one `.coin` file per project.
- **File → Projects…** (Ctrl+O) — browse, open, rename, duplicate, delete.
  Right-click a card for options.
- **Import / Export .coin file** — a portable JSON of the whole design (images included).
  Great for backups or moving between machines.
- **Autosave** runs every 15 s; if the app closes unexpectedly you'll be offered a
  restore on next launch.

---

## 7. Export for engraving

**Ctrl+E** or the ⚡ Export button. See `LASER_WORKFLOW.md` for the full pipeline.

- **PNG (recommended)** — rendered at an exact DPI so the physical size is baked in.
  1016 DPI = 0.025 mm/pixel, a sweet spot for fiber galvos.
- **Dithering** — usually leave **None** (your laser software converts grayscale), or
  bake Floyd–Steinberg/Atkinson/ordered/threshold here for full control.
- **Invert** — for negative marking on coated blanks.
- **Mirror** — for jig setups that need flipped art.
- **Include outline** — a thin circle at the coin edge for alignment or cutting reference.
- **SVG** — true vectors for rings/symbols/shapes; text exports as text (install the same
  fonts, or prefer PNG for guaranteed fidelity); images are embedded.

---

## 8. Background Remover (standalone utility)

**Tools → Background Remover** (Ctrl+B) opens the same studio as Smart Import but for any
image — save or copy the transparent-background cutout without touching your coin. The
**Silhouette** toggle produces a solid black stencil, perfect for single-color engraving.

Engines available:
- 🤖 **AI subject detect** — U²-Net neural network, runs locally, no internet
- ✨ **Auto** — detects and floods the border background color
- **White BG / Black BG** — luminance keying for scans and renders
- 🎯 **Pick color** — click any color to key it out globally
- Brushes — erase/restore by hand, plus feather, speckle cleanup, invert

---

## 9. Tips for great coins

1. **Design in grayscale from the start** — shade is your only "color" on metal.
2. **Big shapes beat fine detail** at coin scale; a 40 mm coin ≈ 1.6". Keep text ≥ 1.5 mm
   cap height for readability after engraving.
3. **Use knockouts** — bare-metal text on a marked band looks minted, not printed.
4. **Symmetry sells** — center your hero, balance top/bottom arc text, odd star counts.
5. **Photo prep**: bump contrast + sharpen, then let your laser software (or the export
   dither) handle the dots. Test on a spare blank first.
6. Watch the **safe margin** — blank edges are often beveled or rounded.
