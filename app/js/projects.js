/* ============================================================
   CoinForge Studio — projects.js
   Project management: save/load (.coin JSON), thumbnails,
   autosave & crash recovery.

   Backends:
   - desktop app: real files via window.native
     (Documents\CoinForge Projects)
   - browser: IndexedDB (gigabyte-class quota — photo projects
     save fine; the old localStorage backend choked at ~5MB and
     is migrated automatically on first run)
   - hosted: cloud slots via cloudprojects.js (1 free, 10 on Pro)

   Local saves are unlimited on every plan. Cloud slots are the
   paid feature and are enforced server-side by security rules.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;

  /* ================= IndexedDB helpers ================= */
  let dbPromise = null;
  function idb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((res, rej) => {
      const rq = indexedDB.open('coinforge', 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error || new Error('IndexedDB unavailable'));
    });
    return dbPromise;
  }
  function tx(store, mode, fn) {
    return idb().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const out = fn(t.objectStore(store));
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('transaction aborted'));
    }));
  }
  const kvGet = (key) => idb().then(d => new Promise((res, rej) => {
    const rq = d.transaction('kv', 'readonly').objectStore('kv').get(key);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  }));
  const kvSet = (key, val) => tx('kv', 'readwrite', st => st.put(val, key));
  const kvDel = (key) => tx('kv', 'readwrite', st => st.delete(key));

  /* one-time migration from the old localStorage backend */
  async function migrateFromLS() {
    let raw = null;
    try { raw = localStorage.getItem('cf.projects'); } catch (e) { }
    if (!raw) return;
    try {
      const idx = JSON.parse(raw);
      for (const meta of idx) {
        const pRaw = localStorage.getItem('cf.project.' + meta.id);
        if (!pRaw) continue;
        const payload = JSON.parse(pRaw);
        await tx('projects', 'readwrite', st => st.put({
          id: meta.id,
          name: meta.name || (payload.doc && payload.doc.name) || '(untitled)',
          modified: meta.modified || Date.now(),
          thumb: meta.thumb || payload.thumb || null,
          payload,
        }));
        localStorage.removeItem('cf.project.' + meta.id);
      }
      localStorage.removeItem('cf.projects');
      console.info('CoinForge: migrated projects from localStorage to IndexedDB');
    } catch (e) { console.warn('project migration skipped:', e); }
  }

  /* ================= backends ================= */
  const idbBackend = {
    kind: 'browser',
    async list() {
      await migrateFromLS();
      const items = await idb().then(d => new Promise((res, rej) => {
        const rq = d.transaction('projects', 'readonly').objectStore('projects').getAll();
        rq.onsuccess = () => res(rq.result || []);
        rq.onerror = () => rej(rq.error);
      }));
      return items
        .map(r => ({ id: r.id, name: r.name, modified: r.modified, thumb: r.thumb }))
        .sort((a, b) => b.modified - a.modified);
    },
    async read(id) {
      const rec = await idb().then(d => new Promise((res, rej) => {
        const rq = d.transaction('projects', 'readonly').objectStore('projects').get(id);
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      }));
      return rec ? rec.payload : null;
    },
    async write(id, payload) {
      /* throws on failure — callers surface it honestly */
      await tx('projects', 'readwrite', st => st.put({
        id,
        name: (payload.doc && payload.doc.name) || '(untitled)',
        modified: Date.now(),
        thumb: payload.thumb || null,
        payload,
      }));
      return id;
    },
    async remove(id) {
      await tx('projects', 'readwrite', st => st.delete(id));
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

  const backend = () => (window.native && window.native.projectsList) ? nativeBackend : idbBackend;

  /* ================= save / load ================= */
  function currentPayload() {
    const doc = S().doc;
    const thumb = CF.renderer.thumbnail(doc, 180).toDataURL('image/jpeg', 0.82);
    return { app: CF.APP_NAME, version: CF.VERSION, doc, thumb, saved: Date.now() };
  }

  async function saveCurrent({ saveAs = false } = {}) {
    const doc = S().doc;
    if (!doc) return;
    if (saveAs || !S().projectId) S().projectId = U.uid();
    try {
      await backend().write(S().projectId, currentPayload());
    } catch (e) {
      console.warn('save failed:', e);
      saveFailedDialog(e);
      return; /* stays dirty — no false "Saved" */
    }
    S().dirty = false;
    CF.bus.emit('saved');
    CF.ui.toast('Saved “' + doc.name + '”' + (backend().kind === 'browser' ? ' — this browser only' : ''));
  }

  function saveFailedDialog(e) {
    CF.ui.modal({
      title: 'Couldn\'t save', width: '440px', modal: true,
      content: b => {
        b.appendChild(U.el('p', { class: 'cf-confirm-msg' },
          'The project could not be saved to this browser\'s storage' +
          (e && e.name === 'QuotaExceededError' ? ' (storage quota is full)' : '') +
          '. Export it as a .coin file so nothing is lost.'));
      },
      buttons: [
        { label: 'Close', onClick: m => m.close() },
        { label: 'Export .coin file', primary: true, onClick: m => { m.close(); exportCoinFile(); } },
      ]
    });
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

  /* ---- cloud slot ops (hosted — see cloudprojects.js) ---- */
  async function saveToSlot(slot) {
    const doc = S().doc;
    if (!doc) return false;
    try {
      await CF.cloud.write(slot, currentPayload());
      S().dirty = false;
      CF.bus.emit('saved');
      CF.ui.toast('Saved “' + doc.name + '” to cloud slot ' + (slot + 1));
      return true;
    } catch (e) {
      console.warn('cloud save failed:', e);
      CF.ui.toast(CF.cloud.friendly(e), 4000, 'error');
      return false;
    }
  }

  async function openSlot(slot) {
    try {
      const payload = await CF.cloud.read(slot);
      S().setDoc(payload.doc);
      S().projectId = null; /* cloud copy is the source; local Save makes a new local project */
      S().dirty = false;
      CF.renderer.fit();
      CF.bus.emit('saved');
    } catch (e) {
      console.warn('cloud open failed:', e);
      CF.ui.toast(CF.cloud.friendly(e), 4000, 'error');
    }
  }

  /* ================= .coin import/export ================= */
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

  /* ================= new design dialog (coin / card) ================= */
  const COIN_SIZES = [
    ['38.1', '1.5" (38.1 mm)'], ['44.45', '1.75" (44.45 mm) — most common'], ['50.8', '2" (50.8 mm)'],
    ['40', '40 mm'], ['45', '45 mm'], ['50', '50 mm'], ['60', '60 mm'],
  ];
  /* [label, wMM, hMM, cornerRMM] — engraving-blank staples */
  const CARD_SIZES = [
    ['Credit-card blank — 85.6 × 54 mm (CR80)', 85.6, 54, 3.18],
    ['US business card — 88.9 × 50.8 mm', 88.9, 50.8, 3],
    ['EU business card — 85 × 55 mm', 85, 55, 3],
    ['Dog tag — 50.8 × 28.6 mm', 50.8, 28.6, 6],
    ['Key fob — 76.2 × 25.4 mm', 76.2, 25.4, 4],
  ];

  function newCoinDialog() {
    let tab = 'coin';
    let coinSel = '44.45';

    const modal = CF.ui.modal({
      title: 'New design', width: '460px', modal: true,
      content: (b) => {
        const tabRow = U.el('div', { class: 'cf-btn-row' });
        const bCoin = U.el('button', { class: 'cf-btn primary' }, '● Coin');
        const bCard = U.el('button', { class: 'cf-btn' }, '▭ Card / Tag');
        tabRow.appendChild(bCoin); tabRow.appendChild(bCard);
        b.appendChild(tabRow);
        const pane = U.el('div');
        b.appendChild(pane);

        const fields = {};
        function buildPane() {
          bCoin.classList.toggle('primary', tab === 'coin');
          bCard.classList.toggle('primary', tab === 'card');
          pane.innerHTML = '';
          if (tab === 'coin') {
            pane.appendChild(U.el('label', { class: 'cf-field-label' }, 'Blank diameter'));
            const selEl = U.el('select', { class: 'cf-input' });
            for (const [v, label] of COIN_SIZES) selEl.appendChild(U.el('option', { value: v, selected: v === coinSel ? '' : null }, label));
            selEl.appendChild(U.el('option', { value: 'custom', selected: coinSel === 'custom' ? '' : null }, 'Custom…'));
            const custom = U.el('input', { class: 'cf-input', type: 'number', value: 45, min: 5, max: 300, step: 0.5, style: { display: coinSel === 'custom' ? '' : 'none' } });
            selEl.addEventListener('change', () => {
              coinSel = selEl.value;
              custom.style.display = coinSel === 'custom' ? '' : 'none';
            });
            pane.appendChild(selEl);
            pane.appendChild(custom);
            fields.coinCustom = custom;
          } else {
            pane.appendChild(U.el('label', { class: 'cf-field-label' }, 'Card blank'));
            const selEl = U.el('select', { class: 'cf-input' });
            CARD_SIZES.forEach(([label], i) => selEl.appendChild(U.el('option', { value: i }, label)));
            pane.appendChild(selEl);
            const dims = U.el('div', { class: 'cf-btn-row' });
            const num = (val, min, max) => U.el('input', { class: 'cf-input', type: 'number', value: val, min, max, step: 0.1 });
            const wIn = num(CARD_SIZES[0][1], 10, 300), hIn = num(CARD_SIZES[0][2], 10, 300), rIn = num(CARD_SIZES[0][3], 0, 20);
            const dimField = (label, inp) => U.el('div', null, U.el('label', { class: 'cf-field-label' }, label), inp);
            dims.appendChild(dimField('Width mm', wIn));
            dims.appendChild(dimField('Height mm', hIn));
            dims.appendChild(dimField('Corner mm', rIn));
            pane.appendChild(dims);
            selEl.addEventListener('change', () => {
              const [, w, h, r] = CARD_SIZES[parseInt(selEl.value, 10)];
              wIn.value = w; hIn.value = h; rIn.value = r;
            });
            pane.appendChild(U.el('p', { class: 'cf-hint' }, 'Single-side engraving. Anodized aluminum, brass, wood and acrylic blanks all work — dark marks on light material.'));
            fields.w = wIn; fields.h = hIn; fields.r = rIn;
          }
        }
        bCoin.addEventListener('click', () => { tab = 'coin'; buildPane(); });
        bCard.addEventListener('click', () => { tab = 'card'; buildPane(); });
        buildPane();
        b._fields = fields;
      },
      buttons: [
        { label: 'Cancel', onClick: m => m.close() },
        {
          label: 'Create', primary: true, onClick: m => {
            const f = m.body._fields;
            m.close();
            if (tab === 'coin') {
              const D = coinSel === 'custom' ? U.clamp(parseFloat(f.coinCustom.value) || 45, 5, 300) : parseFloat(coinSel);
              S().newDoc(D);
            } else {
              const wMM = U.clamp(parseFloat(f.w.value) || 85.6, 10, 300);
              const hMM = U.clamp(parseFloat(f.h.value) || 54, 10, 300);
              const cornerRMM = U.clamp(parseFloat(f.r.value) || 0, 0, Math.min(wMM, hMM) / 2);
              S().newDoc({ kind: cornerRMM > 0 ? 'rounded' : 'rect', wMM, hMM, cornerRMM, marginMM: 4 });
            }
            CF.renderer.fit();
          }
        }
      ]
    });
  }

  /* ================= manager modal ================= */
  async function openManager() {
    const modal = CF.ui.modal({ title: 'Projects', width: '860px' });
    const bar = U.el('div', { class: 'cf-btn-row' });
    const bNew = U.el('button', { class: 'cf-btn primary' }, '+ New design');
    bNew.addEventListener('click', () => { modal.close(); newCoinDialog(); });
    const bImport = U.el('button', { class: 'cf-btn' }, 'Import .coin file…');
    bImport.addEventListener('click', () => { modal.close(); importCoinFile(); });
    bar.appendChild(bNew); bar.appendChild(bImport);
    modal.body.appendChild(bar);

    /* ---- cloud slots (hosted only) ---- */
    const cloudWrap = U.el('div');
    modal.body.appendChild(cloudWrap);

    /* ---- local projects ---- */
    const localHead = U.el('div', { class: 'cf-projsec' },
      U.el('span', null, backend().kind === 'native' ? 'Saved projects' : 'On this device'),
      backend().kind === 'browser'
        ? U.el('span', { class: 'cf-projsec-note' }, 'unlimited · stored in this browser only')
        : null);
    modal.body.appendChild(localHead);
    const grid = U.el('div', { class: 'cf-projgrid' });
    modal.body.appendChild(grid);

    async function refillCloud() {
      cloudWrap.innerHTML = '';
      const C = CF.cloud;
      if (!C || !C.available()) return; /* desktop / local / signed-out: no cloud UI */

      const max = C.maxSlots();
      const tier = C.tier();
      const head = U.el('div', { class: 'cf-projsec' },
        U.el('span', null, '☁ Cloud slots'),
        U.el('span', { class: 'cf-tierchip cf-tier-' + tier }, tier.toUpperCase()));
      cloudWrap.appendChild(head);

      if (max === 0) {
        /* free plan: honest teaser, no dark patterns */
        const tease = U.el('div', { class: 'cf-cloudtease' },
          U.el('div', { class: 'cf-cloudtease-slots' },
            U.el('div', { class: 'cf-slot cf-slot-locked' }, '🔒'),
            U.el('div', { class: 'cf-slot cf-slot-locked' }, '🔒'),
            U.el('div', { class: 'cf-slot cf-slot-locked' }, '🔒')),
          U.el('div', { class: 'cf-cloudtease-txt' },
            U.el('b', null, 'Projects that follow your account.'),
            ' Cloud slots sync your coins to any device you sign in on. Pro includes 10 slots — plus the full template & asset vault.',
            U.el('a', { href: C.plansURL, target: '_blank', rel: 'noopener', class: 'cf-cloudtease-link' }, 'See plans →')));
        const link = tease.querySelector('.cf-cloudtease-link');
        link.addEventListener('click', (e) => {
          if (CF.billing) { e.preventDefault(); modal.close(); CF.billing.upgradeDialog(); }
        });
        cloudWrap.appendChild(tease);
        return;
      }

      let items;
      try { items = await C.list(); }
      catch (e) {
        cloudWrap.appendChild(U.el('p', { class: 'cf-hint' }, 'Cloud unavailable: ' + C.friendly(e)));
        return;
      }

      const grid = U.el('div', { class: 'cf-slotgrid' });
      /* show every slot in the plan + any occupied slot above it (downgrade safety) */
      const visible = Math.max(max, items.reduce((m, it, i) => it ? i + 1 : m, 0));
      for (let s = 0; s < visible; s++) {
        const it = items[s];
        const overPlan = s >= max;
        if (!it) {
          if (overPlan) continue;
          const empty = U.el('div', { class: 'cf-slot cf-slot-empty', title: 'Save the current coin to this slot' },
            U.el('div', { class: 'cf-slot-plus' }, '＋'),
            U.el('div', { class: 'cf-slot-cap' }, 'Slot ' + (s + 1)));
          empty.addEventListener('click', async () => {
            if (await saveToSlot(s)) refillCloud();
          });
          grid.appendChild(empty);
          continue;
        }
        const card = U.el('div', { class: 'cf-slot cf-slot-full' + (overPlan ? ' cf-slot-over' : '') },
          U.el('img', { class: 'cf-slot-thumb', src: it.thumb || '' }),
          U.el('div', { class: 'cf-slot-name' }, it.name || '(untitled)'),
          U.el('div', { class: 'cf-slot-cap' },
            'Slot ' + (s + 1) + ' · ' + new Date(it.modified).toLocaleDateString() +
            (overPlan ? ' · read-only on ' + tier : '')));
        card.addEventListener('click', async () => { modal.close(); await openSlot(s); });
        card.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const entries = [
            { label: 'Open', onClick: async () => { modal.close(); await openSlot(s); } },
          ];
          if (!overPlan) entries.push({
            label: 'Overwrite with current coin', onClick: async () => {
              if (await CF.ui.confirm('Overwrite slot ' + (s + 1),
                `Replace “${it.name}” with the current coin?`, 'Overwrite')) {
                if (await saveToSlot(s)) refillCloud();
              }
            }
          });
          entries.push({
            label: 'Rename', onClick: async () => {
              const v = await CF.ui.prompt('Rename cloud project', 'Name', it.name);
              if (v) { try { await C.rename(s, v); refillCloud(); } catch (err) { CF.ui.toast(C.friendly(err), 3500, 'error'); } }
            }
          });
          entries.push('-');
          entries.push({
            label: 'Delete', onClick: async () => {
              if (await CF.ui.confirm('Delete cloud project', `Delete “${it.name}” from slot ${s + 1} permanently?`, 'Delete')) {
                try { await C.remove(s); refillCloud(); } catch (err) { CF.ui.toast(C.friendly(err), 3500, 'error'); }
              }
            }
          });
          CF.ui.menu({ getBoundingClientRect: () => ({ left: e.clientX, bottom: e.clientY, top: e.clientY }) }, entries);
        });
        grid.appendChild(card);
      }
      cloudWrap.appendChild(grid);

      /* free tier: gentle upsell for the other 9 slots + the vault */
      if (tier === 'free' && CF.billing) {
        const up = U.el('div', { class: 'cf-cloudtease', style: { marginTop: '10px' } },
          U.el('div', { class: 'cf-cloudtease-txt' },
            'Using your ', U.el('b', null, '1 free cloud slot'),
            '. Pro unlocks ', U.el('b', null, '10 slots'), ' and the full template & asset vault — ',
            U.el('a', { href: C.plansURL, rel: 'noopener', class: 'cf-cloudtease-link' }, 'go Pro →')));
        up.querySelector('.cf-cloudtease-link').addEventListener('click', (e) => {
          e.preventDefault(); modal.close(); CF.billing.upgradeDialog();
        });
        cloudWrap.appendChild(up);
      }
    }

    async function refill() {
      grid.innerHTML = '';
      let items = [];
      try { items = await backend().list(); }
      catch (e) { grid.appendChild(U.el('p', { class: 'cf-hint' }, 'Could not read saved projects: ' + e.message)); return; }
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
                  try { await backend().write(U.uid(), payload); } catch (err) { CF.ui.toast('Duplicate failed: ' + err.message, 3500, 'error'); }
                  refill();
                }
              }
            },
            {
              label: 'Rename', onClick: async () => {
                const v = await CF.ui.prompt('Rename project', 'Name', p.name);
                if (v) {
                  const payload = await backend().read(p.id);
                  if (payload) {
                    payload.doc.name = v;
                    try { await backend().write(p.id, payload); } catch (err) { CF.ui.toast('Rename failed: ' + err.message, 3500, 'error'); }
                    refill();
                  }
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
    refillCloud();
    refill();
  }

  /* ================= free-plan storage banner =================
     Hosted app, signed in on the Free plan: one calm, dismissible
     line so nobody is surprised that local saves live in this
     browser. Never shown on desktop or local use.            */
  const BANNER_KEY = 'cf.storagebanner.v1';
  function mountBanner() {
    if (!CF.auth || !CF.auth.required || !CF.auth.user) return;
    if ((CF.auth.tier || 'free') !== 'free') { unmountBanner(); return; }
    try { if (localStorage.getItem(BANNER_KEY)) return; } catch (e) { }
    if (U.$('#cf-storebanner')) return;

    const bar = U.el('div', { id: 'cf-storebanner' },
      U.el('span', { class: 'cf-storebanner-txt' },
        '💾 Free plan: ', U.el('b', null, '1 cloud slot'),
        ' + unlimited local saves (this device). Pro unlocks 10 cloud slots and the template vault.'),
      U.el('button', { class: 'cf-storebanner-btn' }, 'Export backup'),
      U.el('a', { class: 'cf-storebanner-link', href: CF.cloud ? CF.cloud.plansURL : '#', target: '_blank', rel: 'noopener' }, 'See plans'),
      U.el('button', { class: 'cf-storebanner-x', title: 'Dismiss' }, '×'));
    bar.querySelector('.cf-storebanner-btn').addEventListener('click', exportCoinFile);
    bar.querySelector('.cf-storebanner-x').addEventListener('click', () => {
      try { localStorage.setItem(BANNER_KEY, '1'); } catch (e) { }
      unmountBanner();
    });
    const app = U.$('#app'), main = U.$('#main');
    if (app && main) app.insertBefore(bar, main);
  }
  function unmountBanner() {
    const b = U.$('#cf-storebanner');
    if (b) b.remove();
  }
  CF.bus.on('auth', mountBanner);

  /* ================= autosave ================= */
  const AUTOSAVE_KEY = 'cf.autosave';
  function autosavePayload() {
    return { doc: S().doc, projectId: S().projectId, at: Date.now() };
  }
  function autosaveTick() {
    if (!S().doc || !S().dirty) return;
    const snap = autosavePayload();
    kvSet(AUTOSAVE_KEY, snap).catch(() => { });
    /* localStorage duplicate: synchronous, so it survives instant
       tab-close; skipped harmlessly when the doc is photo-heavy */
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap)); } catch (e) { }
  }

  async function checkRecovery() {
    let saved = null;
    try { saved = await kvGet(AUTOSAVE_KEY); } catch (e) { }
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        const ls = JSON.parse(raw);
        if (!saved || (ls.at || 0) > (saved.at || 0)) saved = ls;
      }
    } catch (e) { }
    if (!saved) return;
    try {
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
        kvDel(AUTOSAVE_KEY).catch(() => { });
        try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { }
      }
    } catch (e) { console.warn('recovery failed', e); }
  }

  /* ================= quick cloud-save dialog (File menu / Ctrl+Shift+S) ================= */
  async function cloudSaveDialog() {
    const C = CF.cloud;
    if (!C || !C.available()) { CF.ui.toast('Cloud saves need the hosted app with an account.', 3000, 'error'); return; }
    const doc = S().doc;
    if (!doc) return;
    const max = C.maxSlots();
    const modal = CF.ui.modal({ title: '☁ Save to cloud', width: '640px' });

    if (max === 0) {
      modal.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
        'Cloud slots come with Pro — your coins follow your account to any device you sign in on.'));
      const b = U.el('button', { class: 'cf-btn primary' }, 'See plans');
      b.addEventListener('click', () => { modal.close(); if (CF.billing) CF.billing.upgradeDialog(); });
      modal.body.appendChild(b);
      return;
    }

    modal.body.appendChild(U.el('p', { class: 'cf-hint' },
      'Pick a slot for “' + (doc.name || 'Untitled Coin') + '”. Saving to a filled slot replaces it (after confirming).'));
    const grid = U.el('div', { class: 'cf-slotgrid' });
    modal.body.appendChild(grid);

    let items;
    try { items = await C.list(); }
    catch (e) { grid.appendChild(U.el('p', { class: 'cf-hint' }, 'Cloud unavailable: ' + C.friendly(e))); return; }

    for (let s = 0; s < max; s++) {
      const it = items[s];
      let card;
      if (it) {
        card = U.el('div', { class: 'cf-slot cf-slot-full', title: 'Overwrite this slot with the current coin' },
          U.el('img', { class: 'cf-slot-thumb', src: it.thumb || '' }),
          U.el('div', { class: 'cf-slot-name' }, it.name || '(untitled)'),
          U.el('div', { class: 'cf-slot-cap' }, 'Slot ' + (s + 1) + ' · ' + new Date(it.modified).toLocaleDateString()));
        card.addEventListener('click', async () => {
          if (await CF.ui.confirm('Overwrite slot ' + (s + 1), `Replace “${it.name}” with the current coin?`, 'Overwrite')) {
            if (await saveToSlot(s)) modal.close();
          }
        });
      } else {
        card = U.el('div', { class: 'cf-slot cf-slot-empty', title: 'Save the current coin here' },
          U.el('div', { class: 'cf-slot-plus' }, '＋'),
          U.el('div', { class: 'cf-slot-cap' }, 'Slot ' + (s + 1) + ' · empty'));
        card.addEventListener('click', async () => { if (await saveToSlot(s)) modal.close(); });
      }
      grid.appendChild(card);
    }
  }

  CF.projects = {
    saveCurrent, openManager, exportCoinFile, importCoinFile, newCoinDialog, checkRecovery,
    saveToSlot, openSlot, cloudSaveDialog,
    startAutosave() { setInterval(autosaveTick, 15000); window.addEventListener('beforeunload', autosaveTick); }
  };
})();
