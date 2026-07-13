/* ============================================================
   CoinForge Studio — help.js
   In-app documentation viewer. Content comes from
   js/docs-embedded.js (generated from /docs by
   tools/embed-docs.js) so it works fully offline.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util;

  /* minimal markdown → HTML (headings, emphasis, code, lists, tables, hr, links, blockquote) */
  function md(src) {
    const esc = U.escapeHtml;
    const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
    let html = '', inCode = false, inList = null, inTable = false, para = [];

    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    const flushPara = () => {
      if (para.length) { html += '<p>' + para.map(inline).join(' ') + '</p>'; para = []; }
    };
    const flushList = () => { if (inList) { html += `</${inList}>`; inList = null; } };
    const flushTable = () => { if (inTable) { html += '</tbody></table>'; inTable = false; } };

    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      if (L.trim().startsWith('```')) {
        flushPara(); flushList(); flushTable();
        if (!inCode) { html += '<pre><code>'; inCode = true; }
        else { html += '</code></pre>'; inCode = false; }
        continue;
      }
      if (inCode) { html += esc(L) + '\n'; continue; }

      const h = /^(#{1,4})\s+(.*)/.exec(L);
      if (h) { flushPara(); flushList(); flushTable(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
      if (/^\s*---+\s*$/.test(L)) { flushPara(); flushList(); flushTable(); html += '<hr>'; continue; }

      if (/^\s*\|/.test(L)) {
        flushPara(); flushList();
        const cells = L.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        if (cells.every(c => /^:?-{2,}:?$/.test(c))) continue; /* separator row */
        if (!inTable) {
          inTable = true;
          html += '<table><thead><tr>' + cells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          html += '<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
        }
        continue;
      } else flushTable();

      const li = /^\s*[-*]\s+(.*)/.exec(L);
      const oli = /^\s*\d+[.)]\s+(.*)/.exec(L);
      if (li || oli) {
        flushPara();
        const want = li ? 'ul' : 'ol';
        if (inList !== want) { flushList(); html += `<${want}>`; inList = want; }
        html += `<li>${inline((li || oli)[1])}</li>`;
        continue;
      } else flushList();

      const bq = /^>\s?(.*)/.exec(L);
      if (bq) { flushPara(); html += `<blockquote>${inline(bq[1])}</blockquote>`; continue; }

      if (!L.trim()) { flushPara(); continue; }
      para.push(L.trim());
    }
    flushPara(); flushList(); flushTable();
    if (inCode) html += '</code></pre>';
    return html;
  }

  CF.help = {
    md,
    open(docId) {
      const docs = window.CF_DOCS || [];
      if (!docs.length) {
        CF.ui.modal({
          title: 'Help', width: '480px',
          content: b => b.appendChild(U.el('p', { class: 'cf-confirm-msg' },
            'Documentation bundle not found (js/docs-embedded.js). The full manuals are in the /docs folder next to the app.'))
        });
        return;
      }
      const modal = CF.ui.modal({ title: 'CoinForge Studio — Help', width: '980px' });
      const wrap = U.el('div', { class: 'cf-help-wrap' });
      const nav = U.el('div', { class: 'cf-help-nav' });
      const body = U.el('div', { class: 'cf-help-body' });
      wrap.appendChild(nav);
      wrap.appendChild(body);
      modal.body.appendChild(wrap);

      function show(id) {
        const d = docs.find(x => x.id === id) || docs[0];
        U.$$('.cf-help-link', nav).forEach(a => a.classList.toggle('active', a.dataset.id === d.id));
        body.innerHTML = md(d.md);
        body.scrollTop = 0;
      }
      for (const d of docs) {
        const a = U.el('div', { class: 'cf-help-link', dataset: { id: d.id } }, d.title);
        a.addEventListener('click', () => show(d.id));
        nav.appendChild(a);
      }
      nav.appendChild(U.el('div', { class: 'cf-help-about' },
        `${CF.APP_NAME} v${CF.VERSION}`, U.el('br'), `by ${CF.AUTHOR}`));
      show(docId || docs[0].id);
    },

    about() {
      CF.ui.modal({
        title: 'About', width: '460px',
        content: b => {
          b.appendChild(U.el('div', { class: 'cf-about' },
            U.el('img', { class: 'cf-about-logo', src: 'favicon.png', alt: '' }),
            U.el('h2', null, CF.APP_NAME),
            U.el('p', null, `Version ${CF.VERSION}`),
            U.el('p', null, 'A challenge-coin, card, token & stamp designer for laser engraving.'),
            U.el('p', null, U.el('strong', null, `Author: ${CF.AUTHOR}`)),
            U.el('p', { class: 'cf-hint' }, 'MIT License · Fonts: Google Fonts (OFL) · AI model: U²-Net (Apache-2.0) · Runtime: onnxruntime-web (MIT)')));
        }
      });
    }
  };
})();