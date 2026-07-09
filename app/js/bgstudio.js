/* ============================================================
   CoinForge Studio — bgstudio.js
   Background Removal Studio + smart image import flows.
   Modes:
     'place'      → result becomes a coin element, auto-fit center
     'element'    → edits an existing image element in place
     'standalone' → utility: save/copy the cutout PNG
   Engines: AI (U²-Net, if available) · Auto (border flood) ·
   White/Black key · Color pick · manual brush.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;

  function openStudio(srcCanvas, mode, opts = {}) {
    const W = srcCanvas.width, H = srcCanvas.height;
    let mask = new Float32Array(W * H).fill(1);   /* current base mask */
    let viewMask = mask;                           /* after feather/despeckle */
    const st = { tolerance: 38, feather: 1.5, despeckle: true, brush: 40, tool: null, lastOp: null, silhouette: false };

    const modal = CF.ui.modal({ title: mode === 'standalone' ? 'Background Remover' : 'Smart Image Import', width: '980px', modal: true });
    const wrap = U.el('div', { class: 'cf-bg-wrap' });
    const toolcol = U.el('div', { class: 'cf-bg-tools' });
    const canvasHost = U.el('div', { class: 'cf-bg-canvashost' });
    const view = U.el('canvas', { class: 'cf-bg-view' });
    canvasHost.appendChild(view);
    wrap.appendChild(toolcol);
    wrap.appendChild(canvasHost);
    modal.body.appendChild(wrap);

    /* fit view canvas */
    const maxSide = 560;
    const scale = Math.min(maxSide / W, maxSide / H, 1);
    view.width = Math.round(W * scale);
    view.height = Math.round(H * scale);

    const status = U.el('div', { class: 'cf-hint', style: { minHeight: '18px' } }, 'Pick a removal method, then refine with the brush.');

    function recomputeView() {
      viewMask = new Float32Array(mask);
      if (st.despeckle) CF.Img.despeckle(viewMask, W, H, Math.max(12, Math.round(W * H * 0.0004)));
      if (st.feather > 0) CF.Img.featherMask(viewMask, W, H, st.feather * Math.max(1, W / 400));
      draw();
    }

    function resultCanvas() {
      let out = CF.Img.applyMask(srcCanvas, viewMask);
      if (st.silhouette) {
        const ctx = out.getContext('2d');
        const img = ctx.getImageData(0, 0, W, H);
        const d = img.data;
        for (let p = 0; p < W * H; p++) {
          const a = d[p * 4 + 3];
          d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = 0;
          d[p * 4 + 3] = a > 110 ? 255 : 0;
        }
        ctx.putImageData(img, 0, 0);
      }
      return out;
    }

    let showOriginal = false;
    function draw() {
      const ctx = view.getContext('2d');
      /* checkerboard */
      for (let y = 0; y < view.height; y += 14) for (let x = 0; x < view.width; x += 14) {
        ctx.fillStyle = ((x + y) / 14) % 2 ? '#3a3f47' : '#2d3138';
        ctx.fillRect(x, y, 14, 14);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(showOriginal ? srcCanvas : resultCanvas(), 0, 0, view.width, view.height);
    }

    /* ---------- tool column ---------- */
    const addTitle = t => toolcol.appendChild(U.el('div', { class: 'cf-pane-title' }, t));
    const addBtn = (label, fn, cls = '') => {
      const b = U.el('button', { class: 'cf-btn cf-btn-block ' + cls }, label);
      b.addEventListener('click', fn);
      toolcol.appendChild(b);
      return b;
    };

    addTitle('Remove background');

    const aiBtn = addBtn('🤖 AI subject detect', async () => {
      aiBtn.disabled = true;
      aiBtn.textContent = '🤖 Working…';
      try {
        const m = await CF.AI.removeBackground(srcCanvas);
        mask = m;
        st.lastOp = 'ai';
        status.textContent = 'AI mask applied — adjust feather or refine with brushes.';
        recomputeView();
      } catch (e) {
        status.textContent = 'AI unavailable (' + e.message + ') — try Auto instead.';
      }
      aiBtn.disabled = false;
      aiBtn.textContent = '🤖 AI subject detect';
    }, 'primary');
    if (!CF.AI.probe()) { aiBtn.disabled = true; aiBtn.title = 'AI runtime not found (vendor/ort files missing)'; }

    addBtn('✨ Auto (detect background)', () => {
      const { mask: m, colors } = CF.Img.autoRemove(srcCanvas, { tolerance: st.tolerance, feather: 0 });
      mask = m;
      st.lastOp = 'auto';
      status.textContent = colors.length ? 'Removed border-connected background.' : 'No clear background color found — try AI or color pick.';
      recomputeView();
    });

    const row1 = U.el('div', { class: 'cf-btn-row' });
    const wBtn = U.el('button', { class: 'cf-btn' }, 'White BG');
    wBtn.addEventListener('click', () => {
      mask = CF.Img.lumaKeyMask(CF.Img.getData(srcCanvas), 'white', 255 - st.tolerance * 1.6);
      st.lastOp = 'white';
      recomputeView();
    });
    const bBtn = U.el('button', { class: 'cf-btn' }, 'Black BG');
    bBtn.addEventListener('click', () => {
      mask = CF.Img.lumaKeyMask(CF.Img.getData(srcCanvas), 'black', st.tolerance * 1.6);
      st.lastOp = 'black';
      recomputeView();
    });
    row1.appendChild(wBtn); row1.appendChild(bBtn);
    toolcol.appendChild(row1);

    const pickBtn = addBtn('🎯 Pick color to remove', () => {
      st.tool = st.tool === 'pick' ? null : 'pick';
      pickBtn.classList.toggle('primary', st.tool === 'pick');
      status.textContent = st.tool === 'pick' ? 'Click a color in the image to key it out globally.' : '';
    });

    /* tolerance */
    const tolWrap = U.el('div', { class: 'cf-field' });
    tolWrap.appendChild(U.el('label', { class: 'cf-field-label' }, 'Tolerance'));
    const tolS = U.el('input', { class: 'cf-slider', type: 'range', min: 4, max: 110, value: st.tolerance });
    tolS.addEventListener('change', () => {
      st.tolerance = parseInt(tolS.value, 10);
      /* re-run last automatic op with new tolerance */
      if (st.lastOp === 'auto') { mask = CF.Img.autoRemove(srcCanvas, { tolerance: st.tolerance, feather: 0 }).mask; recomputeView(); }
      if (st.lastOp === 'white') wBtn.click();
      if (st.lastOp === 'black') bBtn.click();
      if (st.lastOp && st.lastOp.r !== undefined) { mask = CF.Img.colorKeyMask(CF.Img.getData(srcCanvas), st.lastOp, st.tolerance); recomputeView(); }
    });
    tolWrap.appendChild(tolS);
    toolcol.appendChild(tolWrap);

    /* feather + despeckle */
    const feWrap = U.el('div', { class: 'cf-field' });
    feWrap.appendChild(U.el('label', { class: 'cf-field-label' }, 'Edge feather'));
    const feS = U.el('input', { class: 'cf-slider', type: 'range', min: 0, max: 8, step: 0.5, value: st.feather });
    feS.addEventListener('change', () => { st.feather = parseFloat(feS.value); recomputeView(); });
    feWrap.appendChild(feS);
    toolcol.appendChild(feWrap);

    const dsp = U.el('input', { type: 'checkbox', checked: '' });
    dsp.addEventListener('change', () => { st.despeckle = dsp.checked; recomputeView(); });
    toolcol.appendChild(U.el('div', { class: 'cf-field cf-field-check' }, U.el('label', { class: 'cf-check-label' }, dsp, ' Clean speckles')));

    const sil = U.el('input', { type: 'checkbox' });
    sil.addEventListener('change', () => { st.silhouette = sil.checked; draw(); });
    toolcol.appendChild(U.el('div', { class: 'cf-field cf-field-check' }, U.el('label', { class: 'cf-check-label' }, sil, ' Silhouette (solid black stencil)')));

    addTitle('Refine by hand');
    const row2 = U.el('div', { class: 'cf-btn-row' });
    const erB = U.el('button', { class: 'cf-btn' }, '🩹 Erase');
    const reB = U.el('button', { class: 'cf-btn' }, '↩ Restore');
    erB.addEventListener('click', () => { st.tool = st.tool === 'erase' ? null : 'erase'; syncTools(); });
    reB.addEventListener('click', () => { st.tool = st.tool === 'restore' ? null : 'restore'; syncTools(); });
    row2.appendChild(erB); row2.appendChild(reB);
    toolcol.appendChild(row2);
    function syncTools() {
      erB.classList.toggle('primary', st.tool === 'erase');
      reB.classList.toggle('primary', st.tool === 'restore');
      pickBtn.classList.toggle('primary', st.tool === 'pick');
      view.style.cursor = st.tool ? 'crosshair' : 'default';
    }

    const bsWrap = U.el('div', { class: 'cf-field' });
    bsWrap.appendChild(U.el('label', { class: 'cf-field-label' }, 'Brush size'));
    const bsS = U.el('input', { class: 'cf-slider', type: 'range', min: 6, max: 160, value: st.brush });
    bsS.addEventListener('input', () => { st.brush = parseInt(bsS.value, 10); });
    bsWrap.appendChild(bsS);
    toolcol.appendChild(bsWrap);

    const row3 = U.el('div', { class: 'cf-btn-row' });
    const invB = U.el('button', { class: 'cf-btn' }, 'Invert');
    invB.addEventListener('click', () => { for (let i = 0; i < mask.length; i++) mask[i] = 1 - mask[i]; recomputeView(); });
    const rstB = U.el('button', { class: 'cf-btn' }, 'Reset');
    rstB.addEventListener('click', () => { mask.fill(1); st.lastOp = null; recomputeView(); });
    row3.appendChild(invB); row3.appendChild(rstB);
    toolcol.appendChild(row3);

    const origB = addBtn('👁 Hold to compare original', () => { });
    origB.addEventListener('pointerdown', () => { showOriginal = true; draw(); });
    origB.addEventListener('pointerup', () => { showOriginal = false; draw(); });
    origB.addEventListener('pointerleave', () => { if (showOriginal) { showOriginal = false; draw(); } });

    toolcol.appendChild(status);

    /* ---------- canvas painting / picking ---------- */
    let painting = false;
    function paintAt(ev) {
      const r = view.getBoundingClientRect();
      const x = Math.round((ev.clientX - r.left) / scale);
      const y = Math.round((ev.clientY - r.top) / scale);
      if (st.tool === 'pick') {
        const d = CF.Img.getData(srcCanvas).data;
        const i = (U.clamp(y, 0, H - 1) * W + U.clamp(x, 0, W - 1)) * 4;
        const color = { r: d[i], g: d[i + 1], b: d[i + 2] };
        const km = CF.Img.colorKeyMask(CF.Img.getData(srcCanvas), color, st.tolerance);
        for (let p = 0; p < mask.length; p++) mask[p] = Math.min(mask[p], km[p]);
        st.lastOp = color;
        status.textContent = `Keyed out rgb(${color.r},${color.g},${color.b}).`;
        recomputeView();
        return;
      }
      const rad = st.brush / 2 / scale;
      const v = st.tool === 'erase' ? 0 : 1;
      const r2 = rad * rad;
      for (let yy = Math.max(0, Math.floor(y - rad)); yy <= Math.min(H - 1, Math.ceil(y + rad)); yy++) {
        for (let xx = Math.max(0, Math.floor(x - rad)); xx <= Math.min(W - 1, Math.ceil(x + rad)); xx++) {
          const dx = xx - x, dy = yy - y;
          if (dx * dx + dy * dy <= r2) mask[yy * W + xx] = v;
        }
      }
      recomputeView();
    }
    view.addEventListener('pointerdown', e => {
      if (!st.tool) return;
      painting = true;
      view.setPointerCapture(e.pointerId);
      paintAt(e);
    });
    view.addEventListener('pointermove', e => { if (painting && (st.tool === 'erase' || st.tool === 'restore')) paintAt(e); });
    view.addEventListener('pointerup', () => { painting = false; });

    /* ---------- footer actions ---------- */
    const foot = modal.foot;
    const mkFoot = (label, primary, fn) => {
      const b = U.el('button', { class: 'cf-btn' + (primary ? ' primary' : '') }, label);
      b.addEventListener('click', fn);
      foot.appendChild(b);
      return b;
    };

    if (mode === 'standalone') {
      mkFoot('Copy PNG', false, async () => {
        try {
          const out = CF.Img.crop(resultCanvas(), CF.Img.alphaBounds(resultCanvas()) || { x: 0, y: 0, w: W, h: H });
          const blob = await new Promise(res => out.toBlob(res, 'image/png'));
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          CF.ui.toast('Cutout copied to clipboard');
        } catch (e) { CF.ui.toast('Copy failed: ' + e.message, 3000, 'error'); }
      });
      mkFoot('Save PNG…', true, async () => {
        const res = resultCanvas();
        const box = CF.Img.alphaBounds(res);
        const out = box ? CF.Img.crop(res, box) : res;
        const blob = await new Promise(r => out.toBlob(r, 'image/png'));
        if (window.native && window.native.saveFile) {
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          const p = await window.native.saveFile('cutout.png', btoa(bin));
          if (p) CF.ui.toast('Saved ' + p, 3000);
        } else U.download('cutout.png', blob);
      });
      mkFoot('Send to coin', false, () => { modal.close(); placeResult(); });
    } else {
      if (mode === 'place') mkFoot('Place original (skip cleanup)', false, () => {
        mask.fill(1);
        viewMask = mask;
        modal.close();
        placeResult(true);
      });
      mkFoot(mode === 'element' ? 'Apply to element' : 'Place on coin ▸', true, () => { modal.close(); placeResult(); });
    }
    modal.root.querySelector('.cf-modal').appendChild(foot);

    function placeResult(asIs = false) {
      const res = resultCanvas();
      const box = CF.Img.alphaBounds(res) || { x: 0, y: 0, w: W, h: H };
      const out = asIs ? res : CF.Img.crop(res, box, 0.03);
      const dataURL = out.toDataURL('image/png');
      const D = S().doc.coin.diameterMM;

      if (mode === 'element' && opts.elementId) {
        S().mutate(d => {
          const t = d.elements.find(x => x.id === opts.elementId);
          if (t) {
            t.src = dataURL;
            t.natW = out.width; t.natH = out.height;
            CF.Elements.invalidateImage(t.id);
          }
        });
        CF.ui.toast('Image updated');
        return;
      }

      const aspect = out.height / out.width;
      const target = D * 0.62; /* fit inside a typical inner ring */
      const widthMM = aspect >= 1 ? target / aspect : target;
      const el = CF.Elements.create('image', {
        name: 'Image',
        src: dataURL,
        natW: out.width, natH: out.height,
        widthMM,
        fx: { gray: true, invert: false, bri: 0, con: 12, gamma: 1, levLo: 0, levHi: 255, posterize: 0, sharpen: 15 }
      });
      S().addElement(el);
      CF.ui.toast('Placed at center — drag corners to resize, tweak tone in the right panel');
    }

    /* initial auto pass for the smart-import flow */
    if (opts.autoRun) {
      setTimeout(() => {
        const { mask: m, colors } = CF.Img.autoRemove(srcCanvas, { tolerance: st.tolerance, feather: 0 });
        /* only auto-apply when a dominant border color was found */
        if (colors.length && colors[0].frac > 0.25) {
          mask = m;
          st.lastOp = 'auto';
          status.textContent = 'Auto-removed the background — refine below, or hit AI for tricky photos.';
        }
        recomputeView();
      }, 30);
    } else {
      recomputeView();
    }
  }

  /* ============ import flows ============ */
  async function canvasFromFile(fileOrBlob) {
    const dataURL = await U.readFile(fileOrBlob, 'dataURL');
    const img = await U.loadImage(dataURL);
    return U.canvasFromImage(img, 2400);
  }

  CF.flows = {
    /* Add → Image */
    addImage() {
      const inp = U.el('input', { type: 'file', accept: 'image/*' });
      inp.addEventListener('change', async () => {
        if (!inp.files[0]) return;
        try {
          const cnv = await canvasFromFile(inp.files[0]);
          openStudio(cnv, 'place', { autoRun: true });
        } catch (e) { CF.ui.toast('Could not load image: ' + e.message, 3000, 'error'); }
      });
      inp.click();
    },

    async importImageBlob(blob) {
      try {
        const cnv = await canvasFromFile(blob);
        openStudio(cnv, 'place', { autoRun: true });
      } catch (e) { CF.ui.toast('Could not load image: ' + e.message, 3000, 'error'); }
    },

    replaceImage(elementId) {
      const inp = U.el('input', { type: 'file', accept: 'image/*' });
      inp.addEventListener('change', async () => {
        if (!inp.files[0]) return;
        const cnv = await canvasFromFile(inp.files[0]);
        openStudio(cnv, 'element', { elementId, autoRun: true });
      });
      inp.click();
    },

    /* standalone utility (Tools menu) */
    openBgTool() {
      const inp = U.el('input', { type: 'file', accept: 'image/*' });
      inp.addEventListener('change', async () => {
        if (!inp.files[0]) return;
        const cnv = await canvasFromFile(inp.files[0]);
        openStudio(cnv, 'standalone', { autoRun: true });
      });
      inp.click();
    },
  };

  CF.bgstudio = {
    open: openStudio,
    openForElement(id) {
      const el = S().byId(id);
      if (!el || !el.src) { CF.ui.toast('No image on this element yet'); return; }
      U.loadImage(el.src).then(img => {
        openStudio(U.canvasFromImage(img), 'element', { elementId: id });
      });
    }
  };
})();