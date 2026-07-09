/* ============================================================
   CoinForge Studio — interactions.js
   Pointer handling on the design canvas: select, move, rotate,
   scale, ring-radius drag, pan & zoom, inline text editing.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util;
  const S = () => CF.store;
  const R = () => CF.renderer;

  let canvas = null;
  let mode = null;       /* 'move' | 'scale' | 'rotate' | 'radius' | 'pan' | 'pinch' */
  let start = null;      /* drag context */
  let spaceHeld = false;
  const pointers = new Map(); /* active pointerId → {x, y} in CSS px */

  function topmostHit(pt, tolMM) {
    const els = S().doc.elements;
    for (let i = els.length - 1; i >= 0; i--) {
      if (CF.Elements.hitTest(els[i], pt.x, pt.y, tolMM)) return els[i];
    }
    return null;
  }

  function handleAt(px, py, touch) {
    const sels = S().selEls();
    if (sels.length !== 1 || sels[0].locked) return null;
    const el = sels[0];
    for (const h of R().handles(el)) {
      const rr = (h.kind === 'scale' ? 7 : 9) + (touch ? 9 : 0);
      if (Math.abs(px - h.x) <= rr && Math.abs(py - h.y) <= rr) return { ...h, el };
    }
    return null;
  }

  function markTouch(e) {
    if (e.pointerType === 'touch' && !R().touchMode) {
      R().touchMode = true; /* renderer draws fatter handles from now on */
      R().render();
    }
  }

  /* ---- two-finger pinch: zoom around the gesture midpoint + pan ---- */
  function beginPinch() {
    if (mode && mode !== 'pan' && mode !== 'pinch') S().endTransient();
    const [a, b] = [...pointers.values()];
    const rect = canvas.getBoundingClientRect();
    const midX = (a.x + b.x) / 2 - rect.left, midY = (a.y + b.y) / 2 - rect.top;
    mode = 'pinch';
    start = {
      d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)),
      zoom0: S().ui.zoom || 1,
      anchor: R().screenToMM(midX, midY),
    };
  }

  function movePinch() {
    const [a, b] = [...pointers.values()];
    const rect = canvas.getBoundingClientRect();
    const midX = (a.x + b.x) / 2 - rect.left, midY = (a.y + b.y) / 2 - rect.top;
    const d = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
    S().ui.zoom = U.clamp(start.zoom0 * d / start.d0, 0.15, 12);
    const s = R().scale();
    const dpr = window.devicePixelRatio || 1;
    /* keep the world point that started under the fingers glued to the midpoint */
    S().ui.panX = (midX * dpr - start.anchor.x * s - R().canvas.width / 2) / dpr;
    S().ui.panY = (midY * dpr - start.anchor.y * s - R().canvas.height / 2) / dpr;
    R().render();
    CF.bus.emit('zoom');
  }

  function setCursor(c) { canvas.style.cursor = c; }

  function angleAt(pt, el) {
    return U.rad2deg(Math.atan2(pt.x - el.x, -(pt.y - el.y)));
  }

  function onPointerDown(e) {
    markTouch(e);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic/lost pointers */ }
    if (pointers.size === 2) { beginPinch(); return; }
    if (pointers.size > 2 || mode === 'pinch') return;

    if (e.button === 1 || spaceHeld || e.altKey) {
      mode = 'pan';
      start = { px: e.clientX, py: e.clientY, panX: S().ui.panX, panY: S().ui.panY };
      setCursor('grabbing');
      return;
    }
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const pt = R().screenToMM(px, py);
    const touch = e.pointerType === 'touch';
    const tolMM = (touch ? 13 : 6) / R().scale() * (window.devicePixelRatio || 1);

    const h = handleAt(px, py, touch);
    if (h) {
      const el = h.el;
      S().beginTransient();
      if (h.kind === 'rotate') {
        mode = 'rotate';
        start = { el, startAngle: angleAt(pt, el), origRot: rotProp(el).get() };
      } else if (h.kind === 'radius') {
        mode = 'radius';
        start = { el, origR: CF.Elements.getRadius(el), startDist: Math.hypot(pt.x - el.x, pt.y - el.y) };
      } else {
        mode = 'scale';
        start = { el, startDist: Math.max(0.5, Math.hypot(pt.x - el.x, pt.y - el.y)), snap: U.deepClone(el) };
      }
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const hit = topmostHit(pt, tolMM);
    if (hit) {
      if (e.shiftKey) S().toggleSel(hit.id);
      else if (!S().sel.has(hit.id)) S().select(hit.id);
      if (hit.locked) { mode = null; return; }
      S().beginTransient();
      if (CF.Elements.isRingLike(hit)) {
        mode = 'radius';
        start = { el: hit, origR: CF.Elements.getRadius(hit), startDist: Math.max(0.5, Math.hypot(pt.x - hit.x, pt.y - hit.y)) };
      } else {
        mode = 'move';
        const moved = S().selEls().filter(el => !el.locked && !CF.Elements.isRingLike(el));
        start = { pt0: pt, orig: moved.map(el => ({ el, x: el.x, y: el.y })), moved: false };
      }
      canvas.setPointerCapture(e.pointerId);
    } else {
      if (!e.shiftKey) S().clearSel();
      mode = 'pan';
      start = { px: e.clientX, py: e.clientY, panX: S().ui.panX, panY: S().ui.panY };
      setCursor('grabbing');
      canvas.setPointerCapture(e.pointerId);
    }
  }

  const rotProp = (el) => {
    if (el.type === 'arctext' && el.lockCenter !== false) return {
      get: () => el.centerDeg || 0, set: v => { el.centerDeg = Math.round(v * 10) / 10; }
    };
    if (el.type === 'symbolring' && el.lockCenter !== false) return {
      get: () => el.startDeg || 0, set: v => { el.startDeg = Math.round(v * 10) / 10; }
    };
    return { get: () => el.rotation || 0, set: v => { el.rotation = Math.round(v * 10) / 10; } };
  };

  let rafPending = false;
  function softEmit() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; S().emitTransient(); });
  }

  function onPointerMove(e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'pinch') {
      if (pointers.size >= 2) movePinch();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const pt = R().screenToMM(px, py);
    CF.bus.emit('cursor', pt);

    if (!mode) {
      /* hover feedback */
      const h = handleAt(px, py);
      if (h) {
        setCursor(h.kind === 'rotate' ? 'grab' : h.kind === 'radius' ? 'ew-resize' : 'nwse-resize');
        if (R().hoverId) { R().hoverId = null; R().render(); }
        return;
      }
      const tolMM = 6 / R().scale() * (window.devicePixelRatio || 1);
      const hit = topmostHit(pt, tolMM);
      setCursor(hit ? 'move' : 'default');
      const newHover = hit ? hit.id : null;
      if (newHover !== R().hoverId) { R().hoverId = newHover; R().render(); }
      return;
    }

    if (mode === 'pan') {
      S().ui.panX = start.panX + (e.clientX - start.px);
      S().ui.panY = start.panY + (e.clientY - start.py);
      R().render();
      return;
    }
    if (mode === 'move') {
      let dx = pt.x - start.pt0.x, dy = pt.y - start.pt0.y;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      for (const o of start.orig) {
        let nx = o.x + dx, ny = o.y + dy;
        /* snap to center axes */
        if (Math.abs(nx) < 0.6) nx = 0;
        if (Math.abs(ny) < 0.6) ny = 0;
        o.el.x = Math.round(nx * 100) / 100;
        o.el.y = Math.round(ny * 100) / 100;
      }
      start.moved = true;
      softEmit();
      return;
    }
    if (mode === 'scale') {
      const el = start.el;
      const dist = Math.max(0.5, Math.hypot(pt.x - el.x, pt.y - el.y));
      const f = dist / start.startDist;
      /* restore snapshot props then apply fresh scale (keeps repeatable) */
      const snap = start.snap;
      for (const k of Object.keys(snap)) if (k !== 'id') el[k] = U.deepClone(snap[k]);
      CF.Elements.scaleBy(el, f);
      softEmit();
      return;
    }
    if (mode === 'rotate') {
      const el = start.el;
      const a = angleAt(pt, el);
      let v = start.origRot + (a - start.startAngle);
      if (e.shiftKey) v = Math.round(v / 15) * 15;
      rotProp(el).set(((v % 360) + 540) % 360 - 180);
      softEmit();
      return;
    }
    if (mode === 'radius') {
      const el = start.el;
      const dist = Math.hypot(pt.x - el.x, pt.y - el.y);
      const nr = Math.max(1, start.origR + (dist - start.startDist));
      CF.Elements.setRadius(el, Math.round(nr * 20) / 20);
      softEmit();
      return;
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (mode === 'pinch') {
      /* gesture ends when fewer than two fingers remain; a fresh touch starts fresh */
      if (pointers.size < 2) { mode = null; start = null; S().setUI({}); }
      return;
    }
    if (mode === 'pan') {
      S().setUI({});
      setCursor('default');
    } else if (mode) {
      S().endTransient();
    }
    mode = null;
    start = null;
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const before = R().screenToMM(px, py);
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const z = U.clamp((S().ui.zoom || 1) * f, 0.15, 12);
    S().ui.zoom = z;
    const after = R().screenToMM(px, py);
    const s = R().scale();
    S().ui.panX += (after.x - before.x) * s / (window.devicePixelRatio || 1);
    S().ui.panY += (after.y - before.y) * s / (window.devicePixelRatio || 1);
    R().render();
    CF.bus.emit('zoom');
  }

  function onDblClick(e) {
    const rect = canvas.getBoundingClientRect();
    const pt = R().screenToMM(e.clientX - rect.left, e.clientY - rect.top);
    const tolMM = 6 / R().scale() * (window.devicePixelRatio || 1);
    const hit = topmostHit(pt, tolMM);
    if (!hit) return;
    S().select(hit.id);
    if (hit.type === 'text' || hit.type === 'arctext' || hit.type === 'banner') {
      inlineEdit(hit, e.clientX, e.clientY);
    }
  }

  function inlineEdit(el, cx, cy) {
    const isMulti = el.type === 'text';
    const inp = U.el(isMulti ? 'textarea' : 'input', {
      class: 'cf-inline-edit',
      style: { left: (cx - 110) + 'px', top: (cy - 18) + 'px' }
    });
    inp.value = el.text || '';
    document.body.appendChild(inp);
    inp.focus();
    inp.select();
    const commit = (save) => {
      if (save && inp.value !== el.text) {
        S().mutate(d => { const t = d.elements.find(x => x.id === el.id); if (t) t.text = inp.value; });
      }
      inp.remove();
    };
    inp.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'Enter' && (!isMulti || ev.ctrlKey)) { ev.preventDefault(); commit(true); }
      if (ev.key === 'Escape') commit(false);
    });
    inp.addEventListener('blur', () => commit(true));
  }

  CF.interact = {
    init(cv) {
      canvas = cv;
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('dblclick', onDblClick);
      window.addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.matches('input,textarea')) spaceHeld = true; });
      window.addEventListener('keyup', e => { if (e.code === 'Space') spaceHeld = false; });
    }
  };
})();