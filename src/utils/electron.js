// Shared Electron IPC helper
// Used by App.js and DetailView.js

export const getElectron = () => {
  if (window.electron) return window.electron;
  if (window.require) {
    try {
      const { ipcRenderer, shell } = window.require('electron');
      return {
        searchTorrents: (q, c, opts) => ipcRenderer.invoke('search-torrents', q, c, opts),
        startStream: (m, f) => ipcRenderer.invoke('start-stream', m, f),
        stopStream: () => ipcRenderer.invoke('stop-stream'),
        downloadActiveFile: () => ipcRenderer.invoke('download-active-file'),
        openExternal: (url) => shell.openExternal(url)
      };
    } catch (e) {
      console.error('Failed to require electron:', e);
      return null;
    }
  }
  return null;
};
