/* ============================================================
   CoinForge Studio — inspector.js
   Right panel: coin/document settings + selected-element
   properties (schema-driven from element handlers).
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;
  let root = null;

  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  const setPath = (obj, path, v) => {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]]) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  };

  function commitField(el, key, value) {
    S().mutate(d => {
      const t = d.elements.find(x => x.id === el.id);
      if (t) {
        setPath(t, key, value);
        if (t.type === 'image' && key.startsWith('fx')) CF.Elements.invalidateImage(t.id);
        if (t.type === 'image' && (key === 'mask' || key.startsWith('mask'))) CF.Elements.invalidateImage(t.id);
      }
    });
  }

  /* ---------- field builders ---------- */
  function fieldRow(label, control) {
    return U.el('div', { class: 'cf-field' },
      label ? U.el('label', { class: 'cf-field-label' }, label) : null,
      control);
  }

  function numberField(el, f) {
    const val = getPath(el, f.key);
    const inp = U.el('input', { class: 'cf-input', type: 'number', value: val === undefined ? '' : U.round(val, 3), min: f.min, max: f.max, step: f.step || 1 });
    inp.addEventListener('change', () => {
      let v = parseFloat(inp.value);
      if (isNaN(v)) return;
      v = U.clamp(v, f.min !== undefined ? f.min : -1e9, f.max !== undefined ? f.max : 1e9);
      commitField(el, f.key, v);
    });
    const wrap = U.el('div', { class: 'cf-num-wrap' }, inp, f.unit ? U.el('span', { class: 'cf-unit' }, f.unit) : null);
    return fieldRow(f.label, wrap);
  }

  function sliderField(el, f) {
    const val = getPath(el, f.key);
    const inp = U.el('input', { class: 'cf-slider', type: 'range', value: val === undefined ? 0 : val, min: f.min, max: f.max, step: f.step || 1 });
    const out = U.el('span', { class: 'cf-slider-val' }, String(val === undefined ? '' : U.round(val, 2)));
    let dragging = false;
    inp.addEventListener('input', () => {
      if (!dragging) { dragging = true; S().beginTransient(); }
      const t = S().byId(el.id);
      if (t) {
        setPath(t, f.key, parseFloat(inp.value));
        if (t.type === 'image') CF.Elements.invalidateImage(t.id);
      }
      out.textContent = inp.value;
      S().emitTransient();
    });
    inp.addEventListener('change', () => { dragging = false; S().endTransient(); });
    return fieldRow(f.label, U.el('div', { class: 'cf-slider-wrap' }, inp, out));
  }

  function textField(el, f, multi) {
    const inp = multi
      ? U.el('textarea', { class: 'cf-input cf-textarea', rows: 2 })
      : U.el('input', { class: 'cf-input', type: 'text' });
    inp.value = getPath(el, f.key) || '';
    inp.addEventListener('change', () => commitField(el, f.key, inp.value));
    inp.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' && !multi) inp.blur();
    });
    return fieldRow(f.label, inp);
  }

  function selectField(el, f) {
    const sel = U.el('select', { class: 'cf-input' });
    for (const [v, label] of f.options) {
      sel.appendChild(U.el('option', { value: v, selected: String(getPath(el, f.key)) === String(v) ? '' : null }, label));
    }
    sel.addEventListener('change', () => {
      let v = sel.value;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      commitField(el, f.key, v);
    });
    return fieldRow(f.label, sel);
  }

  function checkboxField(el, f) {
    const inp = U.el('input', { type: 'checkbox' });
    inp.checked = !!getPath(el, f.key);
    inp.addEventListener('change', () => commitField(el, f.key, inp.checked));
    return U.el('div', { class: 'cf-field cf-field-check' },
      U.el('label', { class: 'cf-check-label' }, inp, ' ' + f.label));
  }

  function fontField(el, f) {
    const sel = U.el('select', { class: 'cf-input' });
    const groups = { bundled: U.el('optgroup', { label: 'Bundled (always available)' }), system: U.el('optgroup', { label: 'System fonts' }) };
    for (const fam of CF.Fonts.families()) {
      const opt = U.el('option', { value: fam.family, selected: el.font === fam.family ? '' : null },
        fam.family + (fam.note ? ' — ' + fam.note : ''));
      groups[fam.kind].appendChild(opt);
    }
    sel.appendChild(groups.bundled);
    sel.appendChild(groups.system);
    sel.addEventListener('change', () => {
      S().mutate(d => {
        const t = d.elements.find(x => x.id === el.id);
        if (t) {
          t.font = sel.value;
          const ws = CF.Fonts.weightsFor(sel.value);
          if (!ws.includes(t.weight)) t.weight = ws.includes(700) ? 700 : ws[0];
        }
      });
    });
    return fieldRow(f.label, sel);
  }

  function weightField(el, f) {
    const ws = CF.Fonts.weightsFor(el.font);
    const names = { 100: 'Thin', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
    const sel = U.el('select', { class: 'cf-input' });
    for (const w of ws) sel.appendChild(U.el('option', { value: w, selected: el.weight === w ? '' : null }, `${names[w] || w} (${w})`));
    sel.addEventListener('change', () => commitField(el, f.key || 'weight', parseInt(sel.value, 10)));
    return fieldRow(f.label, sel);
  }

  function symbolPickField(el) {
    const cur = el.glyph ? el.glyph.char : (CF.Symbols.get(el.symbolId || '') || {}).label || el.symbolId;
    const btn = U.el('button', { class: 'cf-btn cf-btn-block' }, `Symbol: ${cur} — change…`);
    btn.addEventListener('click', () => {
      CF.pickers.symbol(pick => {
        S().mutate(d => {
          const t = d.elements.find(x => x.id === el.id);
          if (!t) return;
          if (pick.glyph) { t.glyph = pick.glyph; t.symbolId = null; }
          else { t.symbolId = pick.symbolId; t.glyph = null; }
        });
      });
    });
    return fieldRow(null, btn);
  }

  function shapeParamsFields(el, frag) {
    const kindDef = CF.Elements.handlers.shape.kinds[el.kind];
    if (!kindDef) return;
    for (const [pk, [dflt, min, max, step]] of Object.entries(kindDef.params)) {
      frag.appendChild(numberField(el, { key: 'params.' + pk, label: pk.replace(/Pct$/, ' %').replace(/^\w/, c => c.toUpperCase()), min, max, step }));
    }
  }

  function imageToolsField(el) {
    const wrap = U.el('div', { class: 'cf-btn-col' });
    const bEdit = U.el('button', { class: 'cf-btn cf-btn-block' }, '✂ Edit / Remove Background…');
    bEdit.addEventListener('click', () => CF.bgstudio.openForElement(el.id));
    const bReplace = U.el('button', { class: 'cf-btn cf-btn-block' }, '⇄ Replace image…');
    bReplace.addEventListener('click', () => CF.flows.replaceImage(el.id));
    const bFit = U.el('button', { class: 'cf-btn cf-btn-block' }, '◎ Fit to center');
    bFit.addEventListener('click', () => {
      S().mutate(d => {
        const t = d.elements.find(x => x.id === el.id);
        if (!t) return;
        const D = CF.substrate.maxDimMM(d);
        t.x = 0; t.y = 0;
        const aspect = t.natH / t.natW;
        const target = D * 0.62;
        t.widthMM = aspect >= 1 ? target / aspect : target;
      });
    });
    wrap.appendChild(bEdit);
    wrap.appendChild(bReplace);
    wrap.appendChild(bFit);
    return wrap;
  }

  function buildField(el, f, frag) {
    if (f.showIf && !f.showIf(el)) return;
    switch (f.kind) {
      case 'number': frag.appendChild(numberField(el, f)); break;
      case 'slider': frag.appendChild(sliderField(el, f)); break;
      case 'text': frag.appendChild(textField(el, f, false)); break;
      case 'textarea': frag.appendChild(textField(el, f, true)); break;
      case 'select': frag.appendChild(selectField(el, f)); break;
      case 'checkbox': frag.appendChild(checkboxField(el, f)); break;
      case 'font': frag.appendChild(fontField(el, f)); break;
      case 'weight': frag.appendChild(weightField(el, f)); break;
      case 'symbolpick': frag.appendChild(symbolPickField(el)); break;
      case 'shapeparams': shapeParamsFields(el, frag); break;
      case 'imagetools': frag.appendChild(imageToolsField(el)); break;
      case 'outlinetools': {
        const b = U.el('button', { class: 'cf-btn cf-btn-block' }, '↻ Regenerate outline…');
        b.addEventListener('click', () => CF.outline.openModal());
        frag.appendChild(U.el('p', { class: 'cf-hint' }, 'Red cut path — exports as the red SVG layer, never engraves. Regenerate after editing the art.'));
        frag.appendChild(fieldRow(null, b));
        break;
      }
    }
  }

  /* group assignment (groups = engraving passes) */
  function groupField(ids, current) {
    const sel = U.el('select', { class: 'cf-input' });
    sel.appendChild(U.el('option', { value: '', selected: !current ? '' : null }, 'No group'));
    for (const g of S().doc.groups) {
      sel.appendChild(U.el('option', { value: g.id, selected: current === g.id ? '' : null }, g.name));
    }
    sel.appendChild(U.el('option', { value: '__new' }, '+ New group…'));
    sel.addEventListener('change', () => {
      if (sel.value === '__new') {
        const g = S().addGroup();
        S().assignToGroup(ids, g.id);
      } else {
        S().assignToGroup(ids, sel.value || null);
      }
    });
    return fieldRow('Group (engraving pass)', sel);
  }

  function section(title, ...kids) {
    return U.el('div', { class: 'cf-section' },
      U.el('div', { class: 'cf-section-title' }, title),
      ...kids);
  }

  /* ---------- document / coin section ---------- */
  function coinSection() {
    const doc = S().doc;
    const frag = document.createDocumentFragment();
    const unit = S().ui.unit;

    /* name */
    const nameInp = U.el('input', { class: 'cf-input', type: 'text', value: doc.name });
    nameInp.addEventListener('change', () => S().mutate(d => { d.name = nameInp.value; }));
    nameInp.addEventListener('keydown', e => e.stopPropagation());
    frag.appendChild(fieldRow('Project name', nameInp));

    const sub = CF.substrate.get(doc);
    const isRound = sub.kind === 'circle';

    if (isRound) {
      /* diameter with unit toggle */
      const dval = unit === 'in' ? U.round(U.mm2in(sub.diameterMM), 3) : U.round(sub.diameterMM, 2);
      const dInp = U.el('input', { class: 'cf-input', type: 'number', step: unit === 'in' ? 0.005 : 0.5, min: 5, value: dval });
      const uSel = U.el('select', { class: 'cf-input cf-unit-sel' },
        U.el('option', { value: 'mm', selected: unit === 'mm' ? '' : null }, 'mm'),
        U.el('option', { value: 'in', selected: unit === 'in' ? '' : null }, 'in'));
      dInp.addEventListener('change', () => {
        let v = parseFloat(dInp.value);
        if (isNaN(v) || v <= 0) return;
        const mm = S().ui.unit === 'in' ? U.in2mm(v) : v;
        S().mutate(d => { d.substrate.diameterMM = U.clamp(mm, 5, 300); });
        CF.renderer.fit();
      });
      uSel.addEventListener('change', () => { S().setUI({ unit: uSel.value }); render(); });
      frag.appendChild(fieldRow('Coin diameter', U.el('div', { class: 'cf-num-wrap' }, dInp, uSel)));
    } else {
      /* card / token dimensions */
      const mkDim = (label, key, min, max) => {
        const inp = U.el('input', { class: 'cf-input', type: 'number', step: 0.5, min, max, value: U.round(sub[key] || 0, 2) });
        inp.addEventListener('change', () => {
          const v = parseFloat(inp.value);
          if (isNaN(v)) return;
          S().mutate(d => {
            d.substrate[key] = U.clamp(v, min, max);
            if (key === 'cornerRMM') d.substrate.kind = d.substrate.cornerRMM > 0 ? 'rounded' : 'rect';
          });
          CF.renderer.fit();
        });
        frag.appendChild(fieldRow(label, U.el('div', { class: 'cf-num-wrap' }, inp, U.el('span', { class: 'cf-unit' }, 'mm'))));
      };
      if (sub.kind === 'shape') {
        const shapeSel = U.el('select', { class: 'cf-input' });
        for (const id of CF.substrate.shapeIds()) {
          shapeSel.appendChild(U.el('option', { value: id, selected: sub.shape === id ? '' : null }, CF.substrate.shapeInfo(id).label));
        }
        shapeSel.addEventListener('change', () => { S().mutate(d => { d.substrate.shape = shapeSel.value; }); CF.renderer.fit(); });
        frag.appendChild(fieldRow('Shape', shapeSel));
        mkDim('Width', 'wMM', 10, 300);
        mkDim('Height', 'hMM', 10, 300);
      } else {
        mkDim('Width', 'wMM', 10, 300);
        mkDim('Height', 'hMM', 10, 300);
        mkDim('Corner radius', 'cornerRMM', 0, 20);
      }
    }

    const mInp = U.el('input', { class: 'cf-input', type: 'number', step: 0.25, min: 0, max: 15, value: sub.marginMM });
    mInp.addEventListener('change', () => S().mutate(d => { d.substrate.marginMM = U.clamp(parseFloat(mInp.value) || 0, 0, 15); }));
    frag.appendChild(fieldRow('Safe margin (guide)', U.el('div', { class: 'cf-num-wrap' }, mInp, U.el('span', { class: 'cf-unit' }, 'mm'))));

    /* material */
    const isRubber = doc.material === 'rubber';
    const matSel = U.el('select', { class: 'cf-input' },
      U.el('option', { value: 'metal', selected: !isRubber ? '' : null }, 'Metal / hard surface (engraved marks)'),
      U.el('option', { value: 'rubber', selected: isRubber ? '' : null }, 'Rubber stamp (raised die)'));
    matSel.addEventListener('change', () => { S().mutate(d => { d.material = matSel.value; }); render(); });
    frag.appendChild(fieldRow('Material', matSel));

    if (isRubber) {
      frag.appendChild(U.el('p', { class: 'cf-hint' },
        'Stamp die: design reads normally here — the export is mirrored and inverted so the raised art prints correctly.'));
    } else {
      /* metal preview */
      const metalSel = U.el('select', { class: 'cf-input' });
      for (const [id, m] of Object.entries(CF.renderer.metals)) {
        if (id === 'rubber') continue; /* material, not a metal finish */
        metalSel.appendChild(U.el('option', { value: id, selected: S().ui.metal === id ? '' : null }, m.label));
      }
      metalSel.addEventListener('change', () => S().setUI({ metal: metalSel.value }));
      frag.appendChild(fieldRow('Metal preview', metalSel));

      const markSel = U.el('select', { class: 'cf-input' },
        U.el('option', { value: 'dark', selected: !S().ui.markLight ? '' : null }, 'Dark marks (bare metal, steel, brass)'),
        U.el('option', { value: 'light', selected: S().ui.markLight ? '' : null }, 'Light marks (anodized / coated / painted)'));
      markSel.addEventListener('change', () => S().setUI({ markLight: markSel.value === 'light' }));
      frag.appendChild(fieldRow('Laser mark appears as', markSel));
    }

    const relief = U.el('input', { type: 'checkbox' });
    relief.checked = S().ui.relief;
    relief.addEventListener('change', () => S().setUI({ relief: relief.checked }));
    const guides = U.el('input', { type: 'checkbox' });
    guides.checked = S().ui.showGuides;
    guides.addEventListener('change', () => S().setUI({ showGuides: guides.checked }));
    frag.appendChild(U.el('div', { class: 'cf-field cf-field-check' },
      U.el('label', { class: 'cf-check-label' }, relief, ' Relief preview'),
      U.el('label', { class: 'cf-check-label' }, guides, ' Guides')));

    return section(isRubber ? 'Stamp' : isRound ? 'Coin' : sub.kind === 'shape' ? 'Token' : 'Card', frag);
  }

  /* ---------- align to blank (safe-margin box) ---------- */
  function alignSel(ids, mode) {
    const doc = S().doc;
    const { w, h } = CF.substrate.sizeMM(doc);
    const m = CF.substrate.marginMM(doc) || 0;
    const bw2 = w / 2 - m, bh2 = h / 2 - m;
    S().mutate(d => {
      for (const id of ids) {
        const t = d.elements.find(x => x.id === id);
        if (!t || CF.Elements.isRingLike(t)) continue;
        const b = CF.Elements.boundsOf(t);
        const a = U.deg2rad(t.rotation || 0);
        const ew = (Math.abs(b.w * Math.cos(a)) + Math.abs(b.h * Math.sin(a))) / 2;
        const eh = (Math.abs(b.w * Math.sin(a)) + Math.abs(b.h * Math.cos(a))) / 2;
        if (mode === 'left') t.x = -bw2 + ew;
        else if (mode === 'hcenter') t.x = 0;
        else if (mode === 'right') t.x = bw2 - ew;
        else if (mode === 'top') t.y = -bh2 + eh;
        else if (mode === 'vcenter') t.y = 0;
        else if (mode === 'bottom') t.y = bh2 - eh;
      }
    });
  }

  function alignRow(ids) {
    const row = U.el('div', { class: 'cf-btn-row cf-wrap' });
    const mk = (label, title, mode) => {
      const b = U.el('button', { class: 'cf-btn cf-btn-sm', title }, label);
      b.addEventListener('click', () => alignSel(ids, mode));
      row.appendChild(b);
    };
    mk('⇤', 'Align left (inside safe margin)', 'left');
    mk('↔', 'Center horizontally', 'hcenter');
    mk('⇥', 'Align right', 'right');
    mk('⤒', 'Align top', 'top');
    mk('↕', 'Center vertically', 'vcenter');
    mk('⤓', 'Align bottom', 'bottom');
    return row;
  }

  /* ---------- selection section ---------- */
  function selectionSection() {
    const els = S().selEls();
    if (!els.length) return null;

    if (els.length > 1) {
      const frag = document.createDocumentFragment();
      frag.appendChild(U.el('p', { class: 'cf-hint' }, `${els.length} elements selected`));
      const common = els.every(e => (e.groupId || null) === (els[0].groupId || null)) ? (els[0].groupId || null) : null;
      frag.appendChild(groupField(els.map(e => e.id), common));
      const row = U.el('div', { class: 'cf-btn-row' });
      const bC = U.el('button', { class: 'cf-btn' }, 'Center all');
      bC.addEventListener('click', () => S().mutate(d => els.forEach(e => { const t = d.elements.find(x => x.id === e.id); if (t) { t.x = 0; t.y = 0; } })));
      const bDel = U.el('button', { class: 'cf-btn danger' }, 'Delete');
      bDel.addEventListener('click', () => S().removeSelected());
      row.appendChild(bC); row.appendChild(bDel);
      frag.appendChild(row);
      frag.appendChild(U.el('div', { class: 'cf-field-label' }, 'Align to blank'));
      frag.appendChild(alignRow(els.map(e => e.id)));
      return section('Selection', frag);
    }

    const el = els[0];
    const h = CF.Elements.handlers[el.type];
    const frag = document.createDocumentFragment();

    /* type-specific fields */
    for (const f of (h.inspector || [])) buildField(el, f, frag);

    /* common */
    const common = document.createDocumentFragment();
    if (!CF.Elements.isRingLike(el)) {
      common.appendChild(numberField(el, { key: 'x', label: 'X (from center)', min: -200, max: 200, step: 0.25, unit: 'mm' }));
      common.appendChild(numberField(el, { key: 'y', label: 'Y (from center)', min: -200, max: 200, step: 0.25, unit: 'mm' }));
      common.appendChild(numberField(el, { key: 'rotation', label: 'Rotation', min: -360, max: 360, step: 1, unit: '°' }));
    }
    if (el.type !== 'outline') {
      common.appendChild(sliderField(el, { key: 'shade', label: 'Shade (0 = mark · 100 = bare metal)', min: 0, max: 100, step: 1 }));
      common.appendChild(sliderField(el, { key: 'opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.01 }));
    }
    common.appendChild(groupField([el.id], el.groupId || null));

    /* arrange */
    const arr = U.el('div', { class: 'cf-btn-row cf-wrap' });
    const mk = (label, title, fn) => {
      const b = U.el('button', { class: 'cf-btn cf-btn-sm', title }, label);
      b.addEventListener('click', fn);
      arr.appendChild(b);
    };
    mk('⦿ Center', 'Move to blank center', () => S().mutate(d => { const t = d.elements.find(x => x.id === el.id); if (t) { t.x = 0; t.y = 0; } }));
    mk('▲ Front', 'Bring to front', () => S().reorder(el.id, 'top'));
    mk('△ Up', 'Up one', () => S().reorder(el.id, +1));
    mk('▽ Down', 'Down one', () => S().reorder(el.id, -1));
    mk('▼ Back', 'Send to back', () => S().reorder(el.id, 'bottom'));
    mk('⧉ Duplicate', 'Ctrl+D', () => S().duplicateSelected());
    const bDel = U.el('button', { class: 'cf-btn cf-btn-sm danger' }, '✕ Delete');
    bDel.addEventListener('click', () => S().removeSelected());
    arr.appendChild(bDel);

    return U.el('div', null,
      section(h.label + ' — ' + (el.name || ''), frag),
      section('Position & Tone', common),
      section('Arrange', arr),
      ...(CF.Elements.isRingLike(el) ? [] : [section('Align to blank', alignRow([el.id]))]));
  }

  function render() {
    if (!root || !S().doc) return;
    /* don't rebuild while the user is typing/dragging in this panel */
    const ae = document.activeElement;
    if (ae && root.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return;
    root.innerHTML = '';
    const selSec = selectionSection();
    if (selSec) root.appendChild(selSec);
    root.appendChild(coinSection());
    if (!selSec) {
      root.appendChild(U.el('p', { class: 'cf-hint' },
        'Nothing selected. Click an element on the canvas, or add one from the left panel. Scroll to zoom, drag empty space to pan.'));
    }
  }

  CF.inspector = {
    init(el) {
      root = el;
      CF.bus.on('sel', render);
      CF.bus.on('doc', U.debounce(render, 60));
      CF.bus.on('newdoc', render);
      CF.bus.on('ui', U.debounce(render, 60));
      render();
    }
  };
})();