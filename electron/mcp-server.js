/* ============================================================
   CoinForge Studio — mcp-server.js (Electron main process)

   A dependency-free MCP server (Model Context Protocol,
   Streamable HTTP transport) that lets the user's own AI —
   Claude Desktop, Claude Code, or any MCP client — design coins
   in the RUNNING app. Tools execute in the renderer (where the
   CF engine lives) via an exec() bridge supplied by main.js.

   Security model:
   - binds 127.0.0.1 only, random port
   - every request needs "Authorization: Bearer <token>"
     (token is random per enable, shown only in the app UI)
   - no CORS headers → browsers cannot call it from web pages
   - a Pro account link is required before main.js will start it

   Protocol notes: JSON-RPC 2.0 over POST. We respond with plain
   JSON (the spec's non-streaming option). GET → 405 (no
   server-push). Notifications → 202. Lenient about sessions.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

/* ---------- tool catalog (schemas the client sees) ---------- */
const obj = (props, required) => ({ type: 'object', properties: props || {}, ...(required ? { required } : {}) });
const S = { str: { type: 'string' }, num: { type: 'number' }, any: {} };

const TOOLS = [
  {
    name: 'new_coin',
    description: 'Start a fresh coin design. Diameter in mm (challenge-coin standards: 38.1 = 1.5", 44.45 = 1.75" (most common), 50.8 = 2").',
    inputSchema: obj({ diameter_mm: S.num, name: S.str }),
  },
  {
    name: 'get_design',
    description: 'Get the current design as JSON (element image data is elided). Useful to inspect ids and exact properties before updating.',
    inputSchema: obj({}),
  },
  {
    name: 'set_design',
    description: 'Replace the whole design with a document previously obtained from get_design (edited as needed). The escape hatch for bulk changes.',
    inputSchema: obj({ doc: { type: 'object' } }, ['doc']),
  },
  {
    name: 'list_element_types',
    description: 'List every element type (text, arctext, symbol, symbolring, ringband, banner, image, shape) with its editable properties, ranges and units — the authoritative parameter reference for add_element/update_element.',
    inputSchema: obj({}),
  },
  {
    name: 'add_element',
    description: 'Add one element to the coin. props follow list_element_types (all mm/degrees; x/y offset from coin center, 0° = 12 o\'clock; shade 0 = engraved dark, 100 = bare metal knockout). Returns the new element id, fit warnings, and a rendered preview.',
    inputSchema: obj({ type: S.str, props: { type: 'object' } }, ['type']),
  },
  {
    name: 'update_element',
    description: 'Patch properties of an existing element by id (see get_design / add_element results for ids). Returns fit warnings and a preview.',
    inputSchema: obj({ id: S.str, patch: { type: 'object' } }, ['id', 'patch']),
  },
  {
    name: 'remove_element',
    description: 'Delete an element by id.',
    inputSchema: obj({ id: S.str }, ['id']),
  },
  {
    name: 'list_ring_presets',
    description: 'List the curated ring presets (star circles, rope, beaded, reeded edge, military band…).',
    inputSchema: obj({}),
  },
  {
    name: 'apply_ring_preset',
    description: 'Add a curated ring preset, auto-sized to the coin. Returns ids of the created elements and a preview.',
    inputSchema: obj({ id: S.str }, ['id']),
  },
  {
    name: 'list_templates',
    description: 'List the complete coin templates (Veteran Eagle, Police, Fire, Wedding…).',
    inputSchema: obj({}),
  },
  {
    name: 'apply_template',
    description: 'Replace the current design with a complete template — a strong starting point to then personalize with update_element.',
    inputSchema: obj({ id: S.str }, ['id']),
  },
  {
    name: 'list_symbols',
    description: 'Search the vector symbol library (eagles, badges, crosses, anchors, wreaths…). Optional query filters by name/category.',
    inputSchema: obj({ query: S.str }),
  },
  {
    name: 'list_fonts',
    description: 'List available font families and weights.',
    inputSchema: obj({}),
  },
  {
    name: 'preview',
    description: 'Render the current coin as an image. metal: brass|silver|copper|black. Look at this after changes — fix overlaps and crowding before finishing.',
    inputSchema: obj({ metal: S.str, size_px: S.num }),
  },
  {
    name: 'check_fit',
    description: 'Heuristic fit report: elements that poke past the coin\'s safe margin, empty designs, suspicious sizes. Cheap to call often.',
    inputSchema: obj({}),
  },
  {
    name: 'export_art',
    description: 'Export laser-ready art: DPI-exact grayscale PNG written to Documents\\CoinForge Projects\\exports. Returns the file path and a preview.',
    inputSchema: obj({ dpi: S.num }),
  },
  {
    name: 'save_project',
    description: 'Save the current design as a named project in the app\'s project manager.',
    inputSchema: obj({ name: S.str }),
  },
];

/* ---------- the design-guide resource ---------- */
const DESIGN_GUIDE = `# CoinForge design guide (for AI assistants)

## Coordinate system
- Units are millimetres. Origin = coin center. x → right, y → down.
- Angles in degrees, 0° = 12 o'clock, clockwise.
- The coin is a circle of diameter \`coin.diameterMM\` with a safe margin
  \`coin.marginMM\` (default 2mm) — keep art inside radius − margin.

## Shade (there is no color)
- Fiber lasers mark metal darker or leave it bare. \`shade\` 0 = full dark mark,
  100 = bare metal. Classic minted look: dark ring band + text at shade 100
  ("knockout") on top of it.

## What makes a coin look professionally minted
- A frame: ring band, star ring, or rope edge 1.5–3mm inside the rim.
- Arc text hugging the frame: top text and bottom text on the SAME radius,
  sized 3–5mm for a 44.45mm coin. Use 'top' and 'bottom' arcs — the engine
  keeps both upright automatically.
- One strong center element (symbol/image) ~40–55% of coin diameter.
- Small separators (stars, dots) between top and bottom arc text at 90°/270°.
- Breathing room: don't let text touch rings; ~1mm gaps minimum. Check with
  preview and check_fit after every couple of changes.

## Recommended workflow
1. new_coin (or apply_template, then personalize)
2. apply_ring_preset for the frame
3. add_element arctext (top), arctext (bottom), symbol/banner/text center
4. preview → adjust sizes/radii with update_element → check_fit
5. save_project + export_art

## Typical values (44.45mm coin)
- ringband: radiusMM 19–20, thicknessMM 3–5
- arc text: radiusMM 17–19, sizeMM 3.5–4.5, shade 100 if on a band
- center symbol: sizeMM 18–26, y ≈ 0 (or −1 if bottom banner exists)
- banner: wMM 26–32, hMM 6–8, y ≈ 12–15
`;

/* ---------- server ---------- */
let server = null;
let state = null;

function start({ exec, exportsDir, appVersion }) {
  if (server) return Promise.resolve(publicState());
  const token = crypto.randomBytes(24).toString('base64url');

  server = http.createServer((req, res) => {
    /* reject anything not addressed to loopback by name — blocks the
       DNS-rebinding vector where a web page resolves its own host to
       127.0.0.1 and tries to reach us */
    const host = (req.headers['host'] || '').split(':')[0].toLowerCase();
    if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403).end(); return; }

    /* auth first, always — constant-time compare so the token can't be
       recovered byte-by-byte via response timing */
    const expected = 'Bearer ' + token;
    const provided = req.headers['authorization'] || '';
    const okAuth = provided.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!okAuth) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'unauthorized' }));
    }
    if (req.method === 'GET') { res.writeHead(405).end(); return; }
    if (req.method === 'DELETE') { res.writeHead(200).end(); return; } /* session teardown */
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }

    let body = '';
    req.on('data', c => { body += c; if (body.length > 30 * 1024 * 1024) req.destroy(); });
    req.on('end', async () => {
      let msg;
      try { msg = JSON.parse(body); } catch (e) {
        return sendJSON(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
      }
      const messages = Array.isArray(msg) ? msg : [msg];
      const replies = [];
      for (const m of messages) {
        if (m.id === undefined || m.id === null) continue; /* notification */
        replies.push(await handle(m, exec, exportsDir, appVersion));
      }
      if (!replies.length) { res.writeHead(202).end(); return; }
      const out = Array.isArray(msg) ? replies : replies[0];
      sendJSON(res, 200, out, { 'Mcp-Session-Id': state.session });
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      state = {
        port: server.address().port,
        token,
        session: crypto.randomBytes(8).toString('hex'),
        startedAt: Date.now(),
        calls: 0,
      };
      resolve(publicState());
    });
    server.on('error', reject);
  });
}

function stop() {
  if (server) { try { server.close(); } catch (e) { } }
  server = null;
  state = null;
}

const publicState = () => state
  ? { running: true, port: state.port, token: state.token, url: `http://127.0.0.1:${state.port}/mcp`, calls: state.calls }
  : { running: false };

function sendJSON(res, code, data, extra) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, extra || {}));
  res.end(JSON.stringify(data));
}

const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

async function handle(m, exec, exportsDir, appVersion) {
  try {
    switch (m.method) {
      case 'initialize': {
        const asked = m.params && m.params.protocolVersion;
        return rpcResult(m.id, {
          protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[1],
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'coinforge-studio', title: 'CoinForge Studio', version: appVersion || '0.0.0' },
          instructions: 'You are connected to a LIVE CoinForge Studio window — the user watches every change. ' +
            'Read the coinforge://design-guide resource first. Work in small steps and look at preview images; ' +
            'call check_fit before declaring a design done.',
        });
      }
      case 'ping':
        return rpcResult(m.id, {});
      case 'tools/list':
        return rpcResult(m.id, { tools: TOOLS });
      case 'resources/list':
        return rpcResult(m.id, {
          resources: [{
            uri: 'coinforge://design-guide',
            name: 'design-guide',
            title: 'CoinForge coin-design guide',
            description: 'Coordinate system, shade semantics, and what makes a coin look professionally minted. Read before designing.',
            mimeType: 'text/markdown',
          }],
        });
      case 'resources/read': {
        const uri = m.params && m.params.uri;
        if (uri !== 'coinforge://design-guide') return rpcError(m.id, -32602, 'unknown resource');
        return rpcResult(m.id, { contents: [{ uri, mimeType: 'text/markdown', text: DESIGN_GUIDE }] });
      }
      case 'tools/call': {
        const name = m.params && m.params.name;
        const args = (m.params && m.params.arguments) || {};
        if (!TOOLS.find(t => t.name === name)) return rpcError(m.id, -32602, 'unknown tool ' + name);
        state.calls++;
        const r = await exec(name, args); /* runs in the renderer, 30s timeout */
        const content = [];
        if (r && r.error) return rpcResult(m.id, { content: [{ type: 'text', text: 'Error: ' + r.error }], isError: true });

        /* export_art: main writes the file; renderer sent base64 */
        if (name === 'export_art' && r && r.fileB64) {
          fs.mkdirSync(exportsDir, { recursive: true });
          const fname = (r.fileName || 'coin-export.png')
            .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
            .replace(/^\.+/, '_'); /* no leading dots — can't become '..' */
          const p = path.join(exportsDir, fname);
          /* never trust a renderer-supplied name to stay in the folder */
          const root = path.resolve(exportsDir);
          if (path.resolve(p) !== root && !path.resolve(p).startsWith(root + path.sep)) {
            return rpcError(m.id, -32603, 'invalid export path');
          }
          fs.writeFileSync(p, Buffer.from(r.fileB64, 'base64'));
          r.json = Object.assign({ saved_to: p }, r.json || {});
          delete r.fileB64;
        }
        if (r && r.json !== undefined) content.push({ type: 'text', text: JSON.stringify(r.json, null, 1) });
        if (r && r.text) content.push({ type: 'text', text: r.text });
        if (r && r.imageB64) content.push({ type: 'image', data: r.imageB64, mimeType: 'image/png' });
        if (!content.length) content.push({ type: 'text', text: 'ok' });
        return rpcResult(m.id, { content });
      }
      default:
        return rpcError(m.id, -32601, 'method not found: ' + m.method);
    }
  } catch (e) {
    return rpcError(m.id, -32603, String(e && e.message || e));
  }
}

module.exports = { start, stop, status: publicState };
