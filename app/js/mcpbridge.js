/* ============================================================
   CoinForge Studio — mcpbridge.js
   Renderer side of the AI assistant: executes MCP tool calls
   against the live CF engine and answers back to the Electron
   main process (electron/mcp-server.js). Inert in browsers.

   Every mutating tool returns fit warnings + a small preview so
   the AI can see what it just did and self-correct.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  if (!window.native || !window.native.onMcpExec) return;
  const U = CF.util, S = () => CF.store;

  /* ---------- helpers ---------- */
  const PREVIEW_PX = 360;
  function previewB64(sizePx, metal) {
    const cnv = CF.renderer.thumbnail(S().doc, sizePx || PREVIEW_PX, metal || undefined);
    return cnv.toDataURL('image/png').split(',')[1];
  }

  /* strip embedded image data so get_design stays token-friendly */
  function slimDoc() {
    const doc = JSON.parse(JSON.stringify(S().doc));
    for (const el of doc.elements) {
      if (el.src) el.src = '[embedded image, ' + Math.round(el.src.length / 1024) + ' KB — preserved, not shown]';
    }
    return doc;
  }

  /* heuristic outer extent (mm from center) per element */
  function extentOf(el) {
    if (el.type === 'ringband') return (el.radiusMM || 0) + (el.thicknessMM || 0) / 2;
    if (el.type === 'symbolring') return (el.radiusMM || 0) + (el.itemSizeMM || 0) / 2;
    if (el.type === 'arctext') return el.radiusMM || 0;
    const b = CF.Elements.boundsOf(el);
    return Math.hypot(el.x || 0, el.y || 0) + Math.hypot(b.w, b.h) / 2;
  }

  /* edge decorations legitimately live in the safe margin, near the rim */
  const isEdgeDecor = (el) => el.type === 'ringband' || el.type === 'symbolring';

  function checkFit() {
    const doc = S().doc;
    const warnings = [];
    const radius = doc.coin.diameterMM / 2;
    const safe = radius - (doc.coin.marginMM || 2);
    if (!doc.elements.length) warnings.push('The design is empty.');
    for (const el of doc.elements) {
      if (!el.visible) continue;
      const ext = extentOf(el);
      if (ext > radius + 0.05) {
        /* past the physical coin edge — this WILL be cut off */
        warnings.push(`"${el.name || el.type}" (id ${el.id}) reaches ~${ext.toFixed(1)}mm from center, past the ${radius.toFixed(1)}mm coin edge — it will be cut off. Shrink it or move it inward.`);
      } else if (!isEdgeDecor(el) && ext > safe + 0.05) {
        /* text/center art creeping into the rim margin — gentle nudge */
        warnings.push(`"${el.name || el.type}" (id ${el.id}) sits ~${ext.toFixed(1)}mm out, inside the ${safe.toFixed(1)}mm safe margin near the rim. Fine for edge decoration, but pull center art/text in a little for a cleaner look.`);
      }
    }
    const arcs = doc.elements.filter(e => e.visible && e.type === 'arctext');
    const bands = doc.elements.filter(e => e.visible && e.type === 'ringband');
    for (const a of arcs) {
      for (const b of bands) {
        const gap = Math.abs((a.radiusMM || 0) - (b.radiusMM || 0));
        const need = ((a.sizeMM || 4) + (b.thicknessMM || 3)) / 2;
        if (gap > 0.01 && gap < need - 0.05 && (a.shade || 0) !== 100) {
          warnings.push(`Arc text id ${a.id} may collide with ring band id ${b.id} (radii ${a.radiusMM}mm vs ${b.radiusMM}mm). Either separate them or set the text shade to 100 (knockout on the band).`);
        }
      }
    }
    return warnings;
  }

  const mutationResult = (extra) => ({
    json: Object.assign({ warnings: checkFit() }, extra || {}),
    imageB64: previewB64(),
  });

  /* element parameter reference straight from the inspector metadata */
  function describeTypes() {
    const out = {};
    for (const [type, h] of Object.entries(CF.Elements.handlers)) {
      if (type === 'outline') continue; /* generated via its own tool/modal */
      const common = { x: 'mm offset from center', y: 'mm offset from center', rotation: 'degrees', shade: '0 dark mark … 100 bare metal', opacity: '0–1', name: 'display name', visible: 'boolean' };
      const props = {};
      for (const f of (h.inspector || [])) {
        if (!f.key || f.key.startsWith('_')) continue;
        let d = f.label || f.key;
        if (f.min !== undefined) d += ` (${f.min}–${f.max}${f.unit ? ' ' + f.unit : ''})`;
        if (f.options) d += ' [' + f.options.map(o => o[0]).join(' | ') + ']';
        props[f.key] = d;
      }
      out[type] = { label: h.label, common, props, defaults: h.defaults() };
      if (out[type].defaults.src !== undefined) out[type].defaults.src = null;
    }
    return out;
  }

  /* ---------- tools ---------- */
  const tools = {
    async new_coin(a) {
      S().newDoc(U.clamp(parseFloat(a.diameter_mm) || 44.45, 5, 300), a.name || 'Untitled Coin');
      CF.renderer.fit();
      return mutationResult({ diameter_mm: S().doc.coin.diameterMM, name: S().doc.name });
    },

    async get_design() {
      return { json: slimDoc() };
    },

    async set_design(a) {
      if (!a.doc || !Array.isArray(a.doc.elements)) return { error: 'doc must be a design object with an elements array' };
      /* keep any elided image markers from clobbering real image data */
      const cur = S().doc;
      for (const el of a.doc.elements) {
        if (typeof el.src === 'string' && el.src.startsWith('[embedded image')) {
          const orig = cur && cur.elements.find(e => e.id === el.id);
          el.src = orig ? orig.src : null;
        }
      }
      S().setDoc(a.doc, { keepProject: true });
      CF.renderer.fit();
      return mutationResult();
    },

    async list_element_types() {
      return { json: describeTypes() };
    },

    async add_element(a) {
      if (!CF.Elements.handlers[a.type]) return { error: 'unknown type ' + a.type + ' — call list_element_types' };
      const el = CF.Elements.create(a.type, a.props || {});
      S().addElement(el);
      return mutationResult({ id: el.id, type: el.type });
    },

    async update_element(a) {
      const el = S().byId(a.id);
      if (!el) return { error: 'no element with id ' + a.id };
      S().mutate(d => {
        const t = d.elements.find(e => e.id === a.id);
        for (const [k, v] of Object.entries(a.patch || {})) {
          if (k === 'id' || k === 'type') continue;
          if (k === 'fx' && t.fx && typeof v === 'object') Object.assign(t.fx, v);
          else t[k] = v;
        }
      });
      return mutationResult({ id: a.id });
    },

    async remove_element(a) {
      const el = S().byId(a.id);
      if (!el) return { error: 'no element with id ' + a.id };
      S().mutate(d => { d.elements = d.elements.filter(e => e.id !== a.id); });
      return mutationResult({ removed: a.id });
    },

    async list_ring_presets() {
      return { json: CF.RingPresets.all().map(p => ({ id: p.id, label: p.label, desc: p.desc })) };
    },

    async apply_ring_preset(a) {
      const p = CF.RingPresets.get(a.id);
      if (!p) return { error: 'unknown preset ' + a.id + ' — call list_ring_presets' };
      const before = new Set(S().doc.elements.map(e => e.id));
      CF.RingPresets.apply(a.id);
      const created = S().doc.elements.filter(e => !before.has(e.id)).map(e => ({ id: e.id, type: e.type, name: e.name }));
      return mutationResult({ created });
    },

    async list_templates() {
      return { json: CF.Templates.all().map(t => ({ id: t.id, label: t.label, cat: t.cat, desc: t.desc })) };
    },

    async apply_template(a) {
      const t = CF.Templates.get(a.id);
      if (!t) return { error: 'unknown template ' + a.id + ' — call list_templates' };
      /* build(diameter) returns a complete doc object, not an element array */
      const D = S().doc ? S().doc.coin.diameterMM : 44.45;
      const built = t.build(D);
      S().setDoc(built, { keepProject: true });
      CF.renderer.fit();
      return mutationResult({ template: t.id, elements: built.elements.length });
    },

    async list_symbols(a) {
      const q = (a.query || '').toLowerCase();
      const all = CF.Symbols.all()
        .filter(s => !q || s.id.includes(q) || (s.label || '').toLowerCase().includes(q) || (s.cat || '').includes(q))
        .map(s => ({ id: s.id, label: s.label, cat: s.cat }));
      return { json: { count: all.length, symbols: all.slice(0, 120) } };
    },

    async list_fonts() {
      return { json: CF.Fonts.families().map(f => ({ family: f.family, weights: f.weights, note: f.note || '' })) };
    },

    async preview(a) {
      return {
        json: { coin: S().doc.coin, elements: S().doc.elements.length, warnings: checkFit() },
        imageB64: previewB64(U.clamp(parseInt(a.size_px) || PREVIEW_PX, 120, 1024), a.metal),
      };
    },

    async check_fit() {
      const w = checkFit();
      return { json: { ok: w.length === 0, warnings: w } };
    },

    async export_art(a) {
      const dpi = U.clamp(parseInt(a.dpi) || S().doc.dpi || 1016, 96, 2400);
      const cnv = CF.renderer.exportArt(S().doc, dpi);
      const b64 = cnv.toDataURL('image/png').split(',')[1];
      const safeName = (S().doc.name || 'coin').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-');
      return {
        json: { dpi, px: cnv.width, mm: S().doc.coin.diameterMM },
        fileB64: b64,
        fileName: safeName + '-' + dpi + 'dpi.png',
        imageB64: previewB64(),
      };
    },

    async save_project(a) {
      if (a.name) S().mutate(d => { d.name = String(a.name).slice(0, 120); });
      await CF.projects.saveCurrent();
      return { json: { saved: true, name: S().doc.name, projectId: S().projectId } };
    },
  };

  /* ---------- dispatcher ---------- */
  window.native.onMcpExec(async ({ id, tool, args }) => {
    let result;
    try {
      if (!S().doc && tool !== 'new_coin') S().newDoc();
      const fn = tools[tool];
      result = fn ? await fn(args || {}) : { error: 'unimplemented tool ' + tool };
    } catch (e) {
      console.warn('mcp tool failed:', tool, e);
      result = { error: String(e && e.message || e) };
    }
    window.native.mcpResult(id, result);
  });
})();
