'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pet', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  chat: (messages) => ipcRenderer.invoke('chat', messages),
  onCursor: (fn) => ipcRenderer.on('cursor', (_e, pos) => fn(pos)),
  drag: (dx, dy) => ipcRenderer.send('window:drag', { dx, dy }),
  hide: () => ipcRenderer.send('window:hide'),
  quit: () => ipcRenderer.send('window:quit'),
});
