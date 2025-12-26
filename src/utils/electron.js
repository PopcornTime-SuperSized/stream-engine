// Shared Electron IPC helper
// Used by App.js and DetailView.js

export const getElectron = () => {
  if (window.electron) return window.electron;
  if (window.require) {
    try {
      const { ipcRenderer } = window.require('electron');
      return {
        searchTorrents: (q) => ipcRenderer.invoke('search-torrents', q),
        startStream: (m) => ipcRenderer.invoke('start-stream', m),
        stopStream: () => ipcRenderer.invoke('stop-stream')
      };
    } catch (e) {
      console.error('Failed to require electron:', e);
      return null;
    }
  }
  return null;
};
