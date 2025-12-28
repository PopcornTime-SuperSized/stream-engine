const STORAGE_KEY = 'history.json';

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
      console.log('[History] File does not exist, initializing...');
      let initialStore = { 
        movie: [], 
        tv: { shows: [], seasons: [], episodes: [] }, 
        music: { albums: [], tracks: [] } 
      };
      
      // Check for legacy data
      try {
        const legacy = localStorage.getItem('stream-engine-history');
        if (legacy) {
          console.log('[History] Migrating legacy localStorage data to file');
          initialStore = JSON.parse(legacy);
        }
      } catch (err) {
        console.error('[History] Migration failed:', err);
      }
      
      // Check for history service legacy data
      try {
        const historyServiceLegacy = localStorage.getItem('history-service');
        if (historyServiceLegacy) {
          console.log('[History] Migrating legacy history service localStorage data to file');
          const historyServiceData = JSON.parse(historyServiceLegacy);
          Object.keys(historyServiceData).forEach(key => {
            if (key === 'movie') {
              initialStore.movie = historyServiceData[key];
            } else if (key === 'tv') {
              initialStore.tv.shows = historyServiceData[key].shows;
              initialStore.tv.seasons = historyServiceData[key].seasons;
              initialStore.tv.episodes = historyServiceData[key].episodes;
            } else if (key === 'music') {
              initialStore.music.albums = historyServiceData[key].albums;
              initialStore.music.tracks = historyServiceData[key].tracks;
            }
          });
        }
      } catch (err) {
        console.error('[History] History service migration failed:', err);
      }
      
      fs.writeFileSync(storePath, JSON.stringify(initialStore, null, 2));
    } else {
      console.log('[History] Storage file found:', storePath);
      // Check if file is effectively empty and we have localstorage data to rescue
      try {
        const data = fs.readFileSync(storePath, 'utf-8');
        const store = JSON.parse(data);
        const isEmpty = (!store.movie || store.movie.length === 0) && 
                        (!store.tv || (store.tv.shows.length === 0 && store.tv.episodes.length === 0)) && 
                        (!store.music || store.music.albums.length === 0);
        
        if (isEmpty) {
           const legacy = localStorage.getItem('stream-engine-history');
           if (legacy) {
             const legacyStore = JSON.parse(legacy);
             if (legacyStore) {
                console.log('[History] Importing legacy data from LocalStorage to empty file...');
                fs.writeFileSync(storePath, JSON.stringify(legacyStore, null, 2));
             }
           }
        }
      } catch (e) {
        console.error('[History] Error checking empty file:', e);
      }
    }
  }
} catch (e) {
  console.error('Failed to initialize file storage for history:', e);
}

const getStore = () => {
  try {
    if (fs && storePath) {
      if (fs.existsSync(storePath)) {
        const data = fs.readFileSync(storePath, 'utf-8');
        return JSON.parse(data);
      }
    }
    // Fallback
    const store = localStorage.getItem('stream-engine-history');
    return store ? JSON.parse(store) : { 
      movie: [], 
      tv: { shows: [], seasons: [], episodes: [] }, 
      music: { albums: [], tracks: [] } 
    };
  } catch (e) {
    console.error('Failed to parse history', e);
    return { movie: [], tv: { shows: [], seasons: [], episodes: [] }, music: { albums: [], tracks: [] } };
  }
};

const saveStore = (store) => {
  try {
    if (fs && storePath) {
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    } else {
      localStorage.setItem('stream-engine-history', JSON.stringify(store));
    }
  } catch (e) {
    console.error('Failed to save history', e);
  }
};

const notify = () => {
  console.log('[History] Dispatching history-updated event');
  window.dispatchEvent(new CustomEvent('history-updated'));
};

export const history = {
  // Check Status
  isWatched: (type, id, season = null, episode = null) => {
    const store = getStore();
    
    if (type === 'movie') {
      return store.movie.some(i => i == id);
    }
    
    if (type === 'tv') {
      if (episode !== null && season !== null) {
        return store.tv.episodes.includes(`${id}_s${season}_e${episode}`);
      }
      if (season !== null) {
        return store.tv.seasons.includes(`${id}_s${season}`);
      }
      return store.tv.shows.some(i => i == id);
    }
    
    if (type === 'music') {
      if (episode !== null) { // using 'episode' param for trackId in this context
        return store.music.tracks.includes(`${id}_t${episode}`);
      }
      return store.music.albums.some(i => i == id);
    }
    
    return false;
  },

  // Toggle Status
  toggle: (type, id, season = null, episode = null) => {
    const store = getStore();
    let isWatched = false;
    
    if (type === 'movie') {
      if (store.movie.some(i => i == id)) {
        store.movie = store.movie.filter(i => i != id);
        isWatched = false;
        console.log(`[History] Unwatched Movie ${id}`);
      } else {
        store.movie.push(id);
        isWatched = true;
        console.log(`[History] Watched Movie ${id}`);
      }
    } else if (type === 'tv') {
      if (episode !== null && season !== null) {
        const key = `${id}_s${season}_e${episode}`;
        if (store.tv.episodes.includes(key)) {
          store.tv.episodes = store.tv.episodes.filter(k => k !== key);
          isWatched = false;
        } else {
          store.tv.episodes.push(key);
          isWatched = true;
        }
      } else if (season !== null) {
        const key = `${id}_s${season}`;
        if (store.tv.seasons.includes(key)) {
          store.tv.seasons = store.tv.seasons.filter(k => k !== key);
          isWatched = false;
        } else {
          store.tv.seasons.push(key);
          isWatched = true;
        }
      } else {
        if (store.tv.shows.some(i => i == id)) {
          store.tv.shows = store.tv.shows.filter(i => i != id);
          isWatched = false;
          console.log(`[History] Unwatched Show ${id}`);
        } else {
          store.tv.shows.push(id);
          isWatched = true;
          console.log(`[History] Watched Show ${id}`);
        }
      }
    } else if (type === 'music') {
      if (episode !== null) { // track
        const key = `${id}_t${episode}`;
        if (store.music.tracks.includes(key)) {
          store.music.tracks = store.music.tracks.filter(k => k !== key);
          isWatched = false;
        } else {
          store.music.tracks.push(key);
          isWatched = true;
        }
      } else { // album
        if (store.music.albums.some(i => i == id)) {
          store.music.albums = store.music.albums.filter(i => i != id);
          isWatched = false;
          console.log(`[History] Unheard Album ${id}`);
        } else {
          store.music.albums.push(id);
          isWatched = true;
          console.log(`[History] Heard Album ${id}`);
        }
      }
    }

    saveStore(store);
    notify();
    return isWatched;
  },
  
  // Mark entire season/album logic can be added here later if we want cascading
};
