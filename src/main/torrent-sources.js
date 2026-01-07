const TorrentSearchApi = require('torrent-search-api');

// Initialize providers - Eztv works reliably (Yts/others are often blocked)
TorrentSearchApi.enableProvider('Eztv');

console.log('[Torrent Sources] Initialized with Eztv provider');

// Transform torrent-search-api results to common format
function transformResults(results) {
  return (results || []).map(t => ({
    title: t.title || '',
    seeds: t.seeds || 0,
    peers: t.peers || 0,
    size: t.size || '',
    magnet: t.magnet || '',
    provider: t.provider || 'Unknown',
    time: t.time || ''
  }));
}

// Search for TV episodes
async function searchTV(showName, season, episode) {
  const s = String(season).padStart(2, '0');
  const e = String(episode).padStart(2, '0');
  const query = `${showName} S${s}E${e}`;
  
  console.log(`[TV Search] ${query}`);
  
  try {
    // Use 'All' category - 'TV' category often returns 0 results with Eztv
    const results = await TorrentSearchApi.search(query, 'All', 30);
    console.log(`[TV Search] Found ${results.length} results`);
    return transformResults(results);
  } catch (err) {
    console.error('[TV Search] Error:', err.message);
    return [];
  }
}

// Search for movies
async function searchMovie(title, year) {
  const query = year ? `${title} ${year}` : title;
  
  console.log(`[Movie Search] ${query}`);
  
  try {
    // Use 'All' category since 'Movies' often fails with available providers
    const results = await TorrentSearchApi.search(query, 'All', 30);
    console.log(`[Movie Search] Found ${results.length} results`);
    return transformResults(results);
  } catch (err) {
    console.error('[Movie Search] Error:', err.message);
    return [];
  }
}

// Main search function
async function searchTorrents(query, category = 'All', options = {}) {
  const { season, episode, year, type } = options;
  
  let results = [];
  
  try {
    // TV Show search
    if (type === 'tv' && season && episode) {
      results = await searchTV(query, season, episode);
    }
    // Movie search  
    else if (type === 'movie') {
      results = await searchMovie(query, year);
    }
    // Generic/fallback search
    else {
      console.log(`[Generic Search] ${query} in ${category}`);
      const raw = await TorrentSearchApi.search(query, category, 30);
      results = transformResults(raw);
      console.log(`[Generic Search] Found ${results.length} results`);
    }
  } catch (err) {
    console.error('[Search Error]', err.message);
  }
  
  // Sort by seeds descending
  results.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
  
  return results;
}

module.exports = {
  searchTorrents,
  searchTV,
  searchMovie
};
