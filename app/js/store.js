/* ============================================================
   CoinForge Studio — store.js
   Document state, selection, undo/redo.
   Emits on CF.bus: 'doc' | 'doc-soft' | 'sel' | 'ui' | 'history' | 'newdoc'
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util;

  const S = {
    doc: null,
    sel: new Set(),
    ui: {
      zoom: 1, panX: 0, panY: 0,
      metal: 'brass', markLight: false, relief: true, showGuides: true,
      unit: 'mm', tab: 'add',
      soloGroup: null, mutedGroups: []
    },
    undoStack: [],
    redoStack: [],
    dirty: false,
    projectId: null,
  };

  let currentSnap = null;
  let transientPre = null;

  S.newDoc = function (diameterMM = 44.45, name = 'Untitled Coin') {
    S.doc = {
      version: 2,
      id: U.uid(),
      name,
      author: CF.AUTHOR,
      coin: { diameterMM, marginMM: 2 },
      dpi: 1016,
      groups: [],
      elements: []
    };
    S.sel.clear();
    S.undoStack = [];
    S.redoStack = [];
    S.dirty = false;
    S.projectId = null;
    currentSnap = JSON.stringify(S.doc);
    CF.bus.emit('newdoc');
    CF.bus.emit('doc');
    CF.bus.emit('sel');
    CF.bus.emit('history');
  };

  S.setDoc = function (doc, { keepProject = false } = {}) {
    S.doc = doc;
    if (!S.doc.coin) S.doc.coin = { diameterMM: 44.45, marginMM: 2 };
    if (!Array.isArray(S.doc.groups)) S.doc.groups = []; /* migrate pre-1.1 docs */
    S.ui.soloGroup = null;
    S.ui.mutedGroups = [];
    S.sel.clear();
    S.undoStack = [];
    S.redoStack = [];
    S.dirty = false;
    if (!keepProject) S.projectId = null;
    currentSnap = JSON.stringify(S.doc);
    CF.bus.emit('newdoc');
    CF.bus.emit('doc');
    CF.bus.emit('sel');
    CF.bus.emit('history');
  };

  S.serialize = () => JSON.stringify(S.doc);

  function pushUndo(pre) {
    S.undoStack.push(pre);
    if (S.undoStack.length > 80) S.undoStack.shift();
    S.redoStack = [];
    S.dirty = true;
    CF.bus.emit('history');
  }

  /* one-shot tracked mutation */
  S.mutate = function (fn) {
    const pre = currentSnap;
    fn(S.doc);
    const now = JSON.stringify(S.doc);
    if (now !== pre) {
      currentSnap = now;
      pushUndo(pre);
    }
    CF.bus.emit('doc');
  };

  /* drag-style mutation: begin → (updates + emit) → end */
  S.beginTransient = function () { transientPre = currentSnap; };
  S.emitTransient = function () { CF.bus.emit('doc'); };
  S.endTransient = function () {
    if (transientPre === null) return;
    const now = JSON.stringify(S.doc);
    if (now !== transientPre) {
      currentSnap = now;
      pushUndo(transientPre);
    }
    transientPre = null;
    CF.bus.emit('doc');
  };

  S.canUndo = () => S.undoStack.length > 0;
  S.canRedo = () => S.redoStack.length > 0;

  S.undo = function () {
    if (!S.undoStack.length) return;
    S.redoStack.push(currentSnap);
    currentSnap = S.undoStack.pop();
    S.doc = JSON.parse(currentSnap);
    pruneSel();
    S.dirty = true;
    CF.bus.emit('doc'); CF.bus.emit('sel'); CF.bus.emit('history');
  };

  S.redo = function () {
    if (!S.redoStack.length) return;
    S.undoStack.push(currentSnap);
    currentSnap = S.redoStack.pop();
    S.doc = JSON.parse(currentSnap);
    pruneSel();
    S.dirty = true;
    CF.bus.emit('doc'); CF.bus.emit('sel'); CF.bus.emit('history');
  };

  function pruneSel() {
    const ids = new Set(S.doc.elements.map(e => e.id));
    for (const id of [...S.sel]) if (!ids.has(id)) S.sel.delete(id);
  }

  /* ---------- selection ---------- */
  S.select = function (ids, { add = false } = {}) {
    if (!add) S.sel.clear();
    for (const id of (Array.isArray(ids) ? ids : [ids])) if (id) S.sel.add(id);
    CF.bus.emit('sel');
  };
  S.toggleSel = function (id) {
    if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id);
    CF.bus.emit('sel');
  };
  S.clearSel = function () { if (S.sel.size) { S.sel.clear(); CF.bus.emit('sel'); } };
  S.selEls = () => S.doc ? S.doc.elements.filter(e => S.sel.has(e.id)) : [];
  S.firstSel = () => S.selEls()[0] || null;
  S.byId = (id) => S.doc.elements.find(e => e.id === id);

  /* ---------- element ops ---------- */
  S.addElement = function (el, { select = true } = {}) {
    S.mutate(d => d.elements.push(el));
    if (select) S.select(el.id);
    return el;
  };

  S.addElements = function (els, { select = true } = {}) {
    S.mutate(d => els.forEach(e => d.elements.push(e)));
    if (select) S.select(els.map(e => e.id));
    return els;
  };

  S.removeSelected = function () {
    if (!S.sel.size) return;
    S.mutate(d => { d.elements = d.elements.filter(e => !S.sel.has(e.id)); });
    S.sel.clear();
    CF.bus.emit('sel');
  };

  S.duplicateSelected = function () {
    const els = S.selEls();
    if (!els.length) return;
    const copies = els.map(e => {
      const c = U.deepClone(e);
      c.id = U.uid();
      c.name = (e.name || '') + ' copy';
      if (!CF.Elements.isRingLike(c)) { c.x += 2; c.y += 2; }
      return c;
    });
    S.addElements(copies);
  };

  /* dir: +1 = up one (later in array = drawn on top), 'top' | 'bottom' */
  S.reorder = function (id, dir) {
    S.mutate(d => {
      const i = d.elements.findIndex(e => e.id === id);
      if (i < 0) return;
      const [el] = d.elements.splice(i, 1);
      let j = dir === 'top' ? d.elements.length : dir === 'bottom' ? 0 : U.clamp(i + dir, 0, d.elements.length);
      d.elements.splice(j, 0, el);
    });
  };

  S.setUI = function (patch) {
    Object.assign(S.ui, patch);
    CF.bus.emit('ui');
  };

  /* ---------- layer groups (tags for per-pass export; z-order unaffected) ---------- */
  const GROUP_PALETTE = ['#0000FF', '#00E000', '#D0D000', '#FF8000', '#00E0E0', '#FF00FF', '#A0A0A4', '#800000', '#000080', '#008000'];

  S.addGroup = function (name) {
    let g = null;
    S.mutate(d => {
      const color = GROUP_PALETTE[d.groups.length % GROUP_PALETTE.length];
      g = { id: U.uid(), name: name || 'Group ' + (d.groups.length + 1), color };
      d.groups.push(g);
    });
    return g;
  };

  S.renameGroup = function (id, name) {
    S.mutate(d => { const g = d.groups.find(x => x.id === id); if (g && name) g.name = name; });
  };

  S.setGroupColor = function (id, color) {
    S.mutate(d => { const g = d.groups.find(x => x.id === id); if (g) g.color = color; });
  };

  S.removeGroup = function (id) {
    S.mutate(d => {
      d.groups = d.groups.filter(g => g.id !== id);
      d.elements.forEach(e => { if (e.groupId === id) e.groupId = null; });
    });
    if (S.ui.soloGroup === id) S.ui.soloGroup = null;
    S.ui.mutedGroups = S.ui.mutedGroups.filter(x => x !== id);
  };

  S.assignToGroup = function (ids, groupId) {
    S.mutate(d => {
      for (const el of d.elements) if (ids.includes(el.id)) el.groupId = groupId || null;
    });
  };

  S.groupById = (id) => S.doc && S.doc.groups ? S.doc.groups.find(g => g.id === id) : null;

  /* preview predicate honoring solo/mute (export builds its own) */
  S.groupVisible = function (el) {
    const gid = el.groupId || null;
    if (S.ui.soloGroup) return gid === S.ui.soloGroup;
    if (gid && S.ui.mutedGroups.includes(gid)) return false;
    return true;
  };

  S.groupPalette = GROUP_PALETTE;

  CF.store = S;
})();