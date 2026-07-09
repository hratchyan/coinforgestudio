# Laser Workflow — from CoinForge to engraved metal

This guide covers taking a CoinForge design to a **fiber laser** (like the WeCreat Lumos
series) and getting a crisp, deep, even coin. It's written for coin blanks — brass,
copper, stainless, zinc-alloy, or coated/anodized blanks.

> Machine settings below are *starting points and method*, not gospel. Every machine,
> lens, and blank alloy differs — always run the test-grid step on a spare blank.

---

## 1. Export the right file

For 99% of coin work, export **PNG**:

1. **Ctrl+E** → Format **PNG**
2. **Resolution**: **1016 DPI** (0.025 mm/px) is an excellent default for fiber galvos.
   Use 508 DPI for quick tests, 1270–2540 DPI only if your lens/software genuinely
   resolves it.
3. **Background**: white. **Dithering**: *None* (let your laser software rasterize
   grayscale) — or bake it here if you prefer exact control of the dot pattern.
4. **Invert**: only for coated/painted/anodized blanks where the laser *removes* dark
   coating to reveal light metal — your art logic flips.
5. **Include outline** if you want an alignment circle to frame/position on the blank.

The PNG's pixel size is exact: a 44.45 mm coin at 1016 DPI = 1778 × 1778 px. **When you
import it into your laser software, do not rescale it** — set the image size to the same
mm (or confirm the software reads the embedded size) and it will match your blank 1:1.

**SVG** is available too (rings, symbols, shapes and text as real vectors). Use it when
you want to hatch-fill vector regions in the laser software. Note SVG text needs the same
fonts installed on the machine doing the import — PNG sidesteps that entirely.

---

## 2. Set up in your laser software

Works the same in WeCreat's MakeIt! software or LightBurn:

1. Import the PNG. Set/confirm its size = your coin diameter in mm.
2. Choose **image/bitmap engrave** mode. If you exported grayscale, pick a dither or
   grayscale power mapping in the software; if you baked dithering in CoinForge, choose
   pass-through / threshold so it doesn't re-dither.
3. Place a **circle the size of your blank** in the software, center the art in it, and
   use the framing/red-light preview to align to the physical blank.
4. A simple jig helps a lot: engrave a shallow circle pocket in scrap wood/acrylic, drop
   the blank in — every coin lands in the same spot.

---

## 3. Focus is everything

Fiber galvo lasers have a *narrow* focal window (a fraction of a millimetre matters).

- Focus **on the top surface of the blank**, not the jig or table.
- If your machine has an autofocus/ranging feature, verify on the blank itself.
- For deep engraving (multiple passes), **re-focus or step the Z down** as you remove
  material — typically every 0.05–0.15 mm of depth, machine-dependent.

---

## 4. Run a test grid (once per blank type)

Metals vary wildly. Spend one spare blank on a parameter matrix:

- Grid of small squares varying **power** (rows) × **speed** (columns), at your machine's
  default frequency; ~5×5 covers a lot.
- Look for: clean dark marking (annealing), bright polishing, or material removal
  (deep engrave) depending on your goal.
- Repeat interesting cells varying **frequency** and **hatch spacing (interval/DPI)** —
  interval around 0.02–0.05 mm suits most coin work.
- Save winning settings as material presets. Label the physical test blank with a marker.

Rules of thumb on bare metals with a 20 W fiber:
- **Dark marks** (oxidation/anneal): lower speed, moderate power, higher frequency.
- **Engraving (removal)**: high power, moderate speed, lower frequency, multiple passes.
- **Bright/polish pass**: one fast, low-power pass at the end can clean and shine the
  engraved floor.

---

## 5. Depth & the "premium coin" look

A classic challenge coin combo:

1. **Deep-engrave the background** (recessed field): select your design's dark areas —
   in CoinForge that's the marked (shade 0) regions — and run 10–40 passes depending on
   power and desired depth (0.1–0.3 mm reads great).
2. **Leave the art raised** (knockouts!): design bands/text with shade-100 knockouts so
   the metal stays proud.
3. **Finish pass** for the floor: a light cleanup pass makes the recessed field even.
4. Optional: **darken the recess** (slow anneal pass) for contrast against polished
   raised metal.

CoinForge's shade system maps directly: shade 0 = engrave/mark, shade 100 = untouched
metal, mid-shades = partial marking (great for feather/fur/shading in portraits).

---

## 6. Photos & portraits on metal

- Use **Smart Import** → AI cutout → grayscale, then push **contrast** and **sharpen**
  in the image controls. Faces need punchy midtones on metal.
- **Levels**: raise the black point until the background noise disappears; lower the
  white point until highlights hold detail.
- Export at 1016 DPI, no CoinForge dithering, and use **Jarvis/Stucki dithering in the
  laser software** at an interval matching your beam spot — or bake Floyd–Steinberg in
  CoinForge and run threshold mode.
- Slower speed + lower power beats fast + hot for smooth photo tones on brass/copper.

---

## 7. Coated & anodized blanks

- Design normally (dark = marked), then flip the **preview** ("Laser mark appears as →
  Light marks") to sanity-check contrast.
- Export with **Invert** ON — the laser removes coating where the art is *light*,
  exposing bright metal. Some laser software has its own "negative image" toggle; use
  one or the other, not both.
- These blanks usually engrave in a single fast pass at modest power.

---

## 8. Safety (fiber lasers are not diode lasers)

- **Never** run a fiber galvo with your eyes unprotected at its wavelength (1064 nm) —
  use the enclosure/window and rated goggles. Reflections off shiny coin blanks are real.
- Fumes from marking metals & coatings need extraction, especially coated blanks.
- Keep the blank *flat and secured* — galvo mirrors are fast; a launched coin is a bad day.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Blurry/soft marks | Out of focus | Re-focus on blank surface; check jig height |
| Uneven darkness across coin | Blank not flat / lens field edge | Center the blank in the work area; shim jig flat |
| Text unreadable | Too small / too thin | Keep caps ≥ 1.5 mm; bolder weight; fewer letters |
| Photo looks muddy | Low contrast art | Raise contrast/levels in CoinForge; coarser dither |
| Rings not concentric with blank | Alignment | Use the outline-circle export + framing preview; make a jig |
| Ghost double lines | Blank moved between passes | Clamp/jig; don't bump the table mid-job |
