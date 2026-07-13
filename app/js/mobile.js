/* ============================================================
   CoinForge Studio — mobile.js
   Small-screen shell: the side panels become slide-in drawers
   driven by a bottom toolbar. Pure additive layer — desktop
   layout and behavior are untouched above the breakpoint.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util;
  const BREAK = 900; /* keep in sync with the @media query in app.css */

  let bar = null, scrim = null;
  const isMobile = () => window.innerWidth <= BREAK;

  function close(which) {
    if (which !== 'right') U.$('#left').classList.remove('open');
    if (which !== 'left') U.$('#right').classList.remove('open');
    sync();
  }

  function toggle(side) {
    const el = U.$(side === 'left' ? '#left' : '#right');
    const other = U.$(side === 'left' ? '#right' : '#left');
    other.classList.remove('open');
    el.classList.toggle('open');
    sync();
  }

  function sync() {
    const anyOpen = U.$('#left').classList.contains('open') || U.$('#right').classList.contains('open');
    scrim.classList.toggle('show', anyOpen);
    U.$('#cf-mb-tools').classList.toggle('active', U.$('#left').classList.contains('open'));
    U.$('#cf-mb-props').classList.toggle('active', U.$('#right').classList.contains('open'));
  }

  function build() {
    scrim = U.el('div', { class: 'cf-drawer-scrim' });
    scrim.addEventListener('click', () => close());
    document.body.appendChild(scrim);

    bar = U.el('div', { id: 'mobilebar' });
    const mk = (id, icon, label, fn) => {
      const b = U.el('button', { id, class: 'cf-mb-btn' },
        U.el('span', { class: 'cf-mb-ic' }, icon), U.el('span', null, label));
      b.addEventListener('click', fn);
      bar.appendChild(b);
      return b;
    };
    mk('cf-mb-tools', '☰', 'Tools', () => toggle('left'));
    mk('cf-mb-canvas', '🪙', 'Canvas', () => close());
    mk('cf-mb-props', '⚙', 'Properties', () => toggle('right'));
    document.body.appendChild(bar);

    /* badge the Properties button when something is selected */
    CF.bus.on('sel', () => {
      const dot = CF.store.sel.size > 0;
      U.$('#cf-mb-props').classList.toggle('badged', dot);
    });

    /* adding something from the tools drawer returns you to the canvas;
       edits made inside the drawer (rename, hide, lock) keep it open */
    let lastCount = CF.store.doc ? CF.store.doc.elements.length : 0;
    CF.bus.on('doc', () => {
      const n = CF.store.doc ? CF.store.doc.elements.length : 0;
      const added = n > lastCount;
      lastCount = n;
      if (added && isMobile() && U.$('#left').classList.contains('open')) close();
    });
    CF.bus.on('newdoc', () => { lastCount = CF.store.doc ? CF.store.doc.elements.length : 0; });

    window.addEventListener('resize', () => {
      if (!isMobile()) close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();