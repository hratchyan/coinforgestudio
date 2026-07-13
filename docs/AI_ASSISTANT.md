# AI Assistant (MCP) — design coins with Claude

*Free. The desktop app only.*

CoinForge can hand a set of controls to your own AI — **Claude Desktop**,
**Claude Code**, or any app that speaks **MCP** (the Model Context Protocol).
You chat with your AI as usual ("make me a 2-inch brass fire-station coin"),
and it designs the coin **in your CoinForge window while you watch** — placing
rings, arc text, and symbols, checking its own work against a rendered preview,
and handing you laser-ready art.

Nothing about your design leaves your computer. The AI runs wherever you already
run it; CoinForge just exposes a small control panel on `127.0.0.1` that only
your machine can reach.

## What you need

- The **desktop** CoinForge app (this feature isn't in the browser version).
- An MCP-capable AI client — e.g. Claude Desktop or Claude Code.
- That's it — no account, no sign-in. It's free.

## Setup

In the desktop app: **Tools → AI Assistant (MCP)…**, then click **Start assistant
server**. It shows two ready-made config snippets — copy the one for your client:

- **Claude Code** — paste the one-line `claude mcp add …` command in a terminal.
- **Claude Desktop** — add the shown block to your `claude_desktop_config.json`
  (Settings → Developer → Edit Config), then restart Claude Desktop.

That's it. Ask your AI for a coin.

## How to get great results

The assistant reads a built-in **design guide** first, so it already knows the
coin coordinate system and what makes a coin look minted. Still, you get the best
coins when you:

- **Say the size and metal.** "1.75-inch brass" beats "a coin."
- **Give the words exactly.** Motto, station name, year, names — spell them out.
- **Describe the center.** "Eagle," "maltese cross," "praying hands," or "leave
  room, I'll drop a photo in myself."
- **Ask it to check.** "Preview it and fix any overlaps" — it can see its own
  render and adjust.

You can always take over by hand at any point — it's your canvas. And when you're
happy, `export_art` drops a DPI-exact PNG into
`Documents\CoinForge Projects\exports`, or just hit **Export for Engraving** as usual.

## What the assistant can and can't do

**Can:** start coins, cards, shaped tokens and rubber-stamp dies; apply ring presets
and full templates (coins, cards, tokens, stamps); add/edit/remove text, arc text,
symbols, banners, shapes, frames and offline QR codes; search the symbol library;
render previews; check fit; save projects; and export laser-ready PNGs.

**Can't (on purpose):** touch your files outside the exports folder, spend money,
change your account, or reach the internet. The server binds to your machine only,
requires a secret token that changes every time it starts, and never accepts
connections from web pages.

## Privacy & safety

- The server listens on `127.0.0.1` (your computer) only — not your network.
- Every request needs a bearer token shown only in the app; it's regenerated on
  each start.
- Your AI subscription, your machine, your data. CoinForge sends nothing to us.

## Troubleshooting

- **Claude can't connect.** Confirm the server shows *● Running*, and that you
  copied the current token (it changes each start). Restart the server and re-copy.
- **The coin looks crowded.** Ask the AI to "check fit and tidy it up," or nudge
  sizes yourself — every element stays fully editable by hand.
