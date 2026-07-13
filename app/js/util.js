/* ============================================================
   CoinForge Studio — util.js
   Shared helpers: DOM, math, ids, files, events, modal/toast UI.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
window.CF = window.CF || {};

CF.VERSION = '1.7.0';
CF.APP_NAME = 'CoinForge Studio';
CF.AUTHOR = 'Hratch Simonyan';

(function () {
  const U = {};

  /* ---------- DOM ---------- */
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  U.el = function (tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k === 'dataset') Object.assign(n.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (k === 'html') n.innerHTML = v;
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(9)) {
      if (kid === null || kid === undefined || kid === false) continue;
      n.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return n;
  };

  /* ---------- math ---------- */
  U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.round = (v, d = 2) => { const m = Math.pow(10, d); return Math.round(v * m) / m; };
  U.deg2rad = d => d * Math.PI / 180;
  U.rad2deg = r => r * 180 / Math.PI;
  U.mm2in = mm => mm / 25.4;
  U.in2mm = i => i * 25.4;
  U.fmtLen = (mm, unit) => unit === 'in' ? U.round(U.mm2in(mm), 3) + '"' : U.round(mm, 2) + ' mm';
  U.normDeg = d => { d = d % 360; return d < 0 ? d + 360 : d; };

  U.uid = () => 'e' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  /* ---------- misc ---------- */
  U.deepClone = o => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

  U.debounce = (fn, ms) => {
    let t = null;
    return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  };
  U.throttle = (fn, ms) => {
    let last = 0, t = null;
    return function (...a) {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(this, a); }
      else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn.apply(this, a); }, ms - (now - last)); }
    };
  };

  U.escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.svgEsc = U.escapeHtml;
  U.num = n => (Math.round(n * 1000) / 1000).toString();

  /* ---------- files / images ---------- */
  U.download = (name, blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  };

  U.dataURLtoBlob = (dataURL) => {
    const [head, body] = dataURL.split(',');
    const mime = /data:([^;]+)/.exec(head)[1];
    const bin = atob(body);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  U.readFile = (file, as = 'dataURL') => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    if (as === 'dataURL') r.readAsDataURL(file);
    else if (as === 'text') r.readAsText(file);
    else r.readAsArrayBuffer(file);
  });

  U.loadImage = src => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('Could not load image'));
    im.src = src;
  });

  U.makeCanvas = (w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
  };

  U.canvasFromImage = (img, maxDim) => {
    let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (maxDim && Math.max(w, h) > maxDim) {
      const f = maxDim / Math.max(w, h);
      w = Math.round(w * f); h = Math.round(h * f);
    }
    const { canvas, ctx } = U.makeCanvas(w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  };

  /* shade: 0 = full mark (black), 100 = no mark (white / bare metal) */
  U.shadeColor = s => { const v = Math.round(255 * U.clamp(s, 0, 100) / 100); return `rgb(${v},${v},${v})`; };

  /* ---------- path transform (M L C Q Z absolute only) ---------- */
  U.pathTransform = (d, { rot = 0, sx = 1, sy = 1, dx = 0, dy = 0 } = {}) => {
    const cos = Math.cos(U.deg2rad(rot)), sin = Math.sin(U.deg2rad(rot));
    const tp = (x, y) => {
      x *= sx; y *= sy;
      return [x * cos - y * sin + dx, x * sin + y * cos + dy];
    };
    const toks = d.match(/[MLCQZz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    let out = [], i = 0;
    const rd = () => parseFloat(toks[i++]);
    while (i < toks.length) {
      const t = toks[i++];
      if (t === 'Z' || t === 'z') { out.push('Z'); continue; }
      if (t === 'M' || t === 'L') {
        const [x, y] = tp(rd(), rd());
        out.push(`${t} ${U.num(x)} ${U.num(y)}`);
        // consume implicit lineto pairs
        while (i < toks.length && !/[MLCQZz]/.test(toks[i])) {
          const [x2, y2] = tp(rd(), rd());
          out.push(`L ${U.num(x2)} ${U.num(y2)}`);
        }
      } else if (t === 'C') {
        do {
          const [a, b] = tp(rd(), rd()), [c, dd] = tp(rd(), rd()), [e, f] = tp(rd(), rd());
          out.push(`C ${U.num(a)} ${U.num(b)} ${U.num(c)} ${U.num(dd)} ${U.num(e)} ${U.num(f)}`);
        } while (i < toks.length && !/[MLCQZz]/.test(toks[i]));
      } else if (t === 'Q') {
        do {
          const [a, b] = tp(rd(), rd()), [c, dd] = tp(rd(), rd());
          out.push(`Q ${U.num(a)} ${U.num(b)} ${U.num(c)} ${U.num(dd)}`);
        } while (i < toks.length && !/[MLCQZz]/.test(toks[i]));
      }
    }
    return out.join(' ');
  };

  /* ---------- event bus ---------- */
  const listeners = {};
  CF.bus = {
    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return fn; },
    off(evt, fn) { const l = listeners[evt]; if (l) { const idx = l.indexOf(fn); if (idx >= 0) l.splice(idx, 1); } },
    emit(evt, ...args) { (listeners[evt] || []).slice().forEach(fn => { try { fn(...args); } catch (e) { console.error('bus handler error', evt, e); } }); }
  };

  CF.util = U;

  /* ---------- lightweight UI kit: modal, toast, confirm, menu ---------- */
  const UI = {};

  UI.toast = (msg, ms = 2600, kind = '') => {
    let host = U.$('#cf-toasts');
    if (!host) { host = U.el('div', { id: 'cf-toasts' }); document.body.appendChild(host); }
    const t = U.el('div', { class: 'cf-toast ' + kind }, msg);
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, ms);
  };

  UI.modal = (opts) => {
    const overlay = U.el('div', { class: 'cf-overlay' });
    const win = U.el('div', { class: 'cf-modal', style: opts.width ? { width: opts.width, maxWidth: '96vw' } : null });
    const closeBtn = U.el('button', { class: 'cf-modal-x', title: 'Close (Esc)' }, '×');
    const head = U.el('div', { class: 'cf-modal-head' }, U.el('div', { class: 'cf-modal-title' }, opts.title || ''), closeBtn);
    const body = U.el('div', { class: 'cf-modal-body' });
    const foot = U.el('div', { class: 'cf-modal-foot' });
    win.appendChild(head); win.appendChild(body);

    const api = {
      root: overlay, body, foot,
      close(result) {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        if (opts.onClose) opts.onClose(result);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); api.close(); }
    };
    document.addEventListener('keydown', onKey, true);
    closeBtn.addEventListener('click', () => api.close());
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay && !opts.modal) api.close(); });

    if (typeof opts.content === 'function') opts.content(body, api);
    else if (opts.content) body.appendChild(opts.content);

    if (opts.buttons && opts.buttons.length) {
      for (const b of opts.buttons) {
        const btn = U.el('button', { class: 'cf-btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') }, b.label);
        btn.addEventListener('click', () => b.onClick ? b.onClick(api) : api.close());
        foot.appendChild(btn);
      }
      win.appendChild(foot);
    }
    overlay.appendChild(win);
    document.body.appendChild(overlay);
    return api;
  };

  UI.confirm = (title, message, okLabel = 'OK') => new Promise(res => {
    UI.modal({
      title, width: '420px', modal: true,
      content: (b) => b.appendChild(U.el('p', { class: 'cf-confirm-msg' }, message)),
      buttons: [
        { label: 'Cancel', onClick: (m) => { m.close(); res(false); } },
        { label: okLabel, primary: true, onClick: (m) => { m.close(); res(true); } }
      ],
      onClose: () => res(false)
    });
  });

  UI.prompt = (title, label, value = '') => new Promise(res => {
    let inp;
    const m = UI.modal({
      title, width: '420px', modal: true,
      content: (b) => {
        b.appendChild(U.el('label', { class: 'cf-field-label' }, label));
        inp = U.el('input', { class: 'cf-input', type: 'text', value });
        b.appendChild(inp);
        setTimeout(() => { inp.focus(); inp.select(); }, 30);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { m.close(); res(inp.value); } });
      },
      buttons: [
        { label: 'Cancel', onClick: (mm) => { mm.close(); res(null); } },
        { label: 'OK', primary: true, onClick: (mm) => { mm.close(); res(inp.value); } }
      ],
      onClose: () => res(null)
    });
  });

  /* small dropdown menu anchored to a button */
  UI.menu = (anchor, items) => {
    const existing = U.$('.cf-menu');
    if (existing) existing.remove();
    const r = anchor.getBoundingClientRect();
    const menu = U.el('div', { class: 'cf-menu', style: { left: r.left + 'px', top: (r.bottom + 4) + 'px' } });
    for (const it of items) {
      if (it === '-') { menu.appendChild(U.el('div', { class: 'cf-menu-sep' })); continue; }
      const row = U.el('div', { class: 'cf-menu-item' + (it.disabled ? ' disabled' : '') },
        U.el('span', null, it.label),
        it.hint ? U.el('span', { class: 'cf-menu-hint' }, it.hint) : null);
      if (!it.disabled) row.addEventListener('click', () => { menu.remove(); it.onClick && it.onClick(); });
      menu.appendChild(row);
    }
    const dismiss = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', dismiss, true); } };
    document.addEventListener('mousedown', dismiss, true);
    document.body.appendChild(menu);
    const mr = menu.getBoundingClientRect();
    if (mr.right > innerWidth - 8) menu.style.left = (innerWidth - mr.width - 8) + 'px';
    if (mr.bottom > innerHeight - 8) menu.style.top = (r.top - mr.height - 4) + 'px';
    return menu;
  };

  CF.ui = UI;
})();