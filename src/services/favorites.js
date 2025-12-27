const STORAGE_KEY = 'stream-engine-favorites';

// Helper to get all favorites from localStorage
const getStore = () => {
  try {
    const store = localStorage.getItem(STORAGE_KEY);
    return store ? JSON.parse(store) : { movie: [], tv: [], music: [] };
  } catch (e) {
    console.error('Failed to parse favorites', e);
    return { movie: [], tv: [], music: [] };
  }
};

// Helper to save favorites to localStorage
const saveStore = (store) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save favorites', e);
  }
};

export const favorites = {
  // Add an item to favorites
  add: (item, type) => {
    const store = getStore();
    if (!store[type]) store[type] = [];
    
    // Check if already exists to prevent duplicates
    if (!store[type].some(i => i.id === item.id)) {
      // Store only necessary metadata to render the card/detail later
      // We store the whole item to avoid re-fetching details
      store[type].push(item);
      saveStore(store);
    }
  },

  // Remove an item from favorites
  remove: (id, type) => {
    const store = getStore();
    if (!store[type]) return;
    
    store[type] = store[type].filter(item => item.id !== id);
    saveStore(store);
  },

  // Check if an item is favorited
  isFavorite: (id, type) => {
    const store = getStore();
    return store[type]?.some(item => item.id === id) || false;
  },

  // Get all favorites for a specific category
  getFavorites: (type) => {
    const store = getStore();
    return store[type] || [];
  },

  // Toggle favorite status (convenience method)
  toggle: (item, type) => {
    const store = getStore();
    const isFav = store[type]?.some(i => i.id === item.id);
    
    if (isFav) {
      store[type] = store[type].filter(i => i.id !== item.id);
    } else {
      if (!store[type]) store[type] = [];
      store[type].push(item);
    }
    
    saveStore(store);
    return !isFav;
  }
};
