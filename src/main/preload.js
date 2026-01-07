const { contextBridge, ipcRenderer, shell } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electron', {
  searchTorrents: (query, category, options) => ipcRenderer.invoke('search-torrents', query, category, options),
  startStream: (magnet, fileName) => ipcRenderer.invoke('start-stream', magnet, fileName),
  stopStream: () => ipcRenderer.invoke('stop-stream'),
  openExternal: (url) => shell.openExternal(url),
  onTorrentProgress: (callback) => {
    ipcRenderer.on('torrent-progress', (event, progress) => callback(progress));
  },
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('torrent-progress');
  }
});
