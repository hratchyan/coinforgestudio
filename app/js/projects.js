/* ============================================================
   CoinForge Studio — projects.js
   Project management: save/load (.coin JSON), thumbnails,
   autosave & crash recovery. Uses the file system in the
   desktop app and localStorage in browser mode.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;

  /* ---------- backends ---------- */
  const lsBackend = {
    kind: 'browser',
    async list() {
      const idx = JSON.parse(localStorage.getItem('cf.projects') || '[]');
      return idx.sort((a, b) => b.modified - a.modified);
    },
    async read(id) {
      const raw = localStorage.getItem('cf.project.' + id);
      return raw ? JSON.parse(raw) : null;
    },
    async write(id, payload) {
      const idx = JSON.parse(localStorage.getItem('cf.projects') || '[]');
      const meta = { id, name: payload.doc.name, modified: Date.now(), thumb: payload.thumb };
      const i = idx.findIndex(p => p.id === id);
      if (i >= 0) idx[i] = meta; else idx.push(meta);
      try {
        localStorage.setItem('cf.project.' + id, JSON.stringify(payload));
        localStorage.setItem('cf.projects', JSON.stringify(idx));
      } catch (e) {
        CF.ui.toast('Storage full — export your project to a file instead', 4000, 'error');
      }
      return id;
    },
    async remove(id) {
      const idx = JSON.parse(localStorage.getItem('cf.projects') || '[]').filter(p => p.id !== id);
      localStorage.setItem('cf.projects', JSON.stringify(idx));
      localStorage.removeItem('cf.project.' + id);
    }
  };

  const nativeBackend = {
    kind: 'native',
    async list() { return await window.native.projectsList(); },
    async read(id) {
      const raw = await window.native.projectsRead(id);
      return raw ? JSON.parse(raw) : null;
    },
    async write(id, payload) {
      await window.native.projectsWrite(id, JSON.stringify(payload));
      return id;
    },
    async remove(id) { await window.native.projectsRemove(id); }
  };

  const backend = () => (window.native && window.native.projectsList) ? nativeBackend : lsBackend;

  /* ---------- save / load ---------- */
  async function saveCurrent({ saveAs = false } = {}) {
    const doc = S().doc;
    if (!doc) return;
    if (saveAs || !S().projectId) S().projectId = U.uid();
    const thumb = CF.renderer.thumbnail(doc, 180).toDataURL('image/jpeg', 0.82);
    await backend().write(S().projectId, { app: CF.APP_NAME, version: CF.VERSION, doc, thumb, saved: Date.now() });
    S().dirty = false;
    CF.bus.emit('saved');
    CF.ui.toast('Saved “' + doc.name + '”');
  }

  async function openById(id) {
    const payload = await backend().read(id);
    if (!payload) { CF.ui.toast('Could not open project', 2600, 'error'); return; }
    S().setDoc(payload.doc);
    S().projectId = id;
    S().dirty = false;
    CF.renderer.fit();
    CF.bus.emit('saved');
  }

  function exportCoinFile() {
    const doc = S().doc;
    const payload = { app: CF.APP_NAME, version: CF.VERSION, doc, saved: Date.now() };
    const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
    const name = (doc.name || 'coin').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-') + '.coin';
    if (window.native && window.native.saveFile) {
      blob.arrayBuffer().then(buf => {
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        window.native.saveFile(name, btoa(bin)).then(p => p && CF.ui.toast('Exported ' + p, 3000));
      });
    } else {
      U.download(name, blob);
    }
  }

  function importCoinFile() {
    const inp = U.el('input', { type: 'file', accept: '.coin,.json' });
    inp.addEventListener('change', async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        const text = await U.readFile(f, 'text');
        const payload = JSON.parse(text);
        const doc = payload.doc || payload; /* accept bare docs too */
        if (!doc.elements) throw new Error('not a CoinForge project');
        S().setDoc(doc);
        CF.renderer.fit();
        CF.ui.toast('Imported ' + f.name);
      } catch (e) {
        CF.ui.toast('Import failed: ' + e.message, 3500, 'error');
      }
    });
    inp.click();
  }

  /* ---------- new coin dialog ---------- */
  function newCoinDialog() {
    const sizes = [
      ['38.1', '1.5" (38.1 mm)'], ['44.45', '1.75" (44.45 mm) — most common'], ['50.8', '2" (50.8 mm)'],
      ['40', '40 mm'], ['45', '45 mm'], ['50', '50 mm'], ['60', '60 mm'],
    ];
    let sel = '44.45';
    const modal = CF.ui.modal({
      title: 'New coin', width: '430px', modal: true,
      content: (b) => {
        b.appendChild(U.el('label', { class: 'cf-field-label' }, 'Blank diameter'));
        const selEl = U.el('select', { class: 'cf-input' });
        for (const [v, label] of sizes) selEl.appendChild(U.el('option', { value: v, selected: v === sel ? '' : null }, label));
        selEl.appendChild(U.el('option', { value: 'custom' }, 'Custom…'));
        const custom = U.el('input', { class: 'cf-input', type: 'number', value: 45, min: 5, max: 300, step: 0.5, style: { display: 'none' } });
        selEl.addEventListener('change', () => {
          sel = selEl.value;
          custom.style.display = sel === 'custom' ? '' : 'none';
        });
        custom.addEventListener('change', () => { });
        b.appendChild(selEl);
        b.appendChild(custom);
        b._custom = custom;
      },
      buttons: [
        { label: 'Cancel', onClick: m => m.close() },
        {
          label: 'Create', primary: true, onClick: m => {
            const D = sel === 'custom' ? U.clamp(parseFloat(m.body._custom.value) || 45, 5, 300) : parseFloat(sel);
            m.close();
            S().newDoc(D);
            CF.renderer.fit();
          }
        }
      ]
    });
  }

  /* ---------- manager modal ---------- */
  async function openManager() {
    const modal = CF.ui.modal({ title: 'Projects', width: '860px' });
    const bar = U.el('div', { class: 'cf-btn-row' });
    const bNew = U.el('button', { class: 'cf-btn primary' }, '+ New coin');
    bNew.addEventListener('click', () => { modal.close(); newCoinDialog(); });
    const bImport = U.el('button', { class: 'cf-btn' }, 'Import .coin file…');
    bImport.addEventListener('click', () => { modal.close(); importCoinFile(); });
    bar.appendChild(bNew); bar.appendChild(bImport);
    modal.body.appendChild(bar);

    const grid = U.el('div', { class: 'cf-projgrid' });
    modal.body.appendChild(grid);

    async function refill() {
      grid.innerHTML = '';
      const items = await backend().list();
      if (!items.length) grid.appendChild(U.el('p', { class: 'cf-hint' }, 'No saved projects yet. Hit Save (Ctrl+S) to store the current coin.'));
      for (const p of items) {
        const img = U.el('img', { class: 'cf-proj-thumb', src: p.thumb || '' });
        const card = U.el('div', { class: 'cf-projcard' },
          img,
          U.el('div', { class: 'cf-card-title' }, p.name || '(untitled)'),
          U.el('div', { class: 'cf-card-desc' }, new Date(p.modified).toLocaleString()));
        card.addEventListener('click', async () => { modal.close(); await openById(p.id); });
        card.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          CF.ui.menu({ getBoundingClientRect: () => ({ left: e.clientX, bottom: e.clientY, top: e.clientY }) }, [
            { label: 'Open', onClick: async () => { modal.close(); await openById(p.id); } },
            {
              label: 'Duplicate', onClick: async () => {
                const payload = await backend().read(p.id);
                if (payload) {
                  payload.doc.name += ' copy';
                  await backend().write(U.uid(), payload);
                  refill();
                }
              }
            },
            {
              label: 'Rename', onClick: async () => {
                const v = await CF.ui.prompt('Rename project', 'Name', p.name);
                if (v) {
                  const payload = await backend().read(p.id);
                  if (payload) { payload.doc.name = v; await backend().write(p.id, payload); refill(); }
                }
              }
            },
            '-',
            {
              label: 'Delete', onClick: async () => {
                if (await CF.ui.confirm('Delete project', `Delete “${p.name}” permanently?`, 'Delete')) {
                  await backend().remove(p.id);
                  refill();
                }
              }
            },
          ]);
        });
        grid.appendChild(card);
      }
    }
    refill();
  }

  /* ---------- autosave ---------- */
  const AUTOSAVE_KEY = 'cf.autosave';
  function autosaveTick() {
    if (!S().doc || !S().dirty) return;
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        doc: S().doc, projectId: S().projectId, at: Date.now()
      }));
    } catch (e) { /* storage full — ignore */ }
  }

  async function checkRecovery() {
    let raw = null;
    try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch (e) { }
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved.doc || !saved.doc.elements || !saved.doc.elements.length) return;
      const age = Date.now() - saved.at;
      if (age > 1000 * 60 * 60 * 24 * 7) return;
      const ok = await new Promise(res => {
        CF.ui.modal({
          title: 'Restore last session?', width: '440px', modal: true,
          content: b => b.appendChild(U.el('p', { class: 'cf-confirm-msg' },
            `Found autosaved work: “${saved.doc.name}” from ${new Date(saved.at).toLocaleString()}. Restore it?`)),
          buttons: [
            { label: 'Start fresh', onClick: m => { m.close(); res(false); } },
            { label: 'Restore', primary: true, onClick: m => { m.close(); res(true); } },
          ],
          onClose: () => res(false)
        });
      });
      if (ok) {
        S().setDoc(saved.doc);
        S().projectId = saved.projectId;
        CF.renderer.fit();
      } else {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    } catch (e) { console.warn('recovery failed', e); }
  }

  CF.projects = {
    saveCurrent, openManager, exportCoinFile, importCoinFile, newCoinDialog, checkRecovery,
    startAutosave() { setInterval(autosaveTick, 15000); window.addEventListener('beforeunload', autosaveTick); }
  };
})();