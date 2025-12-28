import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MediaGrid from './components/MediaGrid';
import DetailView from './components/DetailView';
import QualitySelector from './components/QualitySelector';
import { tmdb } from './services/tmdb';
import { itunes } from './services/itunes';
import { favorites } from './services/favorites';
import { getElectron } from './utils/electron';

function App() {
  // UI State
  const [category, setCategory] = useState('movie'); // 'movie', 'tv', 'music'
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamType, setStreamType] = useState('video'); // 'audio' or 'video'
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [downloading, setDownloading] = useState(false);
  
  // Playlist Playback State
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [playlistQueue, setPlaylistQueue] = useState([]);
  const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);
  
  // Quality Selection State
  const [torrentOptions, setTorrentOptions] = useState(null);
  const [pendingMetadata, setPendingMetadata] = useState(null);

  const electron = getElectron();
  
  // Listen for torrent progress updates - use DOM manipulation to avoid re-renders
  useEffect(() => {
    let cleanup = null;
    
    // Try direct require (works with nodeIntegration: true, contextIsolation: false)
    try {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        const handler = (event, progress) => {
          const statsDiv = document.getElementById('progress-stats');
          if (statsDiv) {
            const unit = progress.downloadUnit || 'MB';
            const sizeDisplay = progress.totalSize ? `${progress.downloaded} ${unit} / ${progress.totalSize} MB` : `${progress.downloaded} ${unit}`;
            statsDiv.innerHTML = `
              <p class="text-green-400 text-sm font-mono">${progress.peers} peers • ${progress.speed} KB/s</p>
              <p class="text-gray-400 text-sm font-mono">${sizeDisplay}</p>
            `;
          }
        };
        ipcRenderer.on('torrent-progress', handler);
        cleanup = () => ipcRenderer.removeListener('torrent-progress', handler);
      }
    } catch (e) {
      console.log('Could not set up progress listener:', e.message);
    }
    
    return () => { if (cleanup) cleanup(); };
  }, []);

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
      // Handle Favorites Filter
      if (sortBy === 'favorites' && !searchQuery) {
        const favs = favorites.getFavorites(category);
        setItems(favs);
        setLoading(false);
        return;
      }

      if (category === 'music') {
        let results = [];
        if (searchQuery) {
          const data = await itunes.searchAlbums(searchQuery);
          results = data.results || [];
        } else {
          results = await itunes.getTopAlbums();
        }
        // Map iTunes ID to standard 'id' for list rendering
        results = results.map(item => ({ ...item, id: item.collectionId || item.id }));
        
        // Deduplicate
        const uniqueItems = Array.from(new Map(results.map(item => [item.id, item])).values());
        setItems(uniqueItems);
      } else {
        // Fetch 5 pages (~100 items) in parallel
        const pages = [1, 2, 3, 4, 5];
        let promises;

        if (searchQuery) {
          promises = pages.map(page => 
            category === 'movie' 
              ? tmdb.searchMovies(searchQuery, page)
              : tmdb.searchTV(searchQuery, page)
          );
        } else {
          const apiSort = getSortParam(sortBy, category);
          promises = pages.map(page => 
            category === 'movie'
              ? tmdb.discoverMovies(apiSort, page)
              : tmdb.discoverTV(apiSort, page)
          );
        }

        const results = await Promise.all(promises);
        
        // Combine all pages and remove duplicates by ID
        const allItems = results.flatMap(data => data.results || []);
        const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

        setItems(uniqueItems);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      setStatus('Failed to load content');
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
    console.log('handlePlay called with:', metadata);
    
    if (!electron) {
      console.warn('Electron IPC not available - running in browser mode');
      setSelectedItem(null);
      setStatus('Error: Desktop App required for streaming. Please run the Electron app.');
      return;
    }

    setSelectedItem(null); // Close detail view
    setLoading(true);
    setStatus(`Searching for sources: ${metadata.title}...`);

    try {
      // 1. Construct Search Query
      let query = '';
      let displayTitle = metadata.title;
      if (metadata.type === 'movie') {
        query = `${metadata.title} ${metadata.year}`;
      } else {
        const s = metadata.season.toString().padStart(2, '0');
        const e = metadata.episode.toString().padStart(2, '0');
        query = `${metadata.title} S${s}E${e}`;
        displayTitle = `${metadata.title} S${s}E${e}`;
      }

      console.log('Resolving Torrent for:', query);

      // 2. Search Torrents
      const torrents = await electron.searchTorrents(query);
      
      if (!torrents || torrents.length === 0) {
        throw new Error('No torrents found for this title.');
      }

      // 3. Show Quality Selector
      setLoading(false);
      setStatus('');
      setPendingMetadata({ ...metadata, displayTitle });
      setTorrentOptions(torrents);

    } catch (err) {
      console.error(err);
      setStatus(`Playback Failed: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle Quality Selection
  const handleQualitySelect = async (torrent) => {
    setTorrentOptions(null);
    setLoading(true);
    setStatus(`Starting stream: ${torrent.title} (${torrent.seeds} seeds)...`);

    try {
      const streamInfo = await electron.startStream(torrent.magnet);
      setStreamUrl(streamInfo.url);
      setStreamType(streamInfo.fileType || 'video');
      setStatus(`Now Playing: ${pendingMetadata?.displayTitle || pendingMetadata?.title}`);
    } catch (err) {
      console.error(err);
      setStatus(`Playback Failed: ${err.message}`);
      setLoading(false);
    }
    setPendingMetadata(null);
  };

  // Handle Download Active File
  const handleDownload = async () => {
    if (!electron || !electron.downloadActiveFile) return;
    
    setDownloading(true);
    try {
      const result = await electron.downloadActiveFile();
      if (result.success) {
        setStatus(`Download complete: ${result.path}`);
      } else if (result.cancelled) {
        setStatus('Download cancelled');
      }
    } catch (err) {
      console.error('Download failed:', err);
      setStatus(`Download failed: ${err.message}`);
    }
    setDownloading(false);
  };

  // Handle Playlist Playback Logic
  const playNextInQueue = async (queue) => {
    if (!queue || queue.length === 0) {
      setIsPlaylistPlaying(false);
      setActivePlaylist(null);
      setPlaylistQueue([]);
      setStreamUrl(null);
      setStatus('Playlist finished');
      setLoading(false);
      return;
    }

    const nextItem = queue[0];
    const remainingQueue = queue.slice(1);
    setPlaylistQueue(remainingQueue);

    const trackName = nextItem.trackName || nextItem.collectionName || nextItem.title || nextItem.name;
    setStatus(`Playlist: Searching for "${trackName}"...`);
    setLoading(true);

    try {
      // For music, search for the album/artist
      const query = `${nextItem.artistName || ''} ${nextItem.collectionName || nextItem.title || ''}`.trim();
      console.log('[Playlist] Searching:', query);
      const torrents = await electron.searchTorrents(query);
      
      console.log('[Playlist] Found torrents:', torrents?.length, torrents?.slice(0, 2));
      
      if (!torrents || torrents.length === 0) {
        console.warn(`No sources found for ${trackName}, skipping...`);
        setStatus(`Skipping "${trackName}" - no sources found`);
        setTimeout(() => playNextInQueue(remainingQueue), 1500);
        return;
      }

      // Filter out only torrents with clearly invalid dummy magnet hashes
      const validTorrents = torrents.filter(t => {
        if (!t.magnet) return false;
        // Only reject the dummy hash pattern
        if (t.magnet.includes('0000000000000000000000000000000000000000')) return false;
        return true;
      });

      console.log('[Playlist] Valid torrents after filter:', validTorrents?.length);

      if (validTorrents.length === 0) {
        console.warn(`No valid torrents for ${trackName}, skipping...`);
        setStatus(`Skipping "${trackName}" - no valid sources`);
        setTimeout(() => playNextInQueue(remainingQueue), 1500);
        return;
      }

      // Try torrents in order until one works
      let streamStarted = false;
      for (const torrent of validTorrents.slice(0, 3)) { // Try up to 3 torrents
        try {
          console.log('[Playlist] Trying torrent:', torrent.title, torrent.seeds);
          setStatus(`Playlist: Connecting to "${trackName}"...`);
          const streamInfo = await electron.startStream(torrent.magnet, trackName);
          setStreamUrl(streamInfo.url);
          setStreamType('audio');
          setStatus(`Playlist Playing: ${trackName}`);
          setLoading(false);
          streamStarted = true;
          break;
        } catch (torrentErr) {
          console.warn(`Torrent failed for ${trackName}:`, torrentErr.message);
          // Continue to next torrent
        }
      }

      if (!streamStarted) {
        console.warn(`All torrents failed for ${trackName}, skipping...`);
        setStatus(`Skipping "${trackName}" - connection failed`);
        setTimeout(() => playNextInQueue(remainingQueue), 1500);
      }
    } catch (err) {
      console.error('Playlist playback error:', err);
      setStatus(`Skipping "${trackName}" - error occurred`);
      setTimeout(() => playNextInQueue(remainingQueue), 1500);
    }
  };

  const handlePlaylistSelect = (playlistName) => {
    if (isPlaylistPlaying && activePlaylist === playlistName) {
      // Stop playing if same playlist clicked
      if (electron && electron.stopStream) electron.stopStream();
      setIsPlaylistPlaying(false);
      setActivePlaylist(null);
      setPlaylistQueue([]);
      setStreamUrl(null);
      return;
    }

    const playlistItems = favorites.getFavorites('music', playlistName);
    if (!playlistItems || playlistItems.length === 0) {
      setStatus(`Playlist "${playlistName}" is empty. Add some favorites first!`);
      return;
    }

    // Shuffle and start
    const shuffled = [...playlistItems].sort(() => Math.random() - 0.5);
    setActivePlaylist(playlistName);
    setIsPlaylistPlaying(true);
    playNextInQueue(shuffled);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-red-500 selection:text-white">
      <Navbar 
        onSearch={handleSearch} 
        onCategoryChange={handleCategoryChange}
        activeCategory={category}
        onSortChange={handleSortChange}
        activeSort={sortBy}
        activePlaylist={activePlaylist}
        onPlaylistSelect={handlePlaylistSelect}
        isPlaylistPlaying={isPlaylistPlaying}
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
          <div className="fixed inset-0 z-[300] bg-black flex flex-col justify-center group">
            {/* Buffering Spinner Overlay - uses DOM manipulation to avoid re-renders */}
            <div id="video-loading" className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600 mx-auto mb-4"></div>
                <p className="text-white text-lg">Buffering stream...</p>
                <div id="progress-stats" className="mt-3 space-y-1">
                  <p className="text-gray-400 text-sm">Connecting to peers...</p>
                </div>
              </div>
            </div>

            {streamType === 'audio' ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                    <svg className="w-24 h-24 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-4">{status.replace('Now Playing: ', '')}</h2>
                  
                  <div className="flex flex-col items-center space-y-6">
                    <audio
                      key={streamUrl}
                      src={streamUrl}
                      controls
                      autoPlay
                      className="w-full max-w-md mx-auto"
                      onCanPlay={(e) => {
                        const loader = document.getElementById('video-loading');
                        if (loader) loader.style.display = 'none';
                      }}
                      onWaiting={(e) => {
                        const loader = document.getElementById('video-loading');
                        if (loader) loader.style.display = 'flex';
                      }}
                      onPlaying={(e) => {
                        const loader = document.getElementById('video-loading');
                        if (loader) loader.style.display = 'none';
                      }}
                      onError={(e) => {
                        const loader = document.getElementById('video-loading');
                        if (loader) loader.style.display = 'flex';
                        const statsDiv = document.getElementById('progress-stats');
                        if (statsDiv) {
                          statsDiv.innerHTML = `<p class="text-red-400 text-sm">Error loading media: ${e.target.error?.message || 'Unknown error'}</p>`;
                        }
                      }}
                      onEnded={() => {
                        if (isPlaylistPlaying) {
                          playNextInQueue(playlistQueue);
                        }
                      }}
                    />

                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-full font-bold transition-all ${
                        downloading 
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                          : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:scale-105 active:scale-95'
                      }`}
                    >
                      {downloading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      )}
                      <span>{downloading ? 'Downloading...' : 'Download Song'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <video 
                key={streamUrl}
                src={streamUrl} 
                controls 
                autoPlay 
                className="w-full h-full max-h-screen"
                onCanPlay={(e) => {
                  const loader = document.getElementById('video-loading');
                  if (loader) loader.style.display = 'none';
                }}
                onWaiting={(e) => {
                  const loader = document.getElementById('video-loading');
                  if (loader) loader.style.display = 'flex';
                }}
                onPlaying={(e) => {
                  const loader = document.getElementById('video-loading');
                  if (loader) loader.style.display = 'none';
                }}
                onError={(e) => {
                  const loader = document.getElementById('video-loading');
                  if (loader) loader.style.display = 'flex';
                  const statsDiv = document.getElementById('progress-stats');
                  if (statsDiv) {
                    statsDiv.innerHTML = `<p class="text-red-400 text-sm">Error loading media: ${e.target.error?.message || 'Unknown error'}</p>`;
                  }
                }}
              />
            )}

            {/* Close button - small X, visible on hover */}
            <button 
              onClick={() => {
                // Stop torrent and cleanup
                if (electron && electron.stopStream) {
                  electron.stopStream();
                }
                setStreamUrl(null);
                setLoading(false);
                setIsPlaylistPlaying(false);
                setActivePlaylist(null);
                setPlaylistQueue([]);
              }}
              className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
              title="Stop Playback"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Main Grid */}
        <MediaGrid 
          items={items} 
          loading={loading && !streamUrl} 
          onSelect={setSelectedItem} 
          type={category}
        />
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <DetailView 
          item={selectedItem} 
          type={category}
          onClose={() => {
            // Stop any active torrent when closing detail view
            if (electron && electron.stopStream) {
              electron.stopStream();
            }
            setSelectedItem(null);
            
            // Force a check of favorites/history in the grid
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('favorites-updated'));
              window.dispatchEvent(new CustomEvent('history-updated'));
            }, 50);
            
            // Refresh grid if we are viewing favorites (in case item was removed)
            if (sortBy === 'favorites') {
              loadContent();
            }
          }}
          onPlay={handlePlay}
          onStreamStart={(url, title, type) => {
            setStreamUrl(url);
            setStreamType(type || 'video');
            setStatus(`Now Playing: ${title}`);
          }}
        />
      )}

      {/* Quality Selector Modal */}
      {torrentOptions && (
        <QualitySelector
          torrents={torrentOptions}
          title={pendingMetadata?.displayTitle || pendingMetadata?.title}
          onSelect={handleQualitySelect}
          onClose={() => {
            setTorrentOptions(null);
            setPendingMetadata(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
