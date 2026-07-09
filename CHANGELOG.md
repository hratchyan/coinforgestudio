# Changelog

## 1.2.0 — 2026-07-08

Mobile & touch (Phase A) + hosted accounts.

- **Touch gestures:** pinch-to-zoom and two-finger pan on the canvas;
  single-finger drag on empty space pans; touch-sized selection handles
  and hit targets (pointer-type aware).
- **Small-screen shell (≤900px):** side panels become slide-in drawers
  with a bottom toolbar (Tools · Coin · Properties) and tap-to-dismiss
  scrim; condensed scrollable top bar; dialogs go single-column;
  safe-area aware. Desktop layout unchanged.
- **Hosted accounts (app.coinforgestudio.com only):** Google sign-in or
  email/password with mandatory verification; Firestore user profiles
  (`tier` field ready for future plans) and preference sync; owner-only
  + verified-only security rules. The desktop app and local/self-hosted
  copies never require an account.

## 1.1.0 — 2026-07-06

The workhorse release: multi-pass workflows + cutting.

- **Layer groups (engraving passes):** tag elements into named, color-coded
  groups; solo/mute groups in the preview; assign via the Layers panel
  (⋯ menu or drag onto a group header) or the inspector. Groups never change
  stacking order — they are pass assignments.
- **Per-group export:** one PNG per group with identical framing for perfect
  alignment across passes (folder picker in the desktop app), and a new
  "laser layers" SVG mode — one color per group, so LightBurn-style software
  auto-splits the import into setting layers.
- **Cut outline generator (Tools → Generate Cut Outline, Ctrl+L):** traces a
  smooth vector silhouette around everything visible, with adjustable offset
  (merges nearby parts into one continuous cut path), corner smoothing, and
  outer-only/holes modes. Renders as a red machine-path overlay, never
  engraves, exports as the red SVG layer. Exact Euclidean distance-transform
  dilation + marching squares + Douglas–Peucker + Chaikin.
- **Security hardening:** renderer sandbox enabled, strict Content-Security-
  Policy, and path-traversal guards on all file IPC (project ids, asset
  reads, export names).
- Fixed: `.coin` files from 1.0 load seamlessly (groups migrate in).

## 1.0.0 — 2026-07-05

First release. Built by Hratch Simonyan.

- Coin document model in true millimetres, center-origin, with shade-based
  (0–100) grayscale marking and knockout support
- Elements: text, arc text (top/bottom, justify-across-arc), symbol, symbol ring,
  ring band (10 styles incl. rope/beaded/reeded/scallop/chain/laurel), motto banner
  (curved text, swallowtail), image (smart import), parametric shapes
- 90+ curated vector symbols in 13 categories + curated Unicode glyph palette
- 13 ring presets, 16 full coin templates
- Smart image import: AI background removal (local U²-Net), auto border detect,
  white/black/color keying, brush refinement, feather, despeckle, silhouette mode,
  auto-crop & center-fit
- Laser image prep: grayscale, brightness/contrast, gamma, levels, sharpen,
  posterize, invert, circular mask with feather
- Realistic metal preview (7 finishes), relief illusion, dark/light-mark modes
- Export: DPI-exact PNG (with FS/Atkinson/ordered/threshold dithering, invert,
  mirror, outline circle), SVG (vector paths + text + embedded images),
  clipboard copy
- Projects: .coin files with thumbnails, project browser, autosave + crash recovery
- 10 bundled OFL fonts + curated system fonts
- Full offline documentation (in-app + /docs)
- Windows packaging: portable exe, NSIS installer, zero-install browser launcher