const STORAGE_KEY = 'stream-engine-history';

const getStore = () => {
  try {
    const store = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save history', e);
  }
};

export const history = {
  // Check Status
  isWatched: (type, id, season = null, episode = null) => {
    const store = getStore();
    
    if (type === 'movie') {
      return store.movie.includes(id);
    }
    
    if (type === 'tv') {
      if (episode !== null && season !== null) {
        return store.tv.episodes.includes(`${id}_s${season}_e${episode}`);
      }
      if (season !== null) {
        return store.tv.seasons.includes(`${id}_s${season}`);
      }
      return store.tv.shows.includes(id);
    }
    
    if (type === 'music') {
      if (episode !== null) { // using 'episode' param for trackId in this context
        return store.music.tracks.includes(`${id}_t${episode}`);
      }
      return store.music.albums.includes(id);
    }
    
    return false;
  },

  // Toggle Status
  toggle: (type, id, season = null, episode = null) => {
    const store = getStore();
    let isWatched = false;

    if (type === 'movie') {
      if (store.movie.includes(id)) {
        store.movie = store.movie.filter(i => i !== id);
        isWatched = false;
      } else {
        store.movie.push(id);
        isWatched = true;
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
        if (store.tv.shows.includes(id)) {
          store.tv.shows = store.tv.shows.filter(i => i !== id);
          isWatched = false;
        } else {
          store.tv.shows.push(id);
          isWatched = true;
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
        if (store.music.albums.includes(id)) {
          store.music.albums = store.music.albums.filter(i => i !== id);
          isWatched = false;
        } else {
          store.music.albums.push(id);
          isWatched = true;
        }
      }
    }

    saveStore(store);
    return isWatched;
  },
  
  // Mark entire season/album logic can be added here later if we want cascading
};
