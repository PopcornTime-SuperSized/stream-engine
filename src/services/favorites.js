const STORAGE_KEY = 'favorites.json';

// Initialize file storage
let fs, path, ipcRenderer, userDataPath, storePath;

try {
  if (window.require) {
    fs = window.require('fs');
    path = window.require('path');
    ipcRenderer = window.require('electron').ipcRenderer;
    userDataPath = ipcRenderer.sendSync('get-user-data-path-sync');
    storePath = path.join(userDataPath, STORAGE_KEY);
    
    // Ensure file exists
    if (!fs.existsSync(storePath)) {
      console.log('[Favorites] File does not exist, initializing...');
      // Check for legacy data in localStorage to migrate
      let initialStore = { movie: [], tv: [], music: [] };
      try {
        const legacy = localStorage.getItem('stream-engine-favorites');
        if (legacy) {
          console.log('[Favorites] Migrating legacy localStorage data to file');
          initialStore = JSON.parse(legacy);
        }
      } catch (err) {
        console.error('[Favorites] Migration failed:', err);
      }
      fs.writeFileSync(storePath, JSON.stringify(initialStore, null, 2));
    } else {
      console.log('[Favorites] Storage file found:', storePath);
      // Check if file is effectively empty and we have localstorage data to rescue
      try {
        const data = fs.readFileSync(storePath, 'utf-8');
        const store = JSON.parse(data);
        const isEmpty = (!store.movie || store.movie.length === 0) && 
                        (!store.tv || store.tv.length === 0) && 
                        (!store.music || store.music.length === 0);
        
        if (isEmpty) {
           const legacy = localStorage.getItem('stream-engine-favorites');
           if (legacy) {
             try {
                const legacyStore = JSON.parse(legacy);
                const hasData = (legacyStore.movie && legacyStore.movie.length > 0) ||
                                (legacyStore.tv && legacyStore.tv.length > 0) ||
                                (legacyStore.music && legacyStore.music.length > 0);
                                
                if (hasData) {
                   console.log('[Favorites] Importing legacy data from LocalStorage to empty file...');
                   fs.writeFileSync(storePath, JSON.stringify(legacyStore, null, 2));
                }
             } catch (e) {
                console.error('[Favorites] Error parsing legacy data:', e);
             }
           }
        }
      } catch (e) {
        console.error('[Favorites] Error checking empty file:', e);
      }
    }
  }
} catch (e) {
  console.error('Failed to initialize file storage for favorites:', e);
}

// Helper to get all favorites from file (fallback to localStorage if fs fails)
const getStore = () => {
  try {
    let store = { movie: [], tv: [], music: [] };
    if (fs && storePath) {
      if (fs.existsSync(storePath)) {
        const data = fs.readFileSync(storePath, 'utf-8');
        store = JSON.parse(data);
      }
    } else {
      // Fallback
      const legacy = localStorage.getItem('stream-engine-favorites');
      if (legacy) store = JSON.parse(legacy);
    }

    // Ensure structure exists
    if (!store.movie) store.movie = [];
    if (!store.tv) store.tv = [];
    if (!store.music) store.music = [];
    
    // Playlist Migration & Structure
    if (!store.playlists) {
      store.playlists = { music: { 'General Playlist': [] } };
      // Migrate legacy music favorites if they are in a flat array
      if (Array.isArray(store.music) && store.music.length > 0) {
        console.log('[Favorites] Migrating legacy flat music list to General Playlist');
        store.playlists.music['General Playlist'] = [...store.music];
        store.music = []; // Clear flat list once migrated
      }
    } else if (!store.playlists.music) {
      store.playlists.music = { 'General Playlist': [] };
    }

    return store;
  } catch (e) {
    console.error('Failed to parse favorites', e);
    return { movie: [], tv: [], music: [], playlists: { music: { 'General Playlist': [] } } };
  }
};

// Helper to save favorites to file
const saveStore = (store) => {
  try {
    if (fs && storePath) {
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    } else {
      localStorage.setItem('stream-engine-favorites', JSON.stringify(store));
    }
  } catch (e) {
    console.error('Failed to save favorites', e);
  }
};

// Helper to notify listeners
const notify = () => {
  console.log('[Favorites] Dispatching favorites-updated event');
  window.dispatchEvent(new CustomEvent('favorites-updated'));
};

export const favorites = {
  // Add an item to favorites
  add: (item, type, playlistName = null) => {
    const store = getStore();
    
    if (type === 'music') {
      const pName = playlistName || 'General Playlist';
      if (!store.playlists.music[pName]) store.playlists.music[pName] = [];
      
      if (!store.playlists.music[pName].some(i => i.id == item.id)) {
        store.playlists.music[pName].push(item);
        saveStore(store);
        console.log(`[Favorites] Added ${item.title || item.name} to Music playlist: ${pName}`);
        notify();
      }
      return;
    }

    if (!store[type]) store[type] = [];
    
    // Check if already exists to prevent duplicates
    if (!store[type].some(i => i.id == item.id)) {
      // Store only necessary metadata to render the card/detail later
      // We store the whole item to avoid re-fetching details
      store[type].push(item);
      saveStore(store);
      console.log(`[Favorites] Added ${item.title || item.name} (${item.id})`);
      notify();
    }
  },

  // Remove an item from favorites
  remove: (id, type, playlistName = null) => {
    const store = getStore();
    
    if (type === 'music') {
      if (playlistName) {
        // Remove from specific playlist
        if (store.playlists.music[playlistName]) {
          store.playlists.music[playlistName] = store.playlists.music[playlistName].filter(item => item.id != id);
        }
      } else {
        // Remove from ALL playlists if no name specified
        Object.keys(store.playlists.music).forEach(p => {
          store.playlists.music[p] = store.playlists.music[p].filter(item => item.id != id);
        });
      }
      saveStore(store);
      notify();
      return;
    }

    if (!store[type]) return;
    
    store[type] = store[type].filter(item => item.id != id);
    saveStore(store);
    console.log(`[Favorites] Removed ${id}`);
    notify();
  },

  // Check if an item is favorited
  isFavorite: (id, type, playlistName = null) => {
    const store = getStore();
    if (type === 'music') {
      if (playlistName) {
        return store.playlists.music[playlistName]?.some(item => item.id == id) || false;
      }
      // Check if favorited in ANY music playlist
      return Object.values(store.playlists.music).some(p => p.some(item => item.id == id));
    }
    return store[type]?.some(item => item.id == id) || false;
  },

  // Get all favorites for a specific category
  getFavorites: (type, playlistName = null) => {
    const store = getStore();
    if (type === 'music') {
      if (playlistName) return store.playlists.music[playlistName] || [];
      // If no playlist specified for music, return all unique items across all playlists
      const all = Object.values(store.playlists.music).flat();
      return Array.from(new Map(all.map(item => [item.id, item])).values());
    }
    return store[type] || [];
  },

  // Get list of playlist names
  getPlaylists: (type) => {
    const store = getStore();
    if (!store.playlists || !store.playlists[type]) return [];
    return Object.keys(store.playlists[type]);
  },

  // Create a new playlist
  createPlaylist: (type, name) => {
    if (!name) return false;
    const store = getStore();
    if (!store.playlists) store.playlists = {};
    if (!store.playlists[type]) store.playlists[type] = {};
    
    if (store.playlists[type][name]) return false; // Already exists
    
    store.playlists[type][name] = [];
    saveStore(store);
    notify();
    return true;
  },

  // Delete a playlist
  deletePlaylist: (type, name) => {
    if (name === 'General Playlist') return false; // Protected
    const store = getStore();
    if (store.playlists?.[type]?.[name]) {
      delete store.playlists[type][name];
      saveStore(store);
      notify();
      return true;
    }
    return false;
  },

  // Toggle favorite status (convenience method)
  toggle: (item, type, playlistName = null) => {
    const isFav = favorites.isFavorite(item.id, type, playlistName);
    if (isFav) {
      favorites.remove(item.id, type, playlistName);
    } else {
      favorites.add(item, type, playlistName);
    }
    return !isFav;
  }
};
