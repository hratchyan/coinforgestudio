# FAQ & Troubleshooting

## Design

**Why is everything gray? Where are colors?**
Fiber lasers on metal don't do color — they mark darker/lighter (or remove coating). The
shade slider (0 = full mark … 100 = bare metal) *is* your palette. The metal preview adds
realism, but exports are pure grayscale by design.

**How do I make bare-metal text on a dark band (like a real coin)?**
Put a solid Ring Band down, then Arc Text on top with **Shade = 100**. The text "knocks
out" of the band. The *Text on Band* ring preset and *Military Band* template do this
out of the box.

**My arc text top and bottom don't line up on the same circle.**
They do — radius means the *outer edge of the capitals* for both sides, so use the same
radius top and bottom and they'll frame evenly.

**Can I put stars only across the top?**
Yes — Symbol Ring → set **Sweep** to e.g. 140° and **Start/center angle** 0. The items
distribute across the arc.

**Can I make business cards, pet tags or rubber stamps?**
Yes — **File → New design…** and pick Card, Token or Stamp. Cards are rectangular blanks
(credit-card, business card, dog tag sizes), tokens are shaped metal (hexagon, shield,
heart, bone…), and stamps are rubber dies that export mirrored + inverted automatically.
There are starter templates for each in the Templates tab, plus a QR-code element that
works on everything — including coins.

**Why can't I add arc text or ring presets to my card?**
They're circle geometry — they need a round blank (coins and round stamp dies). On cards
and tokens use the **Frame** element for borders and the align buttons for layout.

**How big should text be?**
On metal, keep capital height at or above ~1.5 mm (that's the *Size* value for text).
Thin scripts want more. Engrave a test ring of sizes on a spare blank once — it'll
calibrate your eye forever.

**The eagle/symbol looks jagged when I zoom way in.**
Symbols are vectors — they export perfectly crisp. The canvas preview rasterizes at
screen resolution, so extreme zoom can look soft; the exported PNG at 1016 DPI will be
sharp.

## Images & background removal

**AI button is disabled.**
The AI runtime files are missing (`app/vendor/ort*.js/.wasm` + `app/assets/models/u2netp.onnx`).
The Auto/color tools still work. Re-run `tools/get-ai.ps1` to fetch the AI files.

**AI removal is slow.**
First run loads the model (a few seconds). After that it's quick. It always runs 100%
locally — nothing is uploaded.

**The auto-removal ate part of my subject.**
Lower the **Tolerance**, hit Auto again, then use the **Restore** brush on lost areas.
Or use AI detect, which understands subjects rather than colors.

**Pasted screenshot came in huge/small.**
Use *Fit to center* in the image properties, then drag a corner handle to taste.

## Export & engraving

**What DPI should I export?**
1016 DPI (0.025 mm/px) is the sweet spot for fiber galvo coin work. More detail than most
lenses can resolve costs file size for nothing; less shows pixels.

**My laser software shows the PNG at the wrong size.**
Set the image dimensions in the software to your coin diameter in mm (the export dialog
shows the exact size). CoinForge bakes the pixel-to-mm ratio; never "fit to page".

**SVG text looks wrong in LightBurn / MakeIt!**
The machine importing the SVG needs the same font installed. For guaranteed 1:1 art, use
PNG — or install the bundled fonts (`app/assets/fonts/*.woff2` — double-click → Install).

**Should I dither in CoinForge or in the laser software?**
Either. Laser software dithers with knowledge of your interval settings — usually best.
Bake it in CoinForge (Floyd–Steinberg/Atkinson) when you want to see and control the
exact dot pattern, then run threshold/pass-through mode on the laser side.

## App & projects

**Where are my projects stored?**
Desktop app: `Documents\CoinForge Projects` (one `.coin` file each — easy to back up).
Browser mode: the browser's local storage — use *File → Export .coin* for real files.

**Does the app need internet?**
No. Fonts, symbols, the AI model, docs — everything ships in the folder. It never
phones home.

**Something's broken / blank screen.**
Desktop app: `Ctrl+Shift+I` opens DevTools — the Console tab will show what failed.
Browser mode: same DevTools via F12. Autosave keeps the last 15 s of your work; File →
Projects → your project will still be there.

**How do I add my own symbols / templates / fonts?**
See `CUSTOMIZING.md` — that's the whole point of the plain-JS design.

## Plans, accounts & cloud saves

**What's free, and what's paid?**
Almost everything is free — every design tool, every export, the AI assistant, and
**1 cloud project** — forever, no watermarks. **Pro** ($59/year) adds just two things:
**10 cloud slots** (up from 1) and the **template & asset vault**.

**Where do my projects live?**
- *Desktop app:* real `.coin` files in `Documents\CoinForge Projects`. Yours, offline, forever.
- *Browser (free):* unlimited local saves in that browser's storage (stay on that device),
  plus **1 cloud slot** that follows your account. Export a `.coin` file for a backup you control.
- *Pro cloud slots:* 10 numbered slots that follow your account — save on the desk PC,
  open on the laptop or phone. `File → ☁ Save to cloud` (Ctrl+Shift+S) or the Projects
  dialog (Ctrl+O).

**What happens to my cloud projects if I cancel Pro?**
Nothing is deleted, ever. Your slots become read-only — you can still open, export, and
delete them; you just can't save new work into them. Resubscribe and they wake up.

**How does billing work?**
Annual, through Stripe (we never see your card number). Cancel anytime from your account
menu → *Manage billing* — you keep Pro until the end of the paid period. Every charge has
a 14-day no-questions money-back window: email contact@coinforgestudio.com.

**What is the AI assistant (MCP)?**
A free feature of the desktop app: your own AI — Claude Desktop, Claude Code, or any
MCP-compatible client — designs coins with you, placing real elements, seeing real
previews, and handing you laser-ready art. Turn it on in **Tools → AI Assistant (MCP)**;
no account needed. Your AI subscription, your machine, your data. See the AI Assistant
guide for setup.

**Does the free version get worse over time?**
No. The promise is structural: the two paid things are *around* the designer (extra cloud
storage and content packs) — never the designer, the export quality, or the AI. If a tool
exists in CoinForge, it works in Free.
