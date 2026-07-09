/* ============================================================
   CoinForge Studio — make-demo-video.js
   Produces the landing-page hero video: a scripted "ghost user"
   designs a compass coin in the REAL app UI while frames are
   captured headlessly and encoded to MP4.

   Also exports: demo-poster.jpg, og-image.jpg, and static
   template-belt thumbnails.

   Usage:  node tools/make-demo-video.js
   Needs:  devDeps puppeteer-core + ffmpeg-static, Microsoft Edge.
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site', 'assets');
const FRAMES = path.join(__dirname, '.frames');
const PORT = 8126;
const FPS = 30;
const DUR = 21.0;               /* seconds */
const W = 1560, H = 950;

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

/* ---------- the in-page director (runs inside the app) ---------- */
/* Pure function of time t (seconds): rebuilds doc + UI state.
   Injected as a string so it survives serialization. */
const DIRECTOR = `
(function () {
  const E = CF.Elements, S = CF.store, R = 22.25;
  const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
  const ease = t=>1-Math.pow(1-clamp(t,0,1),3);
  const back = t=>{t=clamp(t,0,1);const s=1.7;return 1+(s+1)*Math.pow(t-1,3)+s*Math.pow(t-1,2);};
  const seg  = (t,a,b)=>clamp((t-a)/(b-a),0,1);

  /* fake cursor */
  let cur = document.getElementById('ghost-cursor');
  if (!cur) {
    cur = document.createElement('div');
    cur.id = 'ghost-cursor';
    cur.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2 L20 12 L12.5 13.5 L9 21 Z" fill="#fff" stroke="#1c1c1c" stroke-width="1.4"/></svg>';
    cur.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;filter:drop-shadow(0 2px 5px rgba(0,0,0,.6));transition:none;';
    document.body.appendChild(cur);
    const rip = document.createElement('div');
    rip.id = 'ghost-ripple';
    rip.style.cssText = 'position:fixed;z-index:9998;width:34px;height:34px;border-radius:50%;border:2.5px solid #d9b544;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.4);';
    document.body.appendChild(rip);
  }
  const rip = document.getElementById('ghost-ripple');

  const center = () => {
    const r = document.getElementById('cv').getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  };
  const rectOf = (sel, frac=[0.5,0.5]) => {
    const el = document.querySelector(sel);
    if (!el) return center();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width*frac[0], y: r.top + r.height*frac[1] };
  };
  const tabPos = label => {
    for (const b of document.querySelectorAll('.cf-tab')) if (b.textContent.trim() === label) {
      const r = b.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 };
    }
    return center();
  };
  const cardPos = i => {
    const cards = document.querySelectorAll('.cf-cardlist .cf-card');
    if (!cards[i]) return center();
    const r = cards[i].getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 };
  };
  const symPos = title => {
    for (const c of document.querySelectorAll('.cf-symcell')) if (c.title === title) {
      const r = c.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 };
    }
    return center();
  };

  let lastTab = null;
  function setTab(name){ if (lastTab !== name) { lastTab = name;
    for (const b of document.querySelectorAll('.cf-tab')) if (b.textContent.trim().toLowerCase() === name) b.click();
  } }

  /* cursor keyframe helper: returns pos lerped through waypoints */
  function cursorPath(t, points){ /* points: [t, fnPos, click?] sorted */
    let a = points[0], b = points[points.length-1];
    for (let i=0;i<points.length-1;i++) if (t>=points[i][0] && t<=points[i+1][0]) { a=points[i]; b=points[i+1]; break; }
    if (t>=b[0]) a=b;
    const pa=a[1](), pb=b[1]();
    const p = a===b ? 1 : ease(seg(t,a[0],b[0]));
    cur.style.left = (pa.x + (pb.x-pa.x)*p - 3) + 'px';
    cur.style.top  = (pa.y + (pb.y-pa.y)*p - 2) + 'px';
    /* ripple on click markers */
    for (const pt of points) if (pt[2]) {
      const dt = t - pt[0];
      if (dt >= 0 && dt < 0.45) {
        const q = pt[1]();
        rip.style.left = q.x+'px'; rip.style.top = q.y+'px';
        rip.style.opacity = String(0.9*(1-dt/0.45));
        rip.style.transform = 'translate(-50%,-50%) scale(' + (0.4+dt*2.6) + ')';
      }
    }
  }

  const FULLMAIN = 'YOUR\\nCOIN';
  const FULLBOT = 'EST. MMXXVI';

  window.__director = function (t) {
    const els = [];
    /* --- timeline ---
       0-1.6 blank · 1.6 Rings tab · 2.1 preset click · 2.1-4.3 rings build
       4.6 Add tab · 5.2 Text click · 5.4-7.2 "YOUR COIN" types (selected)
       7.8-8.9 size tweak in inspector · 9.5-10.8 bottom arc types
       11.2-12.9 Templates tab showcase · 13.1 Layers tab
       13.6-15.4 metal cycle · 15.8-17.8 zoom in · hold */
    if (t < 1.6) setTab('add');
    else if (t < 4.6) setTab('rings');
    else if (t < 11.2) setTab('add');
    else if (t < 12.9) setTab('templates');
    else setTab('layers');

    const p_band  = seg(t, 2.1, 2.5);
    const p_stars = seg(t, 2.4, 3.9);
    const p_inner = seg(t, 3.9, 4.3);
    const p_main  = seg(t, 5.4, 7.2);
    const p_size  = seg(t, 7.8, 8.9);
    const p_bot   = seg(t, 9.5, 10.8);

    if (p_band > 0) els.push(E.create('ringband', { id:'d1', style:'double', radiusMM: R-1.7, thicknessMM: 1.35, opacity: ease(p_band) }));
    if (p_stars > 0) els.push(E.create('symbolring', { id:'d2', symbolId:'star5', count: Math.max(1, Math.round(30*ease(p_stars))), radiusMM: R-4.4, itemSizeMM: 2.3, rotateItems: true }));
    if (p_inner > 0) els.push(E.create('ringband', { id:'d3', style:'solid', radiusMM: R-7.2, thicknessMM: 0.5, opacity: ease(p_inner) }));
    if (p_main > 0) {
      const size = 6.1 + 0.8 * ease(p_size); /* inspector tweak grows it */
      const full = 'YOUR\\nCOIN';
      els.push(E.create('text', { id:'d4', text: full.slice(0, Math.max(1, Math.round(full.length*p_main))),
        font: 'Cinzel', weight: 900, sizeMM: size, lineHeight: 1.05, letterSpacing: 0.5 }));
    }
    if (p_bot > 0) els.push(E.create('arctext', { id:'d5', text: FULLBOT.slice(0, Math.round(FULLBOT.length*p_bot)), radiusMM: R-8.2, sizeMM: 2.0, side:'bottom', centerDeg: 180, letterSpacing: 0.5, weight: 700 }));

    S.doc.elements = els;

    /* selection moments (shows handles + inspector) */
    S.sel.clear();
    if (t >= 5.6 && t < 9.2 && p_main > 0) S.sel.add('d4');

    /* metal showcase */
    S.ui.metal = (t >= 13.6 && t < 14.5) ? 'silver' : (t >= 14.5 && t < 15.4) ? 'gunmetal' : 'brass';

    /* end zoom-in */
    const pz = seg(t, 15.8, 17.8);
    S.ui.zoom = 1 + 0.34 * ease(pz);
    S.ui.panY = -8 * ease(pz);

    CF.bus.emit('sel');
    CF.renderer.render();

    /* cursor choreography */
    cursorPath(t, [
      [0.0, () => ({x: innerWidth*0.42, y: innerHeight*0.5})],
      [1.6, () => tabPos('Rings'), true],
      [2.1, () => cardPos(0), true],
      [4.6, () => tabPos('Add'), true],
      [5.2, () => rectOf('.cf-addgrid .cf-addbtn:nth-child(1)'), true],
      [7.8, () => rectOf('#right .cf-input[type=number]', [0.85, 0.5])],
      [8.9, () => rectOf('#right .cf-input[type=number]', [0.85, 0.5]), true],
      [9.5, () => rectOf('.cf-addgrid .cf-addbtn:nth-child(2)'), true],
      [11.2, () => tabPos('Templates'), true],
      [11.9, () => cardPos(1)],
      [12.7, () => cardPos(2)],
      [13.1, () => tabPos('Layers'), true],
      [13.6, () => rectOf('#right select.cf-input')],
      [14.5, () => rectOf('#right select.cf-input'), true],
      [16.0, () => ({x: innerWidth*0.55, y: innerHeight*0.42})],
      [20.5, () => ({x: innerWidth*0.60, y: innerHeight*0.55})],
    ]);
  };
  return true;
})()
`;

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(4, '0');

async function main() {
  if (!EDGE) throw new Error('Microsoft Edge not found');
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  /* serve the app */
  const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), String(PORT)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--mute-audio'],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction('window.CF && CF.store && CF.store.doc && CF.renderer', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500)); /* fonts settle */
    await page.evaluate(DIRECTOR);

    const total = Math.round(DUR * FPS);
    console.log(`capturing ${total} frames at ${FPS}fps…`);
    for (let i = 0; i < total; i++) {
      const t = i / FPS;
      await page.evaluate(`window.__director(${t})`);
      await new Promise(r => setTimeout(r, 55)); /* let debounced panels settle */
      await page.screenshot({ path: path.join(FRAMES, `f${pad(i)}.png`) });
      if (i % 60 === 0) console.log(`  frame ${i}/${total} (t=${t.toFixed(1)}s)`);
    }

    /* poster + og image: hold frame near the end */
    await page.evaluate(`window.__director(19.0)`);
    await new Promise(r => setTimeout(r, 120));
    await page.screenshot({ path: path.join(OUT, 'demo-poster.png') });

    /* static template-belt thumbnails */
    console.log('rendering template belt thumbnails…');
    const picks = [
      ['veteran-eagle', 'brass'], ['police', 'silver'], ['family-crest', 'gold'],
      ['liberty', 'copper'], ['fire', 'gunmetal'], ['anniversary', 'copper'],
      ['graduation', 'brass'], ['army-band', 'silver'], ['memorial', 'silver'],
      ['sports', 'gold'], ['corporate', 'gunmetal'], ['minimal-modern', 'black'],
    ];
    fs.mkdirSync(path.join(OUT, 'tpl'), { recursive: true });
    for (let i = 0; i < picks.length; i++) {
      const dataURL = await page.evaluate(`
        CF.renderer.thumbnail(CF.Templates.get('${picks[i][0]}').build(45), 340, '${picks[i][1]}').toDataURL('image/png')
      `);
      fs.writeFileSync(path.join(OUT, 'tpl', `t${i}.png`), Buffer.from(dataURL.split(',')[1], 'base64'));
    }
  } finally {
    await browser.close();
    server.kill();
  }

  /* encode */
  console.log('encoding mp4…');
  const fadeOut = (DUR - 0.8).toFixed(2);
  execFileSync(ffmpeg, [
    '-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.png'),
    '-vf', `fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOut}:d=0.8,scale=${W}:-2`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow',
    '-movflags', '+faststart',
    path.join(OUT, 'demo.mp4'),
  ], { stdio: 'inherit' });

  /* poster → jpg via ffmpeg */
  execFileSync(ffmpeg, [
    '-y', '-i', path.join(OUT, 'demo-poster.png'),
    '-qscale:v', '3', path.join(OUT, 'demo-poster.jpg'),
  ], { stdio: 'inherit' });
  fs.rmSync(path.join(OUT, 'demo-poster.png'));

  const mb = (fs.statSync(path.join(OUT, 'demo.mp4')).size / 1048576).toFixed(1);
  console.log(`DONE — site/assets/demo.mp4 (${mb} MB) + demo-poster.jpg + tpl/*.png`);
}

main().catch(e => { console.error(e); process.exit(1); });