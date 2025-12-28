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
    if (fs && storePath) {
      if (fs.existsSync(storePath)) {
        const data = fs.readFileSync(storePath, 'utf-8');
        return JSON.parse(data);
      }
    }
    // Fallback
    const store = localStorage.getItem('stream-engine-favorites');
    return store ? JSON.parse(store) : { movie: [], tv: [], music: [] };
  } catch (e) {
    console.error('Failed to parse favorites', e);
    return { movie: [], tv: [], music: [] };
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
  add: (item, type) => {
    const store = getStore();
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
  remove: (id, type) => {
    const store = getStore();
    if (!store[type]) return;
    
    store[type] = store[type].filter(item => item.id != id);
    saveStore(store);
    console.log(`[Favorites] Removed ${id}`);
    notify();
  },

  // Check if an item is favorited
  isFavorite: (id, type) => {
    const store = getStore();
    return store[type]?.some(item => item.id == id) || false;
  },

  // Get all favorites for a specific category
  getFavorites: (type) => {
    const store = getStore();
    return store[type] || [];
  },

  // Toggle favorite status (convenience method)
  toggle: (item, type) => {
    const store = getStore();
    const isFav = store[type]?.some(i => i.id == item.id);
    
    if (isFav) {
      store[type] = store[type].filter(i => i.id != item.id);
      console.log(`[Favorites] Toggled OFF ${item.title || item.name} (${item.id})`);
    } else {
      if (!store[type]) store[type] = [];
      store[type].push(item);
      console.log(`[Favorites] Toggled ON ${item.title || item.name} (${item.id})`);
    }
    
    saveStore(store);
    saveStore(store);
    notify();
    return !isFav;
  }
};
