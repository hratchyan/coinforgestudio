/* ============================================================
   CoinForge Studio — make-feature-clips.js
   Six short looping clips of real tools in action, one per
   feature card on the landing page. Same machinery as the main
   demo video: headless Edge + deterministic per-frame directors,
   encoded as tiny muted MP4s that behave like GIFs.

   Usage:  node tools/make-feature-clips.js
   Output: site/assets/feat/*.mp4
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site', 'assets', 'feat');
const FRAMES = path.join(__dirname, '.clipframes');
const PORT = 8127;
const FPS = 30;
const W = 1560, H = 950;

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

/* shared in-page helpers */
const SETUP = `
(function () {
  const E = CF.Elements, S = CF.store;
  window.__R = 22.25;
  window.__clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
  window.__ease = t=>1-Math.pow(1-__clamp(t,0,1),3);
  window.__seg = (t,a,b)=>__clamp((t-a)/(b-a),0,1);
  window.__set = (els, sel) => {
    S.doc.elements = els;
    S.sel.clear();
    (sel||[]).forEach(id => S.sel.add(id));
    CF.bus.emit('sel');
    CF.renderer.render();
  };
  window.__baseCoin = (txt=true) => {
    const R = __R, els = [
      E.create('ringband', { id:'b1', style:'double', radiusMM: R-1.7, thicknessMM: 1.35 }),
      E.create('symbolring', { id:'b2', symbolId:'star5', count: 30, radiusMM: R-4.4, itemSizeMM: 2.3, rotateItems: true }),
      E.create('ringband', { id:'b3', style:'solid', radiusMM: R-7.2, thicknessMM: 0.5 }),
    ];
    if (txt) els.push(E.create('text', { id:'b4', text: 'YOUR\\nCOIN', font:'Cinzel', weight:900, sizeMM: 7.4, lineHeight: 1.05, letterSpacing: 0.5 }));
    return els;
  };
  window.__clickByText = (root, text) => {
    for (const b of document.querySelectorAll(root + ' button')) {
      if (b.textContent.trim().toLowerCase().includes(text.toLowerCase())) { b.click(); return true; }
    }
    return false;
  };
  window.__slider = (label, value) => {
    for (const f of document.querySelectorAll('.cf-overlay .cf-field')) {
      const l = f.querySelector('.cf-field-label');
      if (l && l.textContent.toLowerCase().includes(label.toLowerCase())) {
        const inp = f.querySelector('input');
        if (inp) {
          inp.value = String(value);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    }
    return false;
  };
  return true;
})()
`;

/* clip definitions: { name, dur, region(page)->clip, setup, step(t) } — setup/step are
   JS source strings evaluated in the page. Region computed after setup. */
const CLIPS = [
  {
    name: 'rings', dur: 4.8,
    setup: `__set(__baseCoin(true)); CF.store.ui.tab='rings'; CF.panels.refreshTab(); true`,
    region: 'canvas',
    step: `(function(t){
      const E = CF.Elements, R = __R;
      const presets = ['stars-border','rope-frame','beaded','military-stars'];
      const i = Math.min(presets.length-1, Math.floor(t / 1.2));
      const p = __seg(t - i*1.2, 0, 0.3);
      const ring = CF.RingPresets.get(presets[i]).build(R).map((e,j)=>{ e.id='r'+i+'_'+j; e.opacity = __ease(p); return e; });
      const txt = E.create('text', { id:'b4', text: 'YOUR\\nCOIN', font:'Cinzel', weight:900, sizeMM: 6.6, lineHeight: 1.05, letterSpacing: 0.5 });
      if (presets[i]==='military-stars') txt.shade = 0;
      __set([...ring, txt]);
    })`
  },
  {
    name: 'arctext', dur: 4.6,
    setup: `__set(__baseCoin(false)); true`,
    region: 'canvas',
    step: `(function(t){
      const E = CF.Elements, R = __R;
      const TOP='FORTUNE FAVORS THE BOLD', BOT='EST. MMXXVI';
      const p1=__seg(t,0.2,2.2), p2=__seg(t,2.4,3.4);
      const slide = 10*Math.sin(Math.max(0,(t-3.6))*2.4)*__seg(t,3.6,4.0)*(1-__seg(t,4.3,4.6));
      const els = __baseCoin(false);
      els.find(e=>e.id==='b2').count = 0;
      if (p1>0) els.push(E.create('arctext',{id:'a1',text:TOP.slice(0,Math.round(TOP.length*p1)),radiusMM:R-3.6,sizeMM:2.5,side:'top',letterSpacing:0.3,weight:700,centerDeg:slide}));
      if (p2>0) els.push(E.create('arctext',{id:'a2',text:BOT.slice(0,Math.round(BOT.length*p2)),radiusMM:R-3.6,sizeMM:2.5,side:'bottom',centerDeg:180,letterSpacing:0.55,weight:700}));
      __set(els, t>0.4&&t<2.4?['a1']:[]);
    })`
  },
  {
    name: 'photo', dur: 5.2,
    setup: `
      (function(){
        const c = document.createElement('canvas'); c.width=560; c.height=560;
        const x = c.getContext('2d');
        x.fillStyle='#f4f1ea'; x.fillRect(0,0,560,560);
        x.fillStyle='#2c2c34';
        x.translate(280,280); x.scale(4.4,4.4);
        x.fill(new Path2D(CF.geo.starPath(5,44,18)),'evenodd');
        x.fillStyle='#c33'; x.beginPath(); x.arc(0,0,12,0,7); x.fill();
        x.setTransform(1,0,0,1,0,0);
        window.__photo = c;
        CF.bgstudio.open(c, 'standalone', {});
        return true;
      })()
    `,
    region: 'modal',
    step: `(function(t){
      if (t>0.9 && t<1.0 && !window.__didAuto) { window.__didAuto=true; __clickByText('.cf-bg-tools', 'Auto'); }
      if (t>2.6 && t<2.7 && !window.__didFe) { window.__didFe=true; __slider('feather', 4); }
      if (t>3.6 && t<3.7 && !window.__didSil) { window.__didSil=true;
        for (const l of document.querySelectorAll('.cf-overlay .cf-check-label')) if (l.textContent.includes('Silhouette')) l.querySelector('input').click();
      }
    })`
  },
  {
    name: 'symbols', dur: 4.4,
    setup: `CF.pickers.symbol(()=>{}); true`,
    region: 'modal',
    step: `(function(t){
      const gs = document.querySelectorAll('.cf-symgrid');
      const g = gs[gs.length-1];
      if (g) g.scrollTop = 900 * __ease(__seg(t, 0.4, 4.0));
    })`
  },
  {
    name: 'export', dur: 5.0,
    setup: `
      (function(){
        __set(__baseCoin(true));
        const S = CF.store;
        const g1 = { id:'g1', name:'Deep engrave', color:'#0000FF' };
        const g2 = { id:'g2', name:'Anneal lines', color:'#00E000' };
        S.doc.groups = [g1, g2];
        S.doc.elements.forEach((e,i)=>{ e.groupId = i<2 ? 'g1' : 'g2'; });
        CF.exporter.open();
        return true;
      })()
    `,
    region: 'modal',
    step: `(function(t){
      const sels = document.querySelectorAll('.cf-overlay select.cf-input');
      const setSel = (i, v) => { if (sels[i] && sels[i].value !== v) { sels[i].value = v; sels[i].dispatchEvent(new Event('change', {bubbles:true})); } };
      if (t>1.1 && t<3.0) setSel(1, 'pergroup');
      if (t>3.0) { const d = document.querySelectorAll('.cf-overlay select.cf-input'); for (const s of d) { if ([...s.options].some(o=>o.value==='fs')) { if (s.value!=='fs'){ s.value='fs'; s.dispatchEvent(new Event('change',{bubbles:true})); } } } }
    })`
  },
  {
    name: 'outline', dur: 5.0,
    setup: `__set(__baseCoin(true)); CF.outline.openModal(); true`,
    region: 'modal',
    step: `(function(t){
      const steps = [[0.8,0.5],[1.5,1.5],[2.2,2.5],[2.9,3.5],[3.6,5],[4.3,6.5]];
      for (const [tt, v] of steps) {
        if (t > tt && t < tt + 0.12 && window.__lastOff !== v) { window.__lastOff = v; __slider('offset', v); }
      }
    })`
  },
];

const pad = n => String(n).padStart(4, '0');

async function main() {
  if (!EDGE) throw new Error('Edge not found');
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), String(PORT)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--mute-audio'],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  });

  try {
    for (const clip of CLIPS) {
      console.log(`clip: ${clip.name}`);
      const dir = path.join(FRAMES, clip.name);
      fs.mkdirSync(dir, { recursive: true });

      const page = await browser.newPage();
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction('window.CF && CF.store && CF.store.doc && CF.renderer', { timeout: 30000 });
      await new Promise(r => setTimeout(r, 1200));
      await page.evaluate(SETUP);
      await page.evaluate(clip.setup);
      await new Promise(r => setTimeout(r, 700)); /* modals/panels settle */

      /* capture region */
      let region;
      if (clip.region === 'canvas') {
        region = await page.evaluate(`(function(){ const r = document.getElementById('cv').getBoundingClientRect();
          const s = Math.min(r.width, r.height); return { x: r.left + (r.width-s)/2, y: r.top + (r.height-s)/2, width: s, height: s }; })()`);
        /* 16:10 crop centered on the coin */
        const cw = Math.min(region.width * 1.0, 940), ch = cw * 0.625;
        region = { x: Math.round(region.x + region.width / 2 - cw / 2), y: Math.round(region.y + region.height / 2 - ch / 2), width: Math.round(cw), height: Math.round(ch) };
      } else {
        region = await page.evaluate(`(function(){ const m = document.querySelector('.cf-overlay .cf-modal');
          const r = m.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; })()`);
        /* pad to even 16:10-ish */
        region.height = Math.min(region.height, Math.round(region.width * 0.72));
      }
      region.width -= region.width % 2; region.height -= region.height % 2;

      const total = Math.round(clip.dur * FPS);
      for (let i = 0; i < total; i++) {
        await page.evaluate(`(${clip.step})(${i / FPS})`);
        await new Promise(r => setTimeout(r, 45));
        await page.screenshot({ path: path.join(dir, `f${pad(i)}.png`), clip: region });
      }
      await page.close();

      execFileSync(ffmpeg, [
        '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'),
        '-vf', 'scale=640:-2',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow',
        '-movflags', '+faststart', '-an',
        path.join(OUT, `${clip.name}.mp4`),
      ], { stdio: 'pipe' });
      const kb = Math.round(fs.statSync(path.join(OUT, `${clip.name}.mp4`)).size / 1024);
      console.log(`  → ${clip.name}.mp4 (${kb} KB)`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('DONE — site/assets/feat/*.mp4');
}

main().catch(e => { console.error(e); process.exit(1); });