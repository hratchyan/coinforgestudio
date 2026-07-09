# Customizing CoinForge Studio

CoinForge is plain HTML/CSS/JavaScript — no build step, no framework. Open the `app/`
folder, edit a file, reload the app (Ctrl+R in the desktop app). Every library the app
ships with (symbols, ring presets, templates, glyphs, fonts) is a data file designed to
be extended.

> Portable install: your edits travel with the folder. If you use the installed version,
> the same files live in `resources\app\` inside the install directory.

---

## Add your own symbols

Symbols live in `app/js/symbols.js`. Each one is an SVG path in a **100×100 box centered
on (0,0)** — coordinates from −50 to +50.

Append at the bottom of the file (before the registry section) or anywhere among the
`add(...)` calls:

```js
add('milpat', 'mybadge', 'My Badge', {
  fill: () => 'M 0 -40 L 35 20 L -35 20 Z',   // any SVG path data
});
```

- `fill` — path filled with the element's shade. Subpaths punch holes
  (`fillRule: 'evenodd'`, the default). Use `fillRule: 'nonzero'` for overlapping
  union shapes.
- `stroke` + `strokeW` — path drawn as outlines (round caps), for line-style art:

```js
add('scitech', 'orbit', 'Orbit', {
  fill: () => CF.geo.circlePath(6),
  stroke: () => CF.geo.circlePath(40),
  strokeW: 4,
});
```

- The first argument is the category id: `stars, milpat, firepol, heraldry, faith,
  nature, nautical, tools, scitech, sports, edge, ornament, shapes`.
- All the parametric generators in `app/js/geometry.js` are available under `CF.geo`
  (stars, bursts, gears, rings, laurels, banners…) — build with them instead of raw
  coordinates when you can.

**Converting existing SVG art:** open your SVG in a text editor, take the `d="..."` of
its path, and scale/translate the coordinates into the −50…50 box (Inkscape:
`Edit > Resize page to selection` at 100×100, center at 50,50, then subtract 50).
Only `M L C Q Z` absolute commands are transform-safe within the app's helpers; arcs
(`A`) work fine for display but can't be rotated by `CF.util.pathTransform`.

---

## Add ring presets

`app/js/ringpresets.js` — each preset returns element objects sized from the coin radius
`R` (mm). Copy an existing block:

```js
{
  id: 'my-frame', label: 'My Frame',
  desc: 'Double ring with diamonds.',
  build(R) {
    return [
      E().create('ringband', { style: 'double', radiusMM: R - 2, thicknessMM: 1.4 }),
      E().create('symbolring', { symbolId: 'diamondshape', count: 16, radiusMM: R - 5, itemSizeMM: R * 0.08 }),
    ];
  }
},
```

---

## Add templates

`app/js/templates.js` — a template builds a complete document. The helper
`ring('stars-border', R)` reuses any ring preset. Sizes should scale with `R` so the
template works on any blank diameter.

```js
{
  id: 'my-coin', label: 'My Coin', cat: 'Clubs',
  desc: 'What it looks like.',
  build(D) {
    const R = D / 2;
    return doc('My Coin', D, [
      ...ring('rope-frame', R),
      E().create('symbol', { symbolId: 'anchor', sizeMM: R * 0.8 }),
      E().create('arctext', { text: 'MY CREW', radiusMM: R - 4, sizeMM: R * 0.15 }),
    ]);
  }
},
```

---

## Add glyphs

`app/js/glyphs.js` — paste any Unicode characters into an existing category string or add
a new category. They render with *Segoe UI Symbol* (monochrome). The `mono()` wrapper
appends a variation selector that keeps dual emoji/text characters monochrome.

---

## Add fonts

Two options:

1. **Quick (system)**: add the family name to the `SYSTEM` array in `app/js/fonts.js`.
   Any font installed in Windows works — but the design only renders right on machines
   that have it.
2. **Bundled (portable)**: add an entry to the `$families` list in `tools/get-fonts.ps1`
   (any Google Fonts family) and re-run the script — it regenerates
   `app/js/fonts-data.js` with the font embedded. Or append to `CF_FONTS_DATA` manually
   with a base64 woff2 of any font you're licensed to embed.

---

## Metal previews

`app/js/renderer.js` → the `METALS` table. Each metal is five colors:
`hi` (highlight), `mid`, `lo` (shadow), `rim`, `text`. Add e.g. a rose-gold in one line.

---

## Where things are

| File | Contents |
| --- | --- |
| `app/js/geometry.js` | Parametric path generators (`CF.geo`) |
| `app/js/symbols.js` | Vector symbol library |
| `app/js/glyphs.js` | Unicode glyph palette |
| `app/js/ringpresets.js` | Ring designs |
| `app/js/templates.js` | Full coin templates |
| `app/js/fonts.js` / `fonts-data.js` | Font system / embedded fonts |
| `app/js/elements.js` | Element types (render/SVG/inspector schemas) |
| `app/js/renderer.js` | Canvas pipeline, metals, export rendering |
| `app/js/imagetools.js` | Image processing & background removal |
| `app/js/ai.js` | U²-Net ONNX integration |
| `docs/*.md` | These manuals (regenerate the in-app copy below) |

### Regenerating in-app help

The Help window shows an embedded copy of `docs/*.md`. After editing docs, rebuild it:

```
tools\node-portable-or-system> node tools/embed-docs.js
```

(Any Node.js ≥ 14 works. If you never touch the docs, you never need this.)

---

## Project file format (.coin)

A `.coin` file is JSON: `{ app, version, doc, thumb, saved }` where `doc` is
`{ name, coin: { diameterMM, marginMM }, dpi, elements: [...] }`. Every element carries
its full properties (images as data-URLs), so the file is self-contained and diff-able.
