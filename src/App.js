import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MediaGrid from './components/MediaGrid';
import DetailView from './components/DetailView';
import { tmdb } from './services/tmdb';

// Helper to get Electron IPC
const getIpcRenderer = () => {
  if (window.electron) return window.electron; // Preload method
  if (window.require) {
    try {
      const { ipcRenderer } = window.require('electron');
      return {
        searchTorrents: (q) => ipcRenderer.invoke('search-torrents', q),
        startStream: (m) => ipcRenderer.invoke('start-stream', m)
      };
    } catch (e) {
      console.error('Failed to require electron:', e);
    }
  }
  return null;
};

function App() {
  // UI State
  const [category, setCategory] = useState('movie'); // 'movie' or 'tv'
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity');

  const electron = getIpcRenderer();

  // Helper to get API sort value
  const getSortParam = (sortKey, type) => {
    const map = {
      popularity: 'popularity.desc',
      rating: 'vote_average.desc',
      alphabetical: type === 'movie' ? 'original_title.asc' : 'original_name.asc',
      newest: type === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc'
    };
    return map[sortKey] || 'popularity.desc';
  };

  // Load Content
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (searchQuery) {
        data = category === 'movie' 
          ? await tmdb.searchMovies(searchQuery)
          : await tmdb.searchTV(searchQuery);
      } else {
        const apiSort = getSortParam(sortBy, category);
        data = category === 'movie'
          ? await tmdb.discoverMovies(apiSort)
          : await tmdb.discoverTV(apiSort);
      }
      setItems(data.results || []);
    } catch (error) {
      console.error('Failed to load content:', error);
      setStatus('Failed to load content from TMDB');
    }
    setLoading(false);
  }, [category, searchQuery, sortBy]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Search Handler
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Sort Handler
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
  };

  // Category Handler
  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setSearchQuery(''); // Clear search when switching tabs
  };

  // The Magic: Resolve Metadata -> Torrent -> Stream
  const handlePlay = async (metadata) => {
    if (!electron) {
      setStatus('Error: Desktop App required for streaming.');
      return;
    }

    setSelectedItem(null); // Close detail view
    setLoading(true);
    setStatus(`Searching for sources: ${metadata.title}...`);

    try {
      // 1. Construct Search Query
      let query = '';
      if (metadata.type === 'movie') {
        query = `${metadata.title} ${metadata.year}`;
      } else {
        // Format: Show Name S01E01
        const s = metadata.season.toString().padStart(2, '0');
        const e = metadata.episode.toString().padStart(2, '0');
        query = `${metadata.title} S${s}E${e}`;
      }

      console.log('Resolving Torrent for:', query);

      // 2. Search Torrents
      const torrents = await electron.searchTorrents(query);
      
      if (!torrents || torrents.length === 0) {
        throw new Error('No torrents found for this title.');
      }

      // 3. Pick Best Torrent (Most Seeds)
      // Logic: Sort by seeds, take top 1.
      const bestMatch = torrents.sort((a, b) => b.seeds - a.seeds)[0];
      
      setStatus(`Found source: ${bestMatch.title} (${bestMatch.seeds} seeds). Starting stream...`);

      // 4. Start Stream
      const streamInfo = await electron.startStream(bestMatch.magnet);
      setStreamUrl(streamInfo.url);
      setStatus(`Now Playing: ${metadata.title}`);

    } catch (err) {
      console.error(err);
      setStatus(`Playback Failed: ${err.message}`);
      setLoading(false);
      // Re-open detail view so user isn't lost? 
      // For now, let's just stay on grid but show error
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-red-500 selection:text-white">
      <Navbar 
        onSearch={handleSearch} 
        onCategoryChange={handleCategoryChange}
        activeCategory={category}
        onSortChange={handleSortChange}
        activeSort={sortBy}
      />

      <div className="container mx-auto">
        {/* Status Bar */}
        {status && (
          <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm border-b border-gray-700 flex justify-between items-center">
            <span>{status}</span>
            <button onClick={() => setStatus('')} className="hover:text-white">&times;</button>
          </div>
        )}

        {/* Video Player Overlay */}
        {streamUrl && (
          <div className="fixed inset-0 z-[60] bg-black flex flex-col justify-center">
            <video 
              src={streamUrl} 
              controls 
              autoPlay 
              className="w-full h-full max-h-screen"
            />
            <button 
              onClick={() => {
                setStreamUrl(null);
                setLoading(false);
              }}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold"
            >
              Stop Playback
            </button>
          </div>
        )}

        {/* Main Grid */}
        <MediaGrid 
          items={items} 
          loading={loading && !streamUrl} 
          onSelect={setSelectedItem} 
        />
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <DetailView 
          item={selectedItem} 
          type={category}
          onClose={() => setSelectedItem(null)}
          onPlay={handlePlay}
        />
      )}
    </div>
  );
}

export default App;
