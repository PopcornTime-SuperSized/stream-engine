import axios from 'axios';

// Steam API via Cors-Anywhere or similar proxy if needed in browser, 
// but in Electron with webSecurity: false it should work directly.
// Note: Steam Store API is not strictly CORS-friendly for browsers, 
// but often works in Electron renderer if security is disabled.

const STEAM_STORE_API = 'https://store.steampowered.com/api';

const steamClient = axios.create({
  baseURL: STEAM_STORE_API,
});

export const steam = {
  // Search Games
  // Undocumented endpoint: https://store.steampowered.com/api/storesearch/?term={query}&l=english&cc=US
  searchGames: async (query) => {
    const response = await steamClient.get('/storesearch/', {
      params: {
        term: query,
        l: 'english',
        cc: 'US'
      }
    });
    // Response structure: { total: 5, items: [...] }
    return response.data;
  },

  // Get Top/Featured Games
  // We can use the 'featured' categories endpoint
  getFeaturedGames: async () => {
    const response = await steamClient.get('/featuredcategories/', {
      params: {
        l: 'english',
        cc: 'US'
      }
    });
    
    // Featured categories returns multiple lists. 
    // We'll grab 'Top Sellers' or 'New Releases' from the first supported key.
    // Usually response.data.top_sellers.items or similar.
    // Let's fallback to search empty string or specific known lists if this is complex.
    // Actually, storesearch with empty term might not work.
    
    // Let's use the top_sellers if available, or just a hardcoded list of popular tags if needed.
    // Better yet: search for "popular" or empty?
    // Let's try searching for a common tag or just return top sellers from the featured endpoint.
    
    const topSellers = response.data.top_sellers?.items || 
                       response.data.specials?.items || 
                       response.data.new_releases?.items || [];
                       
    return topSellers;
  },

  // Get Game Details
  // Endpoint: https://store.steampowered.com/api/appdetails?appids={id}
  getGameDetails: async (appId) => {
    const response = await steamClient.get('/appdetails', {
      params: {
        appids: appId,
        l: 'english',
        cc: 'US'
      }
    });
    
    // Structure: { [appId]: { success: true, data: { ... } } }
    if (response.data && response.data[appId] && response.data[appId].success) {
      return response.data[appId].data;
    }
    throw new Error('Failed to fetch game details');
  },

  // Image Helper
  // Steam images are usually full URLs in the response, but we can have a helper just in case.
  getImageUrl: (url) => {
    if (!url) return 'https://via.placeholder.com/460x215?text=No+Image';
    return url;
  }
};
