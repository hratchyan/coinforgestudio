/* ============================================================
   CoinForge Studio — exporter.js
   DPI-accurate PNG export (whole design or one file per layer
   group, with optional dithering), SVG export (tonal art or
   color-per-group "laser layers" mode), clipboard copy.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;

  const DPI_PRESETS = [254, 318, 508, 635, 1016, 1270, 2540];

  function blobToB64(blob) {
    return blob.arrayBuffer().then(buf => {
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    });
  }

  async function saveBlob(name, blob) {
    if (window.native && window.native.saveFile) {
      const ok = await window.native.saveFile(name, await blobToB64(blob));
      if (ok) CF.ui.toast('Exported: ' + ok, 3200);
      return;
    }
    U.download(name, blob);
    CF.ui.toast('Exported ' + name, 2600);
  }

  /* save several files: one folder-pick in the desktop app, sequential downloads in browser */
  async function saveMany(files /* [{name, blob}] */) {
    if (window.native && window.native.chooseDir) {
      const dir = await window.native.chooseDir();
      if (!dir) return;
      for (const f of files) {
        await window.native.writeFileInDir(dir, f.name, await blobToB64(f.blob));
      }
      CF.ui.toast(`Exported ${files.length} files to ${dir}`, 3600);
      return;
    }
    for (const f of files) {
      U.download(f.name, f.blob);
      await new Promise(r => setTimeout(r, 350));
    }
    CF.ui.toast(`Exported ${files.length} files`, 3000);
  }

  const sanitize = s => String(s || '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'coin';
  const fileBase = () => sanitize(S().doc.name);

  /* group buckets that actually contain artwork */
  function groupBuckets(doc) {
    const out = [];
    const has = gid => doc.elements.some(e => e.visible && e.type !== 'outline' && (e.groupId || null) === gid);
    for (const g of (doc.groups || [])) if (has(g.id)) out.push({ id: g.id, name: g.name, color: g.color });
    if (has(null)) out.push({ id: null, name: doc.groups && doc.groups.length ? 'ungrouped' : 'all', color: '#000000' });
    return out;
  }

  function buildSVG(doc, { includeOutline = true, background = 'none', colorMap = false } = {}) {
    const sub = CF.substrate.get(doc);
    const { w: W, h: H } = CF.substrate.sizeMM(doc);
    const hw = W / 2, hh = H / 2;
    const rx = sub.kind === 'rounded' ? (sub.cornerRMM || 0) : 0;
    const colorOf = (el) => {
      if (!colorMap || el.type === 'outline') return null;
      const g = (doc.groups || []).find(x => x.id === el.groupId);
      return g ? g.color : '#000000';
    };
    let s = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    s += `<!-- Made with ${CF.APP_NAME} v${CF.VERSION} by ${CF.AUTHOR}${colorMap ? ' — laser-layers mode: one color per group' : ''} -->\n`;
    s += `<svg xmlns="http://www.w3.org/2000/svg" width="${U.num(W)}mm" height="${U.num(H)}mm" viewBox="${U.num(-hw)} ${U.num(-hh)} ${U.num(W)} ${U.num(H)}">\n`;
    if (background === 'white') s += `<rect x="${U.num(-hw)}" y="${U.num(-hh)}" width="${U.num(W)}" height="${U.num(H)}" fill="#ffffff"/>\n`;
    const clipShape = sub.kind === 'circle'
      ? `<circle cx="0" cy="0" r="${U.num(hw)}"/>`
      : sub.kind === 'shape'
        ? `<path d="${CF.substrate.svgPath(doc)}"/>`
        : `<rect x="${U.num(-hw)}" y="${U.num(-hh)}" width="${U.num(W)}" height="${U.num(H)}"${rx ? ` rx="${U.num(rx)}"` : ''}/>`;
    s += `<clipPath id="coin">${clipShape}</clipPath>\n<g clip-path="url(#coin)">\n`;
    for (const el of doc.elements) s += CF.Elements.toSVG(el, colorOf(el)) + '\n';
    s += `</g>\n`;
    if (includeOutline) {
      const stroke = `fill="none" stroke="${colorMap ? '#00A0A0' : '#000'}" stroke-width="0.1"`;
      s += sub.kind === 'circle'
        ? `<circle cx="0" cy="0" r="${U.num(hw - 0.05)}" ${stroke}/>\n`
        : sub.kind === 'shape'
          ? `<path d="${CF.substrate.svgPath(doc, 0.05)}" ${stroke}/>\n`
          : `<rect x="${U.num(-(hw - 0.05))}" y="${U.num(-(hh - 0.05))}" width="${U.num(W - 0.1)}" height="${U.num(H - 0.1)}"${rx ? ` rx="${U.num(Math.max(0, rx - 0.05))}"` : ''} ${stroke}/>\n`;
    }
    s += `</svg>`;
    return s;
  }

  function ditherCanvas(cnv, method, threshold) {
    const ctx = cnv.getContext('2d');
    const img = ctx.getImageData(0, 0, cnv.width, cnv.height);
    CF.Img.dither(img, method === 'fs' ? 'fs' : method, threshold);
    ctx.putImageData(img, 0, 0);
  }

  CF.exporter = {
    buildSVG,

    open() {
      const doc = S().doc;
      const st = {
        format: 'png', dpi: doc.dpi || 1016, bg: 'white', invert: false,
        mirror: false, outline: false, dither: 'none', threshold: 128,
        content: 'all', svgMode: 'art'
      };
      const buckets = groupBuckets(doc);

      const modal = CF.ui.modal({ title: 'Export for engraving', width: '840px', modal: true });
      const left = U.el('div', { class: 'cf-export-left' });
      const right = U.el('div', { class: 'cf-export-right' });
      modal.body.appendChild(U.el('div', { class: 'cf-export-grid' }, left, right));

      const preview = U.el('canvas', { class: 'cf-export-preview' });
      const pxInfo = U.el('div', { class: 'cf-hint' });
      right.appendChild(preview);
      right.appendChild(pxInfo);

      const field = (label, control) => {
        const f = U.el('div', { class: 'cf-field' }, U.el('label', { class: 'cf-field-label' }, label), control);
        left.appendChild(f);
        return f;
      };

      const fmtSel = U.el('select', { class: 'cf-input' },
        U.el('option', { value: 'png' }, 'PNG — raster (recommended for photo/fill engraving)'),
        U.el('option', { value: 'svg' }, 'SVG — vector (paths + text; images embedded)'));
      fmtSel.addEventListener('change', () => { st.format = fmtSel.value; syncVisibility(); refresh(); });
      field('Format', fmtSel);

      /* PNG: whole vs per-group */
      const contentSel = U.el('select', { class: 'cf-input' },
        U.el('option', { value: 'all' }, 'Whole design — one file'),
        U.el('option', { value: 'pergroup' }, `One file per layer group (${buckets.length}) — for multi-pass jobs`));
      contentSel.addEventListener('change', () => { st.content = contentSel.value; refresh(); });
      const contentField = field('Content (PNG)', contentSel);

      /* SVG: tonal vs laser layers */
      const svgModeSel = U.el('select', { class: 'cf-input' },
        U.el('option', { value: 'art' }, 'Tonal art — grayscale fills as designed'),
        U.el('option', { value: 'layers' }, 'Laser layers — one color per group (LightBurn auto-splits)'));
      svgModeSel.addEventListener('change', () => { st.svgMode = svgModeSel.value; refresh(); });
      const svgModeField = field('SVG mode', svgModeSel);

      const dpiSel = U.el('select', { class: 'cf-input' });
      for (const d of DPI_PRESETS) dpiSel.appendChild(U.el('option', { value: d, selected: d === st.dpi ? '' : null }, `${d} DPI (${U.round(25.4 / d, 3)} mm/px)`));
      dpiSel.appendChild(U.el('option', { value: 'custom' }, 'Custom…'));
      const dpiCustom = U.el('input', { class: 'cf-input', type: 'number', min: 72, max: 5080, value: st.dpi, style: { display: 'none' } });
      dpiSel.addEventListener('change', () => {
        if (dpiSel.value === 'custom') { dpiCustom.style.display = ''; }
        else { dpiCustom.style.display = 'none'; st.dpi = parseInt(dpiSel.value, 10); refresh(); }
      });
      dpiCustom.addEventListener('change', () => { st.dpi = U.clamp(parseInt(dpiCustom.value, 10) || 1016, 72, 5080); refresh(); });
      const dpiField = field('Resolution (PNG)', dpiSel);
      left.appendChild(dpiCustom);

      const bgSel = U.el('select', { class: 'cf-input' },
        U.el('option', { value: 'white' }, 'White background'),
        U.el('option', { value: 'transparent' }, 'Transparent background'));
      bgSel.addEventListener('change', () => { st.bg = bgSel.value; refresh(); });
      const bgField = field('Background (PNG)', bgSel);

      const ditherSel = U.el('select', { class: 'cf-input' },
        U.el('option', { value: 'none' }, 'None — keep grayscale (laser software dithers)'),
        U.el('option', { value: 'fs' }, 'Floyd–Steinberg (photo-style dots)'),
        U.el('option', { value: 'atkinson' }, 'Atkinson (lighter, crisp)'),
        U.el('option', { value: 'ordered' }, 'Ordered 8×8 (regular pattern)'),
        U.el('option', { value: 'threshold' }, 'Threshold (pure black & white)'));
      ditherSel.addEventListener('change', () => { st.dither = ditherSel.value; thWrap.style.display = st.dither === 'threshold' ? '' : 'none'; refresh(); });
      const ditherField = field('Dithering (PNG)', ditherSel);

      const thSlider = U.el('input', { class: 'cf-slider', type: 'range', min: 1, max: 254, value: st.threshold });
      const thVal = U.el('span', { class: 'cf-slider-val' }, String(st.threshold));
      thSlider.addEventListener('input', () => { st.threshold = parseInt(thSlider.value, 10); thVal.textContent = thSlider.value; refresh(); });
      const thWrap = U.el('div', { class: 'cf-field', style: { display: 'none' } },
        U.el('label', { class: 'cf-field-label' }, 'Threshold level'),
        U.el('div', { class: 'cf-slider-wrap' }, thSlider, thVal));
      left.appendChild(thWrap);

      const mkCheck = (label, key) => {
        const c = U.el('input', { type: 'checkbox' });
        c.checked = st[key];
        c.addEventListener('change', () => { st[key] = c.checked; refresh(); });
        left.appendChild(U.el('div', { class: 'cf-field cf-field-check' }, U.el('label', { class: 'cf-check-label' }, c, ' ' + label)));
      };
      mkCheck('Invert (light marks on dark coating — negative art)', 'invert');
      mkCheck('Mirror horizontally', 'mirror');
      mkCheck('Include coin outline circle (alignment/cut reference)', 'outline');

      left.appendChild(U.el('p', { class: 'cf-hint' },
        'Per-group PNGs share identical canvas size and center, so they align 1:1 in your laser software — set different power/speed per file. The red cut outline never rasterizes; it exports in SVG (red) or via Tools → Generate Cut Outline.'));

      function syncVisibility() {
        const png = st.format === 'png';
        contentField.style.display = png ? '' : 'none';
        dpiField.style.display = png ? '' : 'none';
        dpiCustom.style.display = png && dpiSel.value === 'custom' ? '' : 'none';
        ditherField.style.display = png ? '' : 'none';
        thWrap.style.display = png && st.dither === 'threshold' ? '' : 'none';
        svgModeField.style.display = png ? 'none' : '';
      }

      const bucketFilter = (b) => (el) => (el.groupId || null) === b.id;

      const refresh = U.debounce(() => {
        const previewDpi = Math.min(st.dpi, 220);
        const cnv = CF.renderer.exportArt(doc, previewDpi, {
          bg: st.bg === 'transparent' && st.format === 'png' ? 'transparent' : 'white',
          invert: st.invert, includeOutline: st.outline, mirror: st.mirror
        });
        if (st.format === 'png' && st.dither !== 'none') ditherCanvas(cnv, st.dither, st.threshold);
        const side = 340;
        preview.width = side; preview.height = side;
        const pctx = preview.getContext('2d');
        for (let y = 0; y < side; y += 12) for (let x = 0; x < side; x += 12) {
          pctx.fillStyle = ((x + y) / 12) % 2 ? '#3a3f47' : '#2e333a';
          pctx.fillRect(x, y, 12, 12);
        }
        pctx.imageSmoothingEnabled = true;
        pctx.drawImage(cnv, 0, 0, side, side);
        const { w: wMM, h: hMM } = CF.substrate.sizeMM(doc);
        const isRound = CF.substrate.kind(doc) === 'circle';
        const px = Math.round(wMM * st.dpi / 25.4);
        const pxH = Math.round(hMM * st.dpi / 25.4);
        const mmLabel = isRound
          ? `${U.round(wMM, 2)} mm (${U.round(U.mm2in(wMM), 3)}")`
          : `${U.round(wMM, 2)} × ${U.round(hMM, 2)} mm`;
        if (st.format === 'png') {
          pxInfo.textContent = st.content === 'pergroup'
            ? `${buckets.length} file(s), each ${px} × ${pxH} px at ${st.dpi} DPI — identical framing for perfect alignment`
            : `Output: ${px} × ${pxH} px · ${mmLabel} at ${st.dpi} DPI`;
        } else {
          pxInfo.textContent = st.svgMode === 'layers'
            ? `SVG in mm — ${buckets.length} group color(s)${doc.elements.some(e => e.type === 'outline') ? ' + red cut layer' : ''}`
            : `SVG in millimetres, ${isRound ? `${U.round(wMM, 2)} mm circle` : `${U.round(wMM, 2)} × ${U.round(hMM, 2)} mm`}`;
        }
      }, 60);

      const doExport = async () => {
        if (st.format === 'svg') {
          const svg = buildSVG(doc, {
            includeOutline: st.outline,
            background: st.bg === 'white' ? 'white' : 'none',
            colorMap: st.svgMode === 'layers'
          });
          await saveBlob(fileBase() + (st.svgMode === 'layers' ? '-layers.svg' : '.svg'), new Blob([svg], { type: 'image/svg+xml' }));
          return;
        }
        const mk = async (filter) => {
          const cnv = CF.renderer.exportArt(doc, st.dpi, { bg: st.bg, invert: st.invert, includeOutline: st.outline, mirror: st.mirror, filter });
          if (st.dither !== 'none') ditherCanvas(cnv, st.dither, st.threshold);
          return new Promise(res => cnv.toBlob(res, 'image/png'));
        };
        if (st.content === 'pergroup' && buckets.length > 1) {
          const files = [];
          for (const b of buckets) {
            files.push({ name: `${fileBase()}-${sanitize(b.name)}-${st.dpi}dpi.png`, blob: await mk(bucketFilter(b)) });
          }
          await saveMany(files);
        } else {
          await saveBlob(`${fileBase()}-${st.dpi}dpi.png`, await mk(undefined));
        }
      };

      const copyPng = async () => {
        try {
          const cnv = CF.renderer.exportArt(doc, Math.min(st.dpi, 508), { bg: st.bg, invert: st.invert, includeOutline: st.outline, mirror: st.mirror });
          const blob = await new Promise(res => cnv.toBlob(res, 'image/png'));
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          CF.ui.toast('PNG copied to clipboard');
        } catch (e) { CF.ui.toast('Clipboard copy failed: ' + e.message, 3000, 'error'); }
      };

      modal.foot.appendChild(U.el('div', { class: 'cf-foot-spread' },
        (() => { const b = U.el('button', { class: 'cf-btn' }, 'Copy PNG'); b.addEventListener('click', copyPng); return b; })(),
        (() => { const b = U.el('button', { class: 'cf-btn' }, 'Close'); b.addEventListener('click', () => modal.close()); return b; })(),
        (() => { const b = U.el('button', { class: 'cf-btn primary' }, 'Export file…'); b.addEventListener('click', doExport); return b; })()
      ));
      modal.root.querySelector('.cf-modal').appendChild(modal.foot);

      syncVisibility();
      refresh();
    }
  };
})();