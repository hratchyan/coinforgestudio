# CoinForge Studio — project guide for Claude

> **Read `private/JOURNAL.md` first** (git-ignored, local-only). It holds the live
> infrastructure IDs, the exact "where we are right now" status, pivots, and the
> hard-won gotchas. This file is committed to a **public** repo, so it contains
> **no secrets, no Stripe/infra IDs, no internal ops details** — those live only in
> the journal and in the user's `~/.claude` memory. Keep it that way.

## What this is
A coin & challenge-coin designer for laser engraving. Live product:
- **coinforgestudio.com** — landing (Firebase Hosting target `landing` → `site/`)
- **app.coinforgestudio.com** — the app, login-gated (target `app` → `app/`)
- Free **desktop** app (Electron) on GitHub Releases — no account, offline.
- Open source (MIT), author **Hratch Simonyan**. Attribution to Claude Fable 5 is kept
  deliberately (he's proud of the collaboration) — keep the Co-Authored-By trailers.

## Product model (current)
- **Free:** full designer (web + desktop), unlimited local saves, the **AI Assistant
  (MCP) — free**, and **1 cloud project**.
- **Pro** ($59/yr, $39 first year via EARLYBIRD promo): **10 cloud slots + the template
  & asset vault.** That's the entire paid value. Lapse = cloud slots read-only, never deleted.
- The designer, every export, and the AI are free forever. Paid = cloud capacity + content.

## Architecture & conventions (do not fight these)
- **Pure vanilla HTML/JS/CSS in `app/`. No build step. Classic scripts. Global `CF`
  namespace.** Coordinate system is **millimetres**, origin = center, 0° = 12 o'clock CW.
- **Substrate model (v1.7):** `doc.substrate = {kind: 'circle'|'rect'|'rounded'|'shape', …}`
  + `doc.material = 'metal'|'rubber'` — one engine renders coins, cards/tags, shaped
  tokens and rubber-stamp dies. `CF.substrate` (app/js/substrate.js) is the only place
  that interprets it. Circle docs keep a legacy `doc.coin` mirror for old clients.
  **Never regress coins:** the parity harness + frozen baselines live in `private/parity/`.
- **Shade system:** 0 = full dark laser mark, 100 = bare metal (knockout). Not color.
- Elements (`app/js/elements.js`): text, arctext, symbol, symbolring, ringband, banner,
  image, shape, outline, qr (offline encoder in qr.js), frame. Ring presets and the other
  ring geometry are round-only (`CF.substrate.radiusMM(doc) !== null` is the gate);
  templates span Coins/Cards/Tokens/Stamps categories.
- Entitlement is **server-authoritative**: the `stripeRole` custom claim (set only by the
  Stripe webhook) is the source of truth. Client-side tier checks are UX only. Security is
  `firestore.rules` + `storage.rules`. The `tier` field in `users/{uid}` is frozen to clients.
- Desktop = Electron (`electron/`), contextIsolation + sandbox + nodeIntegration:false, IPC
  path guards. The AI Assistant is a local MCP server (`electron/mcp-server.js`) bound to
  127.0.0.1 with a per-start bearer token — free, no gate.
- Match the surrounding code's style. Keep the no-framework / no-build philosophy.

## Key files
- `app/js/`: util, geometry, substrate (blank model + shape registry), qr (offline QR
  encoder), symbols, glyphs, fonts(+fonts-data), imagetools, ai, elements, store (doc +
  undo), ringpresets, templates, renderer, outline, interactions, inspector, panels,
  exporter, projects (local IndexedDB + native), cloudprojects (Pro slots), billing
  (Stripe), auth (hosted gate), assistant + mcpbridge (AI), mobile, app.
- `site/` landing + legal pages (`privacy-policy.html`, `terms-of-service.html`, `contact-us.html`).
- `docs/` manuals — embedded into the app via `node tools/embed-docs.js` (F1 help).
- `firestore.rules`, `storage.rules`, `firebase.json`, `extensions/` (Stripe extension manifest).

## Release ritual
1. Bump `package.json` version → `node tools/stamp-version.js` (syncs `?v=` cache-busters).
2. If docs changed: `node tools/embed-docs.js`.
3. Test on preview servers (`.claude/launch.json`: coinforge11=8124 app, coinforge-site=8125 site).
4. Deploy: `npx firebase deploy --only hosting[,firestore:rules,storage]`.
5. Desktop exe: build in-repo (`dist/` is gitignored) with `npm run dist` — or without
   node: `ELECTRON_RUN_AS_NODE=1 ELECTRON_NO_ASAR=1 node_modules/electron/dist/electron.exe
   private/parity/run-builder.js --win` — then smoke-boot the portable exe →
   `gh release create vX.Y.Z dist\*.exe`.
6. **Push the source commit BEFORE `gh release create`** so the tag lands on the right commit.
7. Every production deploy needs the user's explicit "deploy" (agent permission gate) —
   build + verify first, then deploy on their word.
- Node on this machine: portable node in the session scratchpad (re-extract from `node.zip`
  if temp-swept — `node` is not on PATH by default). gh CLI at `C:\Program Files\GitHub CLI\gh.exe`.

## The golden rule
**Never regress the live coin path.** It's the working, paid product. Any refactor must
leave coins rendering/exporting identically — verify before shipping anything on top.

## Status — multi-substrate expansion SHIPPED in v1.7.0
Coins / Cards / Tokens / Rubber stamps all live (web + desktop + MCP tools + docs), with
coins verified pixel-identical to v1.6 at every phase. Remaining from that plan: the
**Pro template & asset vault** (no infrastructure exists yet — needs its own design
phase) and a landing-page refresh for the new substrates. See `private/JOURNAL.md` →
"WHERE WE ARE RIGHT NOW" for live status, verification rituals, and environment tricks
(portable node is often missing — electron-as-node covers firebase/embed-docs/builder).
