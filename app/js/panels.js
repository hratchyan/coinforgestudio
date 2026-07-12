/* ============================================================
   CoinForge Studio — panels.js
   Left panel: Add · Symbols · Rings · Templates · Layers,
   plus the shared symbol picker modal.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;
  let root = null, tabbar = null;
  const panes = {};

  /* ---------- symbol thumbnails ---------- */
  function symbolThumb(item, size = 44) {
    const { canvas, ctx } = U.makeCanvas(size * 2, size * 2);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.translate(size, size);
    ctx.scale(size * 2 / 118, size * 2 / 118);
    ctx.fillStyle = '#e8e2d0';
    ctx.strokeStyle = '#e8e2d0';
    const sym = CF.Symbols.get(item.id);
    if (sym) {
      if (sym.fill) ctx.fill(new Path2D(sym.fill), sym.fillRule || 'evenodd');
      if (sym.stroke) {
        ctx.lineWidth = sym.strokeW;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke(new Path2D(sym.stroke));
      }
    }
    return canvas;
  }

  function glyphThumb(ch, size = 44) {
    const d = U.el('div', { class: 'cf-glyph-thumb' }, ch);
    d.style.width = d.style.height = size + 'px';
    return d;
  }

  /* ---------- symbol picker modal (shared) ---------- */
  CF.pickers = CF.pickers || {};
  CF.pickers.symbol = function (cb) {
    const modal = CF.ui.modal({ title: 'Choose a symbol', width: '760px' });
    const search = U.el('input', { class: 'cf-input', type: 'text', placeholder: 'Search symbols…  (e.g. star, eagle, cross)' });
    const chipbar = U.el('div', { class: 'cf-chipbar' });
    const grid = U.el('div', { class: 'cf-symgrid' });
    let activeCat = 'all';

    const cats = [{ id: 'all', label: 'All' }, ...CF.Symbols.categories(), ...CF.Glyphs.categories];
    for (const c of cats) {
      const chip = U.el('button', { class: 'cf-chip' + (c.id === 'all' ? ' active' : '') }, c.label);
      chip.addEventListener('click', () => {
        activeCat = c.id;
        U.$$('.cf-chip', chipbar).forEach(x => x.classList.remove('active'));
        chip.classList.add('active');
        refill();
      });
      chipbar.appendChild(chip);
    }

    function refill() {
      grid.innerHTML = '';
      const q = search.value.trim().toLowerCase();
      /* vector symbols */
      for (const cat of CF.Symbols.categories()) {
        if (activeCat !== 'all' && activeCat !== cat.id) continue;
        for (const item of cat.items) {
          if (q && !(item.label.toLowerCase().includes(q) || item.id.includes(q))) continue;
          const cell = U.el('div', { class: 'cf-symcell', title: item.label }, symbolThumb(item), U.el('span', null, item.label));
          cell.addEventListener('click', () => { modal.close(); cb({ symbolId: item.id }); });
          grid.appendChild(cell);
        }
      }
      /* unicode glyphs */
      for (const cat of CF.Glyphs.categories) {
        if (activeCat !== 'all' && activeCat !== cat.id) continue;
        if (q && !cat.label.toLowerCase().includes(q)) continue;
        for (const ch of cat.glyphs) {
          const cell = U.el('div', { class: 'cf-symcell cf-symcell-glyph', title: cat.label }, glyphThumb(ch));
          cell.addEventListener('click', () => { modal.close(); cb({ glyph: { char: ch, fontFamily: CF.Glyphs.font } }); });
          grid.appendChild(cell);
        }
      }
      if (!grid.children.length) grid.appendChild(U.el('p', { class: 'cf-hint' }, 'No matches.'));
    }
    search.addEventListener('input', U.debounce(refill, 120));
    modal.body.appendChild(search);
    modal.body.appendChild(chipbar);
    modal.body.appendChild(grid);
    refill();
    setTimeout(() => search.focus(), 30);
  };

  /* ============ Add tab ============ */
  function buildAdd(pane) {
    pane.innerHTML = '';
    const kind = CF.substrate.kind(S().doc);
    const isRound = kind === 'circle';
    const R = () => CF.substrate.maxDimMM(S().doc) / 2;
    const CH = () => CF.substrate.sizeMM(S().doc).h; /* card height for stacking */
    const year = String(new Date().getFullYear());

    const grid = U.el('div', { class: 'cf-addgrid' });
    const btn = (icon, label, fn, title) => {
      const b = U.el('button', { class: 'cf-addbtn', title: title || label },
        U.el('span', { class: 'cf-addicon' }, icon), U.el('span', null, label));
      b.addEventListener('click', fn);
      grid.appendChild(b);
    };

    btn('T', 'Text', () => S().addElement(CF.Elements.create('text', { text: 'YOUR TEXT', sizeMM: R() * 0.18 })));
    if (isRound) {
      btn('⌒', 'Arc Text', () => S().addElement(CF.Elements.create('arctext', { text: 'ARC TEXT AROUND', radiusMM: R() - 3, sizeMM: R() * 0.15 })));
    }
    btn('✦', 'Symbol', () => CF.pickers.symbol(pick =>
      S().addElement(CF.Elements.create('symbol', Object.assign({ sizeMM: R() * 0.5 }, pick)))));
    if (isRound) {
      btn('◌', 'Symbol Ring', () => S().addElement(CF.Elements.create('symbolring', { radiusMM: R() - 4.5, itemSizeMM: R() * 0.11 })));
      btn('◎', 'Ring Band', () => S().addElement(CF.Elements.create('ringband', { radiusMM: R() - 2, thicknessMM: 1.2 })));
    }
    btn('⌢', 'Banner', () => S().addElement(CF.Elements.create('banner', { wMM: R() * 1.15, hMM: R() * 0.16, sizeMM: R() * 0.1, y: R() * 0.55 })));
    if (!isRound) {
      btn('▢', 'Frame', () => {
        const { w, h } = CF.substrate.sizeMM(S().doc);
        const m = CF.substrate.marginMM(S().doc) || 3;
        S().addElement(CF.Elements.create('frame', { wMM: w - m * 2, hMM: h - m * 2, cornerRMM: 1 }));
      }, 'Rectangular border sized to the blank');
    }
    btn('▣', 'Image', () => CF.flows.addImage(), 'Import a photo — background removal & smart fit included');
    btn('★', 'Shape', () => S().addElement(CF.Elements.create('shape', { sizeMM: R() * 0.5 })));
    btn('▦', 'QR Code', () => S().addElement(CF.Elements.create('qr', { sizeMM: Math.min(R() * 0.55, 20) })),
      'Offline QR code — URL, phone number, Wi-Fi or vCard text');

    pane.appendChild(U.el('div', { class: 'cf-pane-title' }, 'Add elements'));
    pane.appendChild(grid);

    pane.appendChild(U.el('div', { class: 'cf-pane-title' }, 'Quick features'));
    const quick = U.el('div', { class: 'cf-addgrid' });
    const qbtn = (icon, label, fn, title) => {
      const b = U.el('button', { class: 'cf-addbtn', title: title || label },
        U.el('span', { class: 'cf-addicon' }, icon), U.el('span', null, label));
      b.addEventListener('click', fn);
      quick.appendChild(b);
    };
    if (isRound) {
      qbtn(year.slice(2), 'Year', () => S().addElement(CF.Elements.create('text', { name: 'Year', text: year, weight: 700, sizeMM: R() * 0.16, y: R() * 0.55 })));
      qbtn('EST', 'Established', () => S().addElement(CF.Elements.create('arctext', { name: 'Established', text: 'EST. ' + year, radiusMM: R() - 3, sizeMM: R() * 0.12, side: 'bottom', centerDeg: 180 })));
      qbtn('“', 'Motto Banner', () => S().addElement(CF.Elements.create('banner', { name: 'Motto', text: 'YOUR MOTTO', wMM: R() * 1.2, hMM: R() * 0.16, sizeMM: R() * 0.1, curveDeg: 48, y: R() * 0.58 })));
      qbtn('Aa', 'Signature', () => S().addElement(CF.Elements.create('text', { name: 'Signature', text: 'Your Name', font: CF.Fonts.defaultScript(), weight: 400, sizeMM: R() * 0.2, y: R() * 0.35 })));
      qbtn('M', 'Mint Mark', () => S().addElement(CF.Elements.create('text', { name: 'Mint mark', text: 'M', weight: 700, sizeMM: R() * 0.1, x: R() * 0.55, y: R() * 0.55 })));
      qbtn('#', 'Serial No.', () => S().addElement(CF.Elements.create('text', { name: 'Serial', text: 'No. 0001', font: 'Special Elite', weight: 400, sizeMM: R() * 0.09, y: R() * 0.72 })));
    } else if (kind === 'shape') {
      /* token quick-adds — coin-style features, no ring geometry */
      const txt = (name, text, opts) => S().addElement(CF.Elements.create('text', Object.assign({ name, text }, opts)));
      qbtn(year.slice(2), 'Year', () => txt('Year', year, { weight: 700, sizeMM: R() * 0.14, y: R() * 0.45 }));
      qbtn('Aa', 'Signature', () => txt('Signature', 'Your Name', { font: CF.Fonts.defaultScript(), weight: 400, sizeMM: R() * 0.18, y: R() * 0.3 }));
      qbtn('“', 'Motto Banner', () => S().addElement(CF.Elements.create('banner', { name: 'Motto', text: 'YOUR MOTTO', wMM: R() * 1.1, hMM: R() * 0.15, sizeMM: R() * 0.09, curveDeg: 40, y: R() * 0.5 })));
      qbtn('#', 'Serial No.', () => txt('Serial', 'No. 0001', { font: 'Special Elite', weight: 400, sizeMM: R() * 0.08, y: R() * 0.62 }));
    } else {
      /* contact quick-adds for cards & tags */
      const txt = (name, text, opts) => S().addElement(CF.Elements.create('text', Object.assign({ name, text }, opts)));
      qbtn('⎘', 'Contact Block', () => {
        const H = CH();
        S().addElements([
          CF.Elements.create('text', { name: 'Name', text: 'YOUR NAME', weight: 700, sizeMM: H * 0.13, y: -H * 0.22 }),
          CF.Elements.create('text', { name: 'Title', text: 'Your Title', sizeMM: H * 0.07, y: -H * 0.08 }),
          CF.Elements.create('text', { name: 'Phone', text: '+1 (555) 123-4567', sizeMM: H * 0.065, y: H * 0.12 }),
          CF.Elements.create('text', { name: 'Email', text: 'you@example.com', sizeMM: H * 0.065, y: H * 0.24 }),
        ]);
      }, 'Name, title, phone and email in one go');
      qbtn('Aa', 'Name', () => txt('Name', 'YOUR NAME', { weight: 700, sizeMM: CH() * 0.13, y: -CH() * 0.2 }));
      qbtn('☏', 'Phone', () => txt('Phone', '+1 (555) 123-4567', { sizeMM: CH() * 0.07, y: CH() * 0.12 }));
      qbtn('@', 'Email', () => txt('Email', 'you@example.com', { sizeMM: CH() * 0.07, y: CH() * 0.24 }));
      qbtn('www', 'Website', () => txt('Web', 'yoursite.com', { sizeMM: CH() * 0.07, y: CH() * 0.35 }));
      qbtn('#', 'Serial No.', () => txt('Serial', 'No. 0001', { font: 'Special Elite', sizeMM: CH() * 0.07, y: CH() * 0.35 }));
    }

    pane.appendChild(quick);
    pane.appendChild(U.el('p', { class: 'cf-hint' },
      'Tip: drop a photo anywhere on the canvas, or paste a screenshot with Ctrl+V. Double-click any text to edit it in place.'));
  }

  /* ============ Symbols tab ============ */
  function buildSymbols(pane) {
    pane.innerHTML = '';
    const search = U.el('input', { class: 'cf-input', type: 'text', placeholder: 'Search…' });
    const catSel = U.el('select', { class: 'cf-input' });
    catSel.appendChild(U.el('option', { value: 'all' }, 'All categories'));
    for (const c of CF.Symbols.categories()) catSel.appendChild(U.el('option', { value: c.id }, c.label));
    for (const c of CF.Glyphs.categories) catSel.appendChild(U.el('option', { value: c.id }, 'Glyphs · ' + c.label));
    const grid = U.el('div', { class: 'cf-symgrid cf-symgrid-narrow' });

    function place(pick) {
      const sel = S().firstSel();
      if (sel && (sel.type === 'symbol' || sel.type === 'symbolring')) {
        S().mutate(d => {
          const t = d.elements.find(x => x.id === sel.id);
          if (!t) return;
          if (pick.glyph) { t.glyph = pick.glyph; t.symbolId = null; }
          else { t.symbolId = pick.symbolId; t.glyph = null; }
        });
        CF.ui.toast('Symbol swapped on selection');
      } else {
        const R = CF.substrate.maxDimMM(S().doc) / 2;
        S().addElement(CF.Elements.create('symbol', Object.assign({ sizeMM: R * 0.5 }, pick)));
      }
    }

    function refill() {
      grid.innerHTML = '';
      const q = search.value.trim().toLowerCase();
      const cat = catSel.value;
      for (const c of CF.Symbols.categories()) {
        if (cat !== 'all' && cat !== c.id) continue;
        for (const item of c.items) {
          if (q && !(item.label.toLowerCase().includes(q) || item.id.includes(q))) continue;
          const cell = U.el('div', { class: 'cf-symcell', title: item.label }, symbolThumb(item, 38));
          cell.addEventListener('click', () => place({ symbolId: item.id }));
          grid.appendChild(cell);
        }
      }
      for (const c of CF.Glyphs.categories) {
        if (cat !== 'all' && cat !== c.id) continue;
        if (q && !c.label.toLowerCase().includes(q)) continue;
        for (const ch of c.glyphs) {
          const cell = U.el('div', { class: 'cf-symcell cf-symcell-glyph' }, glyphThumb(ch, 38));
          cell.addEventListener('click', () => place({ glyph: { char: ch, fontFamily: CF.Glyphs.font } }));
          grid.appendChild(cell);
        }
      }
    }
    search.addEventListener('input', U.debounce(refill, 120));
    catSel.addEventListener('change', refill);

    pane.appendChild(U.el('div', { class: 'cf-pane-title' }, 'Symbol library'));
    pane.appendChild(search);
    pane.appendChild(catSel);
    pane.appendChild(U.el('p', { class: 'cf-hint' }, 'Click to add at center — or, with a Symbol / Symbol Ring selected, click to swap its symbol.'));
    pane.appendChild(grid);
    refill();
  }

  /* ============ Rings tab ============ */
  function buildRings(pane) {
    pane.innerHTML = '';
    pane.appendChild(U.el('div', { class: 'cf-pane-title' }, 'Ring presets'));
    if (CF.substrate.radiusMM(S().doc) === null) {
      pane.appendChild(U.el('p', { class: 'cf-hint' },
        'Ring presets need a round blank. Start a coin design (File → New design…) to use them.'));
      return;
    }
    pane.appendChild(U.el('p', { class: 'cf-hint' }, 'Curated frames sized to your coin. They add editable elements — tweak everything afterwards.'));
    const list = U.el('div', { class: 'cf-cardlist' });
    for (const p of CF.RingPresets.all()) {
      const D = S().doc ? CF.substrate.maxDimMM(S().doc) : 44.45;
      const mini = {
        version: 1, coin: { diameterMM: D, marginMM: 2 }, elements: p.build(D / 2)
      };
      const thumb = CF.renderer.thumbnail(mini, 148);
      const card = U.el('div', { class: 'cf-card' },
        thumb,
        U.el('div', { class: 'cf-card-body' },
          U.el('div', { class: 'cf-card-title' }, p.label),
          U.el('div', { class: 'cf-card-desc' }, p.desc)));
      card.addEventListener('click', () => CF.RingPresets.apply(p.id));
      list.appendChild(card);
    }
    pane.appendChild(list);
  }

  /* ============ Templates tab ============ */
  function buildTemplates(pane) {
    pane.innerHTML = '';
    pane.appendChild(U.el('div', { class: 'cf-pane-title' }, 'Templates'));
    pane.appendChild(U.el('p', { class: 'cf-hint' }, 'Full starting layouts — coins and cards. Apply replaces the current design (or merges on top).'));
    const list = U.el('div', { class: 'cf-cardlist' });
    for (const cat of CF.Templates.categories()) {
      list.appendChild(U.el('div', { class: 'cf-subhead' }, cat.label));
      for (const t of cat.items) {
        const D = S().doc ? CF.substrate.maxDimMM(S().doc) : 44.45;
        let thumb;
        try { thumb = CF.renderer.thumbnail(t.build(D), 148); }
        catch (e) { console.error('template thumb', t.id, e); thumb = document.createElement('canvas'); }
        const card = U.el('div', { class: 'cf-card' },
          thumb,
          U.el('div', { class: 'cf-card-body' },
            U.el('div', { class: 'cf-card-title' }, t.label),
            U.el('div', { class: 'cf-card-desc' }, t.desc)));
        card.addEventListener('click', () => {
          const m = CF.ui.modal({
            title: 'Apply template — ' + t.label, width: '430px', modal: true,
            content: b => b.appendChild(U.el('p', { class: 'cf-confirm-msg' },
              'Replace the whole design with this template, or merge its elements on top of what you have?')),
            buttons: [
              { label: 'Cancel', onClick: mm => mm.close() },
              {
                label: 'Merge on top', onClick: mm => {
                  mm.close();
                  const built = t.build(CF.substrate.maxDimMM(S().doc));
                  S().addElements(built.elements);
                  CF.ui.toast('Template merged');
                }
              },
              {
                label: 'Replace design', primary: true, onClick: mm => {
                  mm.close();
                  const built = t.build(CF.substrate.maxDimMM(S().doc));
                  const keepName = S().doc.name;
                  built.name = keepName === 'Untitled Coin' ? built.name : keepName;
                  S().setDoc(built, { keepProject: true });
                  CF.ui.toast('Template applied');
                }
              },
            ]
          });
        });
        list.appendChild(card);
      }
    }
    pane.appendChild(list);
  }

  /* ============ Layers tab ============ */
  const TYPE_ICONS = { text: 'T', arctext: '⌒', symbol: '✦', symbolring: '◌', ringband: '◎', banner: '⌢', image: '▣', shape: '★', outline: '✂' };

  function layerRow(el) {
    const row = U.el('div', {
      class: 'cf-layer' + (S().sel.has(el.id) ? ' selected' : '') + (el.visible ? '' : ' hidden-el'),
      draggable: 'true', dataset: { id: el.id }
    });
    const icon = U.el('span', { class: 'cf-layer-icon' }, TYPE_ICONS[el.type] || '?');
    const g = S().groupById(el.groupId);
    if (g) icon.style.boxShadow = `inset 0 -3px 0 ${g.color}`;
    const name = U.el('span', { class: 'cf-layer-name', title: 'Double-click to rename' }, el.name || el.type);
    name.addEventListener('dblclick', async (e) => {
      e.stopPropagation();
      const v = await CF.ui.prompt('Rename layer', 'Name', el.name || el.type);
      if (v !== null && v.trim()) S().mutate(d => { const t = d.elements.find(x => x.id === el.id); if (t) t.name = v.trim(); });
    });
    const more = U.el('button', { class: 'cf-layer-btn', title: 'Move to group…' }, '⋯');
    more.addEventListener('click', e => {
      e.stopPropagation();
      const items = [{ label: 'No group', onClick: () => S().assignToGroup([el.id], null) }];
      for (const gg of S().doc.groups) {
        items.push({ label: '⬤ ' + gg.name, onClick: () => S().assignToGroup([el.id], gg.id) });
      }
      items.push('-');
      items.push({ label: '+ New group with this', onClick: () => { const ng = S().addGroup(); S().assignToGroup([el.id], ng.id); } });
      CF.ui.menu(more, items);
    });
    const eye = U.el('button', { class: 'cf-layer-btn', title: 'Show / hide' }, el.visible ? '👁' : '—');
    eye.addEventListener('click', e => {
      e.stopPropagation();
      S().mutate(d => { const t = d.elements.find(x => x.id === el.id); if (t) t.visible = !t.visible; });
    });
    const lock = U.el('button', { class: 'cf-layer-btn', title: 'Lock / unlock' }, el.locked ? '🔒' : '🔓');
    lock.addEventListener('click', e => {
      e.stopPropagation();
      S().mutate(d => { const t = d.elements.find(x => x.id === el.id); if (t) t.locked = !t.locked; });
    });
    row.appendChild(icon); row.appendChild(name); row.appendChild(more); row.appendChild(eye); row.appendChild(lock);
    row.addEventListener('click', (e) => {
      if (e.shiftKey) S().toggleSel(el.id);
      else S().select(el.id);
    });

    row.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/cf-layer', el.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('dragover'); });
    row.addEventListener('dragleave', () => row.classList.remove('dragover'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('dragover');
      const srcId = e.dataTransfer.getData('text/cf-layer');
      if (!srcId || srcId === el.id) return;
      S().mutate(d => {
        const from = d.elements.findIndex(x => x.id === srcId);
        let to = d.elements.findIndex(x => x.id === el.id);
        if (from < 0 || to < 0) return;
        const [moved] = d.elements.splice(from, 1);
        /* dropping onto a row also adopts that row's group */
        moved.groupId = d.elements.find(x => x.id === el.id).groupId || null;
        to = d.elements.findIndex(x => x.id === el.id);
        d.elements.splice(to + (from > to ? 0 : 1), 0, moved);
      });
    });
    return row;
  }

  function groupHeader(g) {
    const solo = S().ui.soloGroup === g.id;
    const muted = S().ui.mutedGroups.includes(g.id);
    const head = U.el('div', { class: 'cf-grouphead' + (solo ? ' solo' : '') });
    const dot = U.el('span', { class: 'cf-groupdot', style: { background: g.color }, title: 'Click to change color' });
    dot.addEventListener('click', e => {
      e.stopPropagation();
      CF.ui.menu(dot, S().groupPalette.map(c => ({
        label: (c === g.color ? '● ' : '○ ') + c,
        onClick: () => S().setGroupColor(g.id, c)
      })));
    });
    const name = U.el('span', { class: 'cf-groupname', title: 'Double-click to rename' }, g.name);
    name.addEventListener('dblclick', async () => {
      const v = await CF.ui.prompt('Rename group', 'Name', g.name);
      if (v && v.trim()) S().renameGroup(g.id, v.trim());
    });
    const soloBtn = U.el('button', { class: 'cf-layer-btn', title: 'Solo — preview only this group' }, solo ? '◉' : '◎');
    soloBtn.addEventListener('click', () => {
      S().setUI({ soloGroup: solo ? null : g.id });
      buildLayers(panes.layers);
    });
    const muteBtn = U.el('button', { class: 'cf-layer-btn', title: 'Mute — hide group in preview' }, muted ? '🔇' : '🔈');
    muteBtn.addEventListener('click', () => {
      const m = S().ui.mutedGroups.filter(x => x !== g.id);
      if (!muted) m.push(g.id);
      S().setUI({ mutedGroups: m });
      buildLayers(panes.layers);
    });
    const del = U.el('button', { class: 'cf-layer-btn', title: 'Delete group (keeps elements)' }, '✕');
    del.addEventListener('click', () => S().removeGroup(g.id));
    head.appendChild(dot); head.appendChild(name); head.appendChild(soloBtn); head.appendChild(muteBtn); head.appendChild(del);
    /* dropping an element row onto a header assigns it to the group */
    head.addEventListener('dragover', e => { e.preventDefault(); head.classList.add('dragover'); });
    head.addEventListener('dragleave', () => head.classList.remove('dragover'));
    head.addEventListener('drop', e => {
      e.preventDefault();
      head.classList.remove('dragover');
      const srcId = e.dataTransfer.getData('text/cf-layer');
      if (srcId) S().assignToGroup([srcId], g.id);
    });
    return head;
  }

  function buildLayers(pane) {
    pane.innerHTML = '';
    pane.appendChild(U.el('div', { class: 'cf-pane-title' }, 'Layers (top → bottom)'));

    const bar = U.el('div', { class: 'cf-btn-row' });
    const bNewG = U.el('button', { class: 'cf-btn cf-btn-sm' }, '+ Group');
    bNewG.addEventListener('click', () => {
      const g = S().addGroup();
      if (S().sel.size) S().assignToGroup([...S().sel], g.id);
    });
    bar.appendChild(bNewG);
    if (S().ui.soloGroup) {
      const bClear = U.el('button', { class: 'cf-btn cf-btn-sm primary' }, 'Exit solo');
      bClear.addEventListener('click', () => { S().setUI({ soloGroup: null }); buildLayers(pane); });
      bar.appendChild(bClear);
    }
    pane.appendChild(bar);
    pane.appendChild(U.el('p', { class: 'cf-hint' },
      'Groups are engraving passes: export one file per group with different laser settings. They don\'t change stacking order. Drag a layer onto a group header to assign it.'));

    const doc = S().doc;
    if (!doc || !doc.elements.length) {
      pane.appendChild(U.el('p', { class: 'cf-hint' }, 'No elements yet — add some from the Add tab.'));
      return;
    }
    const els = [...doc.elements].reverse();
    const list = U.el('div', { class: 'cf-layerlist' });

    for (const g of doc.groups) {
      list.appendChild(groupHeader(g));
      for (const el of els) if (el.groupId === g.id) list.appendChild(layerRow(el));
    }
    const ungrouped = els.filter(e => !e.groupId || !doc.groups.some(g => g.id === e.groupId));
    if (doc.groups.length && ungrouped.length) list.appendChild(U.el('div', { class: 'cf-grouphead cf-grouphead-plain' }, U.el('span', { class: 'cf-groupname' }, 'Ungrouped')));
    for (const el of ungrouped) list.appendChild(layerRow(el));

    pane.appendChild(list);
  }

  /* ---------- tab machinery ---------- */
  const TABS = [
    ['add', 'Add', buildAdd],
    ['symbols', 'Symbols', buildSymbols],
    ['rings', 'Rings', buildRings],
    ['templates', 'Templates', buildTemplates],
    ['layers', 'Layers', buildLayers],
  ];

  function show(tabId) {
    S().ui.tab = tabId;
    U.$$('.cf-tab', tabbar).forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    for (const [id, , build] of TABS) {
      panes[id].style.display = id === tabId ? '' : 'none';
      if (id === tabId) build(panes[id]);
    }
  }

  CF.panels = {
    init(container) {
      root = container;
      tabbar = U.el('div', { class: 'cf-tabbar' });
      for (const [id, label] of TABS) {
        const b = U.el('button', { class: 'cf-tab', dataset: { tab: id } }, label);
        b.addEventListener('click', () => show(id));
        tabbar.appendChild(b);
      }
      root.appendChild(tabbar);
      const paneHost = U.el('div', { class: 'cf-panehost' });
      for (const [id] of TABS) {
        panes[id] = U.el('div', { class: 'cf-pane' });
        paneHost.appendChild(panes[id]);
      }
      root.appendChild(paneHost);

      CF.bus.on('doc', U.debounce(() => {
        if (S().ui.tab === 'layers') buildLayers(panes.layers);
      }, 80));
      CF.bus.on('sel', () => {
        if (S().ui.tab === 'layers') buildLayers(panes.layers);
      });
      CF.bus.on('newdoc', () => show(S().ui.tab || 'add'));

      show('add');
    },
    refreshTab() { show(S().ui.tab); }
  };
})();