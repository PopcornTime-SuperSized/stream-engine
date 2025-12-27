// Shared Electron IPC helper
// Used by App.js and DetailView.js

export const getElectron = () => {
  if (window.electron) return window.electron;
  if (window.require) {
    try {
      const { ipcRenderer, shell } = window.require('electron');
      return {
        searchTorrents: (q, c) => ipcRenderer.invoke('search-torrents', q, c),
        startStream: (m, f) => ipcRenderer.invoke('start-stream', m, f),
        stopStream: () => ipcRenderer.invoke('stop-stream'),
        openExternal: (url) => shell.openExternal(url)
      };
    } catch (e) {
      console.error('Failed to require electron:', e);
      return null;
    }
  }
  return null;
};
