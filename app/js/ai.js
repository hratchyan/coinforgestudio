/* ============================================================
   CoinForge Studio — ai.js
   Optional AI background removal: U²-Net (u2netp) running
   locally via onnxruntime-web (WASM). No internet needed.
   Falls back gracefully when the runtime/model is missing.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const A = { available: false, ready: false, error: null };
  let session = null;
  let initPromise = null;

  async function getBytes(relPath) {
    if (window.native && window.native.readAsset) {
      const b64 = await window.native.readAsset(relPath);
      if (!b64) throw new Error('asset missing: ' + relPath);
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }
    const res = await fetch(relPath);
    if (!res.ok) throw new Error('fetch failed: ' + relPath);
    return new Uint8Array(await res.arrayBuffer());
  }

  A.init = function () {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (typeof ort === 'undefined') throw new Error('onnxruntime not loaded');
      ort.env.wasm.numThreads = 1;
      if (window.native && window.native.readAsset) {
        /* file:// can't fetch() — hand the runtime blob URLs instead */
        const wasmBytes = await getBytes('vendor/ort-wasm-simd-threaded.wasm');
        const mjsBytes = await getBytes('vendor/ort-wasm-simd-threaded.mjs');
        ort.env.wasm.wasmPaths = {
          wasm: URL.createObjectURL(new Blob([wasmBytes], { type: 'application/wasm' })),
          mjs: URL.createObjectURL(new Blob([mjsBytes], { type: 'text/javascript' }))
        };
      } else {
        ort.env.wasm.wasmPaths = 'vendor/';
      }
      const model = await getBytes('assets/models/u2netp.onnx');
      session = await ort.InferenceSession.create(model.buffer, { executionProviders: ['wasm'] });
      A.ready = true;
      return true;
    })();
    initPromise.catch(e => { A.error = e; console.warn('AI unavailable:', e.message); });
    return initPromise;
  };

  /* quick availability probe (files present + runtime script loaded) */
  A.probe = function () {
    A.available = typeof ort !== 'undefined';
    return A.available;
  };

  const SIZE = 320;
  const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];

  /* returns Float32Array mask (w*h, 1=keep) for the given canvas */
  A.removeBackground = async function (srcCanvas) {
    await A.init();
    const w = srcCanvas.width, h = srcCanvas.height;
    const { canvas: small, ctx: sctx } = CF.util.makeCanvas(SIZE, SIZE);
    sctx.drawImage(srcCanvas, 0, 0, SIZE, SIZE);
    const img = sctx.getImageData(0, 0, SIZE, SIZE).data;

    const data = new Float32Array(3 * SIZE * SIZE);
    const plane = SIZE * SIZE;
    for (let p = 0; p < plane; p++) {
      data[p] = (img[p * 4] / 255 - MEAN[0]) / STD[0];
      data[plane + p] = (img[p * 4 + 1] / 255 - MEAN[1]) / STD[1];
      data[2 * plane + p] = (img[p * 4 + 2] / 255 - MEAN[2]) / STD[2];
    }

    const input = new ort.Tensor('float32', data, [1, 3, SIZE, SIZE]);
    const feeds = {};
    feeds[session.inputNames[0]] = input;
    const results = await session.run(feeds);
    const out = results[session.outputNames[0]].data;

    /* min-max normalize */
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < plane; i++) { if (out[i] < mn) mn = out[i]; if (out[i] > mx) mx = out[i]; }
    const range = Math.max(1e-6, mx - mn);

    /* upscale mask to source size via canvas interpolation */
    const { canvas: mc, ctx: mctx } = CF.util.makeCanvas(SIZE, SIZE);
    const mimg = mctx.createImageData(SIZE, SIZE);
    for (let i = 0; i < plane; i++) {
      const v = Math.round(((out[i] - mn) / range) * 255);
      mimg.data[i * 4] = mimg.data[i * 4 + 1] = mimg.data[i * 4 + 2] = v;
      mimg.data[i * 4 + 3] = 255;
    }
    mctx.putImageData(mimg, 0, 0);
    const { canvas: big, ctx: bctx } = CF.util.makeCanvas(w, h);
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = 'high';
    bctx.drawImage(mc, 0, 0, w, h);
    const bd = bctx.getImageData(0, 0, w, h).data;
    const mask = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) mask[p] = bd[p * 4] / 255;
    return mask;
  };

  CF.AI = A;
})();