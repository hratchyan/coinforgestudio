'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  saveFile: (name, base64) => ipcRenderer.invoke('save-file', name, base64),
  chooseDir: () => ipcRenderer.invoke('choose-dir'),
  writeFileInDir: (dir, name, base64) => ipcRenderer.invoke('write-file-in-dir', dir, name, base64),
  readAsset: (rel) => ipcRenderer.invoke('read-asset', rel),
  projectsList: () => ipcRenderer.invoke('projects-list'),
  projectsRead: (id) => ipcRenderer.invoke('projects-read', id),
  projectsWrite: (id, json) => ipcRenderer.invoke('projects-write', id, json),
  projectsRemove: (id) => ipcRenderer.invoke('projects-remove', id),
  onMenu: (fn) => ipcRenderer.on('menu', (e, cmd) => fn(cmd)),

  /* AI assistant (MCP) — see electron/mcp-server.js */
  settingsGet: (key) => ipcRenderer.invoke('settings-get', key),
  settingsSet: (key, value) => ipcRenderer.invoke('settings-set', key, value),
  mcpStart: () => ipcRenderer.invoke('mcp-start'),
  mcpStop: () => ipcRenderer.invoke('mcp-stop'),
  mcpStatus: () => ipcRenderer.invoke('mcp-status'),
  onMcpExec: (fn) => ipcRenderer.on('mcp-exec', (e, payload) => fn(payload)),
  mcpResult: (id, result) => ipcRenderer.send('mcp-result', { id, result }),
});