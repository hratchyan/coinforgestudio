/* ============================================================
   CoinForge Studio — assistant.js
   UI for the AI Assistant (MCP) — a Pro feature.

   Two contexts, one file:
   - DESKTOP (window.native): Tools → AI Assistant. Link your Pro
     account once (code flow below), then start/stop the local MCP
     server and copy the config for Claude Desktop / Claude Code.
   - HOSTED (signed in): account menu → "Link desktop AI…" where a
     Pro member enters the code their desktop shows.

   Link flow (server-validated, no passwords touch the desktop):
   desktop generates a random code → user types it into the HOSTED
   app → hosted (signed-in, Pro — enforced by firestore.rules)
   writes devicelinks/{code} = {uid, role} → desktop polls that doc
   over Firestore REST, stores the entitlement locally (30 days),
   deletes the doc. The unguessable code is the credential and it
   lives for minutes.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util;
  const FS_DOC = (code) =>
    'https://firestore.googleapis.com/v1/projects/coinforgestudio/databases/(default)/documents/devicelinks/' + code;
  const LINK_TTL = 1000 * 60 * 60 * 24 * 30;

  /* =============== HOSTED: enter the desktop's code =============== */
  function linkDialog() {
    const tier = CF.auth.tier || 'free';
    if (tier === 'free') {
      const m = CF.ui.modal({ title: 'Link desktop AI', width: '440px' });
      m.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
        'The AI assistant is a Pro feature — it lets Claude (or any MCP client) design coins with you in the desktop app.'));
      const b = U.el('button', { class: 'cf-btn primary' }, 'See Pro');
      b.addEventListener('click', () => { m.close(); CF.billing && CF.billing.upgradeDialog(); });
      m.body.appendChild(b);
      return;
    }
    const modal = CF.ui.modal({ title: 'Link desktop AI', width: '460px', modal: true });
    modal.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
      'In the desktop app, open Tools → AI Assistant (MCP) — it shows a link code. Enter it here:'));
    const inp = U.el('input', { class: 'cf-input', placeholder: 'e.g. K7Q2MABX', maxlength: 16, style: { textTransform: 'uppercase', letterSpacing: '2px' } });
    const err = U.el('p', { class: 'cf-auth-err', style: { display: 'none' } });
    const go = U.el('button', { class: 'cf-btn primary', style: { marginTop: '10px' } }, 'Link this account');
    go.addEventListener('click', async () => {
      const code = inp.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{8,16}$/.test(code)) {
        err.textContent = 'That doesn\'t look like a link code.';
        err.style.display = '';
        return;
      }
      go.disabled = true;
      try {
        await firebase.firestore().collection('devicelinks').doc(code).set({
          uid: CF.auth.user.uid,
          role: tier,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          /* self-expiry for the Firestore TTL policy — orphaned links
             (never read back by a desktop) get reaped automatically */
          expireAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)),
        });
        modal.close();
        CF.ui.toast('Linked — the desktop app will pick it up within seconds.', 4500);
      } catch (e) {
        go.disabled = false;
        err.textContent = 'Link failed: ' + (e.message || e);
        err.style.display = '';
      }
    });
    modal.body.appendChild(inp);
    modal.body.appendChild(err);
    modal.body.appendChild(go);
  }

  /* =============== DESKTOP: link + server controls =============== */
  const genCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    const rnd = new Uint32Array(10);
    crypto.getRandomValues(rnd);
    for (let i = 0; i < 10; i++) s += chars[rnd[i] % chars.length];
    return s;
  };

  let pollTimer = null;
  const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };

  async function assistantDialog() {
    const modal = CF.ui.modal({ title: '✨ AI Assistant (MCP)', width: '560px', onClose: stopPoll });
    const link = await window.native.settingsGet('ailink');
    const valid = link && (link.role === 'pro' || link.role === 'elite') && (Date.now() - (link.at || 0)) < LINK_TTL;
    if (!valid) renderLink(modal);
    else renderServer(modal);
  }

  function renderLink(modal) {
    stopPoll();
    modal.body.innerHTML = '';
    const code = genCode();
    modal.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
      'The AI assistant lets your own Claude design coins in this window — a ', U.el('b', null, 'Pro'), ' feature. Link your account once:'));
    modal.body.appendChild(U.el('ol', { class: 'cf-ai-steps' },
      U.el('li', null, 'Sign in at ', U.el('b', null, 'app.coinforgestudio.com'), ' (Pro account)'),
      U.el('li', null, 'Avatar menu → ', U.el('b', null, 'Link desktop AI…')),
      U.el('li', null, 'Enter this code:')));
    modal.body.appendChild(U.el('div', { class: 'cf-ai-code' }, code));
    const status = U.el('p', { class: 'cf-hint', style: { textAlign: 'center' } }, 'Waiting for the link… (this code lives 10 minutes)');
    modal.body.appendChild(status);
    modal.body.appendChild(U.el('p', { class: 'cf-planrow-foot' },
      'No account? The whole designer stays free — the AI assistant is part of ',
      U.el('a', { href: 'https://coinforgestudio.com/#pricing', target: '_blank', rel: 'noopener' }, 'Pro'), '.'));

    const t0 = Date.now();
    pollTimer = setInterval(async () => {
      if (Date.now() - t0 > 1000 * 60 * 10) { stopPoll(); status.textContent = 'Code expired — reopen this dialog for a fresh one.'; return; }
      try {
        const res = await fetch(FS_DOC(code));
        if (!res.ok) return; /* 404 = not linked yet */
        const doc = await res.json();
        const f = doc.fields || {};
        const role = f.role && f.role.stringValue;
        const uid = f.uid && f.uid.stringValue;
        if (role !== 'pro' && role !== 'elite') return;
        stopPoll();
        await window.native.settingsSet('ailink', { role, uid, at: Date.now() });
        fetch(FS_DOC(code), { method: 'DELETE' }).catch(() => { });
        CF.ui.toast('✨ Account linked — Pro AI assistant unlocked.', 4000);
        renderServer(modal);
      } catch (e) { /* offline — keep waiting */ }
    }, 3000);
  }

  async function renderServer(modal) {
    stopPoll();
    modal.body.innerHTML = '';
    const st = await window.native.mcpStatus();

    modal.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
      'The assistant runs a private server on this computer only (127.0.0.1). Point Claude at it and ask for a coin — you\'ll watch it design on your canvas.'));

    const statusLine = U.el('p', { class: 'cf-ai-status' });
    const btn = U.el('button', { class: 'cf-btn primary' });
    const cfgWrap = U.el('div');
    modal.body.appendChild(statusLine);
    modal.body.appendChild(btn);
    modal.body.appendChild(cfgWrap);

    function paint(s) {
      statusLine.textContent = s.running
        ? '● Running on ' + s.url + '   (' + (s.calls || 0) + ' tool calls this session)'
        : '○ Not running';
      statusLine.style.color = s.running ? '#6fd39a' : 'var(--muted)';
      btn.textContent = s.running ? 'Stop assistant server' : 'Start assistant server';
      cfgWrap.innerHTML = '';
      if (!s.running) return;

      const codeCmd = `claude mcp add coinforge --transport http ${s.url} --header "Authorization: Bearer ${s.token}"`;
      const desktopCfg = JSON.stringify({
        mcpServers: {
          coinforge: {
            command: 'npx',
            args: ['-y', 'mcp-remote', s.url, '--header', 'Authorization: Bearer ' + s.token],
          },
        },
      }, null, 2);

      const block = (title, text) => {
        const pre = U.el('pre', { class: 'cf-ai-snippet' }, text);
        const copy = U.el('button', { class: 'cf-btn', style: { marginBottom: '14px' } }, 'Copy');
        copy.addEventListener('click', () => { navigator.clipboard.writeText(text); copy.textContent = 'Copied ✓'; setTimeout(() => copy.textContent = 'Copy', 1500); });
        cfgWrap.appendChild(U.el('p', { class: 'cf-subhead' }, title));
        cfgWrap.appendChild(pre);
        cfgWrap.appendChild(copy);
      };
      block('Claude Code — one command', codeCmd);
      block('Claude Desktop — add to claude_desktop_config.json', desktopCfg);
      cfgWrap.appendChild(U.el('p', { class: 'cf-planrow-foot' },
        'The token changes every time the server starts. Full guide: Help (F1) → AI Assistant.'));
    }

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const s = (await window.native.mcpStatus()).running
        ? await window.native.mcpStop()
        : await window.native.mcpStart();
      if (s.error === 'not linked') { renderLink(modal); return; }
      paint(s);
      btn.disabled = false;
    });
    paint(st);
  }

  CF.assistant = {
    openDialog: assistantDialog, /* desktop */
    linkDialog,                  /* hosted */
    available: () => !!(window.native && window.native.mcpStart),
  };
})();
