import axios from 'axios';

const ITUNES_BASE_URL = 'https://itunes.apple.com';

const itunesClient = axios.create({
  baseURL: ITUNES_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const itunes = {
  // Search Albums
  searchAlbums: async (query) => {
    // iTunes requires JSONP for client-side cross-origin requests usually, 
    // but we can try direct first. If CORS fails, we might need a proxy or Electron net.
    // However, in Electron renderer with webSecurity: false or via main process, it should work.
    // For now, let's assume standard axios works or we'll proxy through main process if needed.
    // Actually, iTunes API supports CORS.
    const response = await itunesClient.get('/search', {
      params: {
        term: query,
        media: 'music',
        entity: 'album',
        limit: 50,
      },
    });
    return response.data;
  },

  // Get Top Albums (iTunes RSS feed is better for "Popular" but search API "term" is required)
  // Workaround: Search for a common term or use RSS feed. 
  // Let's use RSS feed for "Popular" music.
  getTopAlbums: async (limit = 50) => {
    // Apple Music RSS Feed
    const rssUrl = `https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/albums.json`;
    const response = await axios.get(rssUrl);
    return response.data.feed.results;
  },

  // Get Album Details (Tracks)
  getAlbumDetails: async (collectionId) => {
    const response = await itunesClient.get('/lookup', {
      params: {
        id: collectionId,
        entity: 'song',
      },
    });
    return response.data;
  },

  // Helper to get high-res artwork
  getArtworkUrl: (url, size = 600) => {
    if (!url) return 'https://via.placeholder.com/600x600?text=No+Artwork';
    return url.replace('100x100', `${size}x${size}`);
  }
};
