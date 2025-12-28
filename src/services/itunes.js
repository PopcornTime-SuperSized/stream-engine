import axios from 'axios';

const ITUNES_BASE_URL = 'https://itunes.apple.com';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Helper to perform requests with CORS proxy fallback
const fetchWithFallback = async (url, params = {}) => {
  try {
    // 1. Try direct request (works in Electron)
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    // 2. If Network Error (likely CORS in browser), try via Proxy
    console.log('Direct request failed, trying proxy...', error.message);
    if (!error.response || error.code === 'ERR_NETWORK') {
      try {
        // Construct full URL with params for the proxy
        const paramString = new URLSearchParams(params).toString();
        const targetUrl = `${url}${url.includes('?') ? '&' : '?'}${paramString}`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
        
        console.log('Fetching via proxy:', proxyUrl);
        const response = await axios.get(proxyUrl);
        return response.data;
      } catch (proxyError) {
        console.error('Proxy request also failed:', proxyError);
        throw proxyError;
      }
    }
    throw error;
  }
};

const itunesClient = axios.create({
  baseURL: ITUNES_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const itunes = {
  // Search Albums
  searchAlbums: async (query) => {
    return fetchWithFallback(`${ITUNES_BASE_URL}/search`, {
      term: query,
      media: 'music',
      entity: 'album',
      limit: 50,
    });
  },

  // Get Top Albums
  getTopAlbums: async (limit = 50) => {
    const rssUrl = `https://rss.applemarketingtools.com/api/v2/us/music/most-played/${limit}/albums.json`;
    const data = await fetchWithFallback(rssUrl);
    return data.feed.results;
  },

  // Get Album Details (Tracks)
  getAlbumDetails: async (collectionId) => {
    return fetchWithFallback(`${ITUNES_BASE_URL}/lookup`, {
      id: collectionId,
      entity: 'song',
    });
  },

  // Helper to get high-res artwork
  getArtworkUrl: (url, size = 600) => {
    if (!url) return 'https://via.placeholder.com/600x600?text=No+Artwork';
    return url.replace('100x100', `${size}x${size}`);
  }
};
