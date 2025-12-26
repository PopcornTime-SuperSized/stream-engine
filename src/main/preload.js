const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electron', {
  searchTorrents: (query) => ipcRenderer.invoke('search-torrents', query),
  startStream: (magnet) => ipcRenderer.invoke('start-stream', magnet),
  stopStream: () => ipcRenderer.invoke('stop-stream'),
  onTorrentProgress: (callback) => {
    ipcRenderer.on('torrent-progress', (event, progress) => callback(progress));
  },
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('torrent-progress');
  }
});
