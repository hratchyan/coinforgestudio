/* ============================================================
   CoinForge Studio — Electron main process
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const mcp = require('./mcp-server.js');

let win = null;

const PROJECTS_DIR = () => {
  const dir = path.join(app.getPath('documents'), 'CoinForge Projects');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { }
  return dir;
};

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 640,
    backgroundColor: '#15181d',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
    show: false,
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  buildMenu();
}

const send = (cmd) => { if (win) win.webContents.send('menu', cmd); };

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Coin…', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: 'Projects…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Save As New Copy', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveas') },
        { type: 'separator' },
        { label: 'Import .coin File…', click: () => send('import') },
        { label: 'Export .coin File…', click: () => send('exportcoin') },
        { type: 'separator' },
        { label: 'Export for Engraving…', accelerator: 'CmdOrCtrl+E', click: () => send('export') },
        { type: 'separator' },
        { label: 'Open Projects Folder', click: () => shell.openPath(PROJECTS_DIR()) },
        { type: 'separator' },
        { role: 'quit' },
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', click: () => send('redo') },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      ]
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'Background Remover…', accelerator: 'CmdOrCtrl+B', click: () => send('bgtool') },
        { label: 'Import Image to Coin…', click: () => send('addimage') },
        { label: 'Generate Cut Outline…', accelerator: 'CmdOrCtrl+L', click: () => send('outline') },
        { type: 'separator' },
        { label: 'AI Assistant (MCP)…', click: () => send('assistant') },
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Fit Coin', accelerator: 'F', click: () => send('fit') },
        { type: 'separator' },
        { role: 'reload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'User Guide', accelerator: 'F1', click: () => send('help') },
        { label: 'Keyboard Shortcuts', click: () => send('shortcuts') },
        { type: 'separator' },
        { label: 'About CoinForge Studio', click: () => send('about') },
      ]
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------- IPC ---------- */
/* project ids and file names come from the renderer — never trust them as paths */
const safeId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
const safeName = (n) => String(n).replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+/, '_').slice(0, 120) || 'export';
const insideDir = (dir, p) => {
  const rp = path.resolve(p);
  return rp === path.resolve(dir) || rp.startsWith(path.resolve(dir) + path.sep);
};
const projectPath = (id) => {
  const p = path.join(PROJECTS_DIR(), safeId(id) + '.coin');
  if (!insideDir(PROJECTS_DIR(), p)) throw new Error('bad project id');
  return p;
};

ipcMain.handle('save-file', async (e, defaultName, base64) => {
  const clean = safeName(defaultName);
  const ext = path.extname(clean).replace('.', '') || 'png';
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: clean,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, Buffer.from(String(base64), 'base64'));
  return filePath;
});

/* pick a folder once, then batch-write into it (per-group exports) */
ipcMain.handle('choose-dir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose export folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return canceled || !filePaths.length ? null : filePaths[0];
});

ipcMain.handle('write-file-in-dir', async (e, dir, name, base64) => {
  if (typeof dir !== 'string' || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
  const p = path.join(dir, safeName(name));
  if (!insideDir(dir, p)) return null;
  fs.writeFileSync(p, Buffer.from(String(base64), 'base64'));
  return p;
});

const APP_DIR = path.join(__dirname, '..', 'app');
ipcMain.handle('read-asset', async (e, rel) => {
  try {
    const p = path.join(APP_DIR, String(rel));
    if (!insideDir(APP_DIR, p)) return null;
    return fs.readFileSync(p).toString('base64');
  } catch (err) { return null; }
});

ipcMain.handle('projects-list', async () => {
  const dir = PROJECTS_DIR();
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.coin')) continue;
    try {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
      out.push({
        id: path.basename(f, '.coin'),
        name: (payload.doc && payload.doc.name) || path.basename(f, '.coin'),
        modified: stat.mtimeMs,
        thumb: payload.thumb || null,
      });
    } catch (e) { /* skip corrupt file */ }
  }
  return out.sort((a, b) => b.modified - a.modified);
});

ipcMain.handle('projects-read', async (e, id) => {
  try { return fs.readFileSync(projectPath(id), 'utf8'); }
  catch (err) { return null; }
});

ipcMain.handle('projects-write', async (e, id, json) => {
  if (typeof json !== 'string' || json.length > 200 * 1024 * 1024) return false;
  fs.writeFileSync(projectPath(id), json);
  return true;
});

ipcMain.handle('projects-remove', async (e, id) => {
  try { fs.unlinkSync(projectPath(id)); } catch (err) { }
  return true;
});

/* ---------- tiny settings store (userData/settings.json) ---------- */
const SETTINGS_PATH = () => path.join(app.getPath('userData'), 'settings.json');
function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_PATH(), 'utf8')); } catch (e) { return {}; }
}
ipcMain.handle('settings-get', async (e, key) => readSettings()[String(key)]);
ipcMain.handle('settings-set', async (e, key, value) => {
  const s = readSettings();
  s[String(key)] = value;
  fs.writeFileSync(SETTINGS_PATH(), JSON.stringify(s, null, 1));
  return true;
});

/* ---------- MCP server (AI assistant) ---------- */
/* Tool calls run in the renderer, where the CF engine lives. */
let execSeq = 0;
const pendingExec = new Map();
function execInRenderer(tool, args) {
  return new Promise((resolve) => {
    if (!win) return resolve({ error: 'app window closed' });
    const id = ++execSeq;
    const timer = setTimeout(() => {
      pendingExec.delete(id);
      resolve({ error: 'tool timed out (30s)' });
    }, 30000);
    pendingExec.set(id, { resolve, timer });
    win.webContents.send('mcp-exec', { id, tool, args });
  });
}
ipcMain.on('mcp-result', (e, { id, result }) => {
  const p = pendingExec.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pendingExec.delete(id);
  p.resolve(result);
});

/* the renderer may only start the server when a valid Pro link exists —
   it holds the link UI; main re-checks the stored link as a backstop */
const linkValid = () => {
  const l = readSettings()['ailink'];
  return !!(l && (l.role === 'pro' || l.role === 'elite')
    && (Date.now() - (l.at || 0)) < 1000 * 60 * 60 * 24 * 30);
};
ipcMain.handle('mcp-start', async () => {
  if (!linkValid()) return { running: false, error: 'not linked' };
  const exportsDir = path.join(PROJECTS_DIR(), 'exports');
  return await mcp.start({
    exec: execInRenderer,
    exportsDir,
    appVersion: app.getVersion(),
  });
});
ipcMain.handle('mcp-stop', async () => { mcp.stop(); return { running: false }; });
ipcMain.handle('mcp-status', async () => mcp.status());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { mcp.stop(); app.quit(); });