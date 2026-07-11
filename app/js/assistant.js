/* ============================================================
   CoinForge Studio — assistant.js
   UI for the AI Assistant (MCP) — a FREE feature of the desktop app.

   Tools → AI Assistant (MCP): start/stop the local MCP server and
   copy the config for Claude Desktop / Claude Code. The user's own
   AI then designs coins in the live window. The server binds to
   127.0.0.1 only, with a bearer token regenerated on each start.

   Desktop only (needs window.native.mcpStart). Inert in the browser.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util;

  async function assistantDialog() {
    const modal = CF.ui.modal({ title: '✨ AI Assistant (MCP)', width: '560px' });
    modal.body.innerHTML = '';
    const st = await window.native.mcpStatus();

    modal.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
      'Let your own Claude design coins in this window — free, no account needed. ' +
      'The assistant runs a private server on this computer only (127.0.0.1). ' +
      'Point Claude at it and ask for a coin; you\'ll watch it design on your canvas.'));

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
      paint(s);
      btn.disabled = false;
    });
    paint(st);
  }

  CF.assistant = {
    openDialog: assistantDialog,
    available: () => !!(window.native && window.native.mcpStart),
  };
})();
