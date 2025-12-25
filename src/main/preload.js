const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electron', {
  searchTorrents: (query) => ipcRenderer.invoke('search-torrents', query),
  startStream: (magnet) => ipcRenderer.invoke('start-stream', magnet)
});
