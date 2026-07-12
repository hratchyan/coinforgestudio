/* ============================================================
   CoinForge Studio — app.js
   Boot, top bar, keyboard shortcuts, clipboard & drag-drop,
   status bar, Electron menu bridge.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;

  function topbar() {
    const bar = U.$('#topbar');
    const grp = cls => U.el('div', { class: 'cf-tb-group ' + (cls || '') });
    const btn = (label, title, fn, cls = '') => {
      const b = U.el('button', { class: 'cf-tbbtn ' + cls, title }, label);
      b.addEventListener('click', fn);
      return b;
    };

    /* brand */
    const brand = U.el('div', { class: 'cf-brand' },
      U.el('img', { class: 'cf-brand-coin', src: 'favicon.png', alt: '' }),
      U.el('span', { class: 'cf-brand-name' }, 'CoinForge'),
      U.el('span', { class: 'cf-brand-sub' }, 'Studio'));

    /* file menu */
    const g1 = grp();
    const fileBtn = btn('File ▾', 'File menu', () => {
      CF.ui.menu(fileBtn, [
        { label: 'New coin…', hint: 'Ctrl+N', onClick: () => CF.projects.newCoinDialog() },
        { label: 'Projects…', hint: 'Ctrl+O', onClick: () => CF.projects.openManager() },
        '-',
        { label: 'Save', hint: 'Ctrl+S', onClick: () => CF.projects.saveCurrent() },
        { label: 'Save as new copy', onClick: () => CF.projects.saveCurrent({ saveAs: true }) },
        ...(CF.cloud && CF.cloud.available()
          ? [{ label: '☁ Save to cloud…', hint: 'Ctrl+Shift+S', onClick: () => CF.projects.cloudSaveDialog() }]
          : []),
        '-',
        { label: 'Import .coin file…', onClick: () => CF.projects.importCoinFile() },
        { label: 'Export .coin file…', onClick: () => CF.projects.exportCoinFile() },
        '-',
        { label: 'Export for engraving…', hint: 'Ctrl+E', onClick: () => CF.exporter.open() },
      ]);
    });
    g1.appendChild(fileBtn);
    const toolsBtn = btn('Tools ▾', 'Utilities', () => {
      CF.ui.menu(toolsBtn, [
        { label: 'Background Remover (standalone)…', hint: 'Ctrl+B', onClick: () => CF.flows.openBgTool() },
        { label: 'Import image to coin…', onClick: () => CF.flows.addImage() },
        { label: 'Generate Cut Outline…', hint: 'Ctrl+L', onClick: () => CF.outline.openModal() },
        '-',
        { label: 'Clear all elements', onClick: async () => { if (await CF.ui.confirm('Clear design', 'Remove all elements from the coin?', 'Clear')) S().mutate(d => { d.elements = []; }); } },
      ]);
    });
    g1.appendChild(toolsBtn);

    /* undo/redo */
    const g2 = grp();
    const undoB = btn('↶', 'Undo (Ctrl+Z)', () => S().undo());
    const redoB = btn('↷', 'Redo (Ctrl+Y)', () => S().redo());
    g2.appendChild(undoB);
    g2.appendChild(redoB);
    CF.bus.on('history', () => {
      undoB.disabled = !S().canUndo();
      redoB.disabled = !S().canRedo();
    });

    /* zoom */
    const g3 = grp();
    const zoomOut = btn('−', 'Zoom out', () => { S().ui.zoom = U.clamp(S().ui.zoom / 1.2, 0.15, 12); S().setUI({}); updateZoom(); });
    const zoomLbl = U.el('span', { class: 'cf-zoomlbl', title: 'Click to fit' }, '100%');
    zoomLbl.addEventListener('click', () => { CF.renderer.fit(); updateZoom(); });
    const zoomIn = btn('+', 'Zoom in', () => { S().ui.zoom = U.clamp(S().ui.zoom * 1.2, 0.15, 12); S().setUI({}); updateZoom(); });
    g3.appendChild(zoomOut); g3.appendChild(zoomLbl); g3.appendChild(zoomIn);
    function updateZoom() { zoomLbl.textContent = Math.round((S().ui.zoom || 1) * 100) + '%'; }
    CF.bus.on('zoom', updateZoom);
    CF.bus.on('ui', updateZoom);

    /* spacer + right side */
    const spacer = U.el('div', { class: 'cf-tb-spacer' });
    const g4 = grp();
    const exportB = btn('⚡ Export', 'Export engraving files (Ctrl+E)', () => CF.exporter.open(), 'cf-tb-primary');
    const helpB = btn('? Help', 'Documentation (F1)', () => CF.help.open());
    const aboutB = btn('ⓘ', 'About', () => CF.help.about());
    g4.appendChild(exportB);
    g4.appendChild(helpB);
    g4.appendChild(aboutB);

    bar.appendChild(brand);
    bar.appendChild(g1);
    bar.appendChild(g2);
    bar.appendChild(g3);
    bar.appendChild(spacer);
    bar.appendChild(g4);
  }

  function statusbar() {
    const sb = U.$('#statusbar');
    const pos = U.el('span', { class: 'cf-sb-item' }, '—');
    const selInfo = U.el('span', { class: 'cf-sb-item' }, '');
    const docInfo = U.el('span', { class: 'cf-sb-item' }, '');
    const saveInfo = U.el('span', { class: 'cf-sb-item cf-sb-right' }, '');
    sb.appendChild(pos); sb.appendChild(selInfo); sb.appendChild(docInfo); sb.appendChild(saveInfo);

    CF.bus.on('cursor', U.throttle(pt => {
      const r = Math.hypot(pt.x, pt.y);
      const a = U.normDeg(U.rad2deg(Math.atan2(pt.x, -pt.y)));
      pos.textContent = `x ${U.round(pt.x, 1)} y ${U.round(pt.y, 1)} mm · r ${U.round(r, 1)} mm · ${U.round(a, 0)}°`;
    }, 80));

    const updDoc = () => {
      if (!S().doc) return;
      const sub = CF.substrate.get(S().doc);
      docInfo.textContent = sub.kind === 'circle'
        ? `${S().doc.name} — ⌀ ${U.round(sub.diameterMM, 2)} mm (${U.round(U.mm2in(sub.diameterMM), 3)}")`
        : `${S().doc.name} — ${U.round(sub.wMM, 2)} × ${U.round(sub.hMM, 2)} mm`;
      const sels = S().selEls();
      selInfo.textContent = sels.length === 1
        ? `${CF.Elements.handlers[sels[0].type].label}: ${sels[0].name || ''}`
        : sels.length > 1 ? `${sels.length} selected` : '';
      saveInfo.textContent = S().dirty ? '● unsaved changes' : '✓ saved';
      saveInfo.classList.toggle('dirty', S().dirty);
      document.title = `${S().doc.name}${S().dirty ? ' •' : ''} — CoinForge Studio`;
    };
    CF.bus.on('doc', U.debounce(updDoc, 100));
    CF.bus.on('sel', updDoc);
    CF.bus.on('newdoc', updDoc);
    CF.bus.on('history', U.debounce(updDoc, 100));
    CF.bus.on('saved', updDoc);
  }

  function shortcuts() {
    window.addEventListener('keydown', (e) => {
      const tgt = e.target;
      if (tgt && (tgt.matches('input, textarea, select') || tgt.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? S().redo() : S().undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); S().redo(); return; }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey && CF.cloud && CF.cloud.available()) CF.projects.cloudSaveDialog();
        else CF.projects.saveCurrent({ saveAs: e.shiftKey });
        return;
      }
      if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); CF.projects.openManager(); return; }
      if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); CF.projects.newCoinDialog(); return; }
      if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); CF.exporter.open(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); S().duplicateSelected(); return; }
      if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); CF.flows.openBgTool(); return; }
      if (mod && e.key.toLowerCase() === 'l') { e.preventDefault(); CF.outline.openModal(); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); S().select(S().doc.elements.map(el => el.id)); return; }
      if (e.key === 'F1') { e.preventDefault(); CF.help.open(); return; }

      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); S().removeSelected(); return; }
      if (e.key === 'Escape') { S().clearSel(); return; }

      /* nudge */
      const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (arrows[e.key]) {
        const sels = S().selEls().filter(el => !el.locked && !CF.Elements.isRingLike(el));
        if (sels.length) {
          e.preventDefault();
          const step = e.shiftKey ? 1 : 0.2;
          S().mutate(d => {
            for (const el of sels) {
              const t = d.elements.find(x => x.id === el.id);
              if (t) { t.x = U.round(t.x + arrows[e.key][0] * step, 2); t.y = U.round(t.y + arrows[e.key][1] * step, 2); }
            }
          });
        }
        return;
      }
      /* rotate with [ ] */
      if (e.key === '[' || e.key === ']') {
        const sels = S().selEls().filter(el => !el.locked);
        if (sels.length) {
          const step = (e.key === ']' ? 1 : -1) * (e.shiftKey ? 15 : 1);
          S().mutate(d => {
            for (const el of sels) {
              const t = d.elements.find(x => x.id === el.id);
              if (!t) continue;
              if (t.type === 'arctext' && t.lockCenter !== false) t.centerDeg = (t.centerDeg || 0) + step;
              else if (t.type === 'symbolring' && t.lockCenter !== false) t.startDeg = (t.startDeg || 0) + step;
              else t.rotation = (t.rotation || 0) + step;
            }
          });
        }
        return;
      }
      if (e.key === 'f') { CF.renderer.fit(); return; }
      if (e.key === 'g') { S().setUI({ showGuides: !S().ui.showGuides }); return; }
    });
  }

  function clipboardAndDrop() {
    document.addEventListener('paste', (e) => {
      const tgt = e.target;
      if (tgt && tgt.matches('input, textarea')) return;
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          e.preventDefault();
          CF.flows.importImageBlob(it.getAsFile());
          return;
        }
      }
    });

    const cw = U.$('#canvas-wrap');
    cw.addEventListener('dragover', e => { e.preventDefault(); cw.classList.add('dropping'); });
    cw.addEventListener('dragleave', () => cw.classList.remove('dropping'));
    cw.addEventListener('drop', e => {
      e.preventDefault();
      cw.classList.remove('dropping');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      if (/\.(coin|json)$/i.test(f.name)) {
        U.readFile(f, 'text').then(text => {
          try {
            const payload = JSON.parse(text);
            const doc = payload.doc || payload;
            if (!doc.elements) throw new Error('not a project file');
            S().setDoc(doc);
            CF.renderer.fit();
          } catch (err) { CF.ui.toast('Not a valid .coin file', 2600, 'error'); }
        });
      } else if (f.type.startsWith('image/')) {
        CF.flows.importImageBlob(f);
      }
    });
  }

  function electronMenuBridge() {
    if (!window.native || !window.native.onMenu) return;
    window.native.onMenu((cmd) => {
      const map = {
        'new': () => CF.projects.newCoinDialog(),
        'open': () => CF.projects.openManager(),
        'save': () => CF.projects.saveCurrent(),
        'saveas': () => CF.projects.saveCurrent({ saveAs: true }),
        'import': () => CF.projects.importCoinFile(),
        'exportcoin': () => CF.projects.exportCoinFile(),
        'export': () => CF.exporter.open(),
        'undo': () => S().undo(),
        'redo': () => S().redo(),
        'bgtool': () => CF.flows.openBgTool(),
        'outline': () => CF.outline.openModal(),
        'addimage': () => CF.flows.addImage(),
        'fit': () => CF.renderer.fit(),
        'assistant': () => CF.assistant && CF.assistant.openDialog(),
        'help': () => CF.help.open(),
        'about': () => CF.help.about(),
        'shortcuts': () => CF.help.open('shortcuts'),
      };
      if (map[cmd]) map[cmd]();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    CF.Fonts.load();
    S().newDoc(44.45);

    const canvas = U.$('#cv');
    CF.renderer.init(canvas);
    CF.interact.init(canvas);
    CF.panels.init(U.$('#left'));
    CF.inspector.init(U.$('#right'));
    topbar();
    statusbar();
    shortcuts();
    clipboardAndDrop();
    electronMenuBridge();
    CF.projects.startAutosave();
    CF.AI.probe();

    CF.renderer.fit();
    CF.projects.checkRecovery();

    /* re-render once fonts arrive so text measures correctly */
    CF.bus.on('fonts-ready', () => CF.bus.emit('doc-soft'));

    console.log(`%c${CF.APP_NAME} v${CF.VERSION} — by ${CF.AUTHOR}`, 'color:#d9b544;font-weight:bold;font-size:14px');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();