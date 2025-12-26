import React, { useState, useEffect } from 'react';
import { tmdb } from '../services/tmdb';
import { getBannerUrls } from '../config/banners';

// Helper to get Electron IPC
const getElectron = () => {
  if (window.electron) return window.electron;
  if (window.require) {
    try {
      const { ipcRenderer } = window.require('electron');
      return {
        searchTorrents: (q) => ipcRenderer.invoke('search-torrents', q),
        startStream: (m) => ipcRenderer.invoke('start-stream', m)
      };
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Helper to categorize torrent quality
const getQuality = (title) => {
  const t = title.toLowerCase();
  if (t.includes('2160p') || t.includes('4k') || t.includes('uhd')) return '4K';
  if (t.includes('1080p') || t.includes('1080')) return '1080p';
  if (t.includes('720p') || t.includes('720')) return '720p';
  if (t.includes('480p') || t.includes('480')) return '480p';
  if (t.includes('hdtv') || t.includes('hdrip')) return 'HD';
  return 'SD';
};

const getQualityColor = (quality) => {
  const colors = {
    '4K': 'bg-purple-600 hover:bg-purple-700',
    '1080p': 'bg-green-600 hover:bg-green-700',
    '720p': 'bg-blue-600 hover:bg-blue-700',
    '480p': 'bg-yellow-600 hover:bg-yellow-700',
    'HD': 'bg-teal-600 hover:bg-teal-700',
    'SD': 'bg-gray-600 hover:bg-gray-700'
  };
  return colors[quality] || colors['SD'];
};

// Group torrents by quality, pick best per quality
const groupByQuality = (torrents) => {
  const groups = {};
  torrents.forEach(t => {
    const q = getQuality(t.title);
    if (!groups[q] || (t.seeds || 0) > (groups[q].seeds || 0)) {
      groups[q] = t;
    }
  });
  const priority = { '4K': 5, '1080p': 4, '720p': 3, 'HD': 2, '480p': 1, 'SD': 0 };
  return Object.entries(groups)
    .map(([quality, torrent]) => ({ quality, torrent, seeds: torrent.seeds || 0 }))
    .sort((a, b) => (priority[b.quality] || 0) - (priority[a.quality] || 0));
};

const DetailView = ({ item, type, onClose, onPlay, onStreamStart }) => {
  const [details, setDetails] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Inline quality selection state (TV episodes)
  const [expandedEpisode, setExpandedEpisode] = useState(null);
  const [episodeTorrents, setEpisodeTorrents] = useState({});
  const [loadingTorrents, setLoadingTorrents] = useState(null);
  const [streamingStatus, setStreamingStatus] = useState('');
  
  // Movie quality selection state
  const [movieTorrents, setMovieTorrents] = useState(null);
  const [loadingMovieTorrents, setLoadingMovieTorrents] = useState(false);
  
  const electron = getElectron();
  const banners = getBannerUrls();

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        if (type === 'movie') {
          const data = await tmdb.getMovieDetails(item.id);
          setDetails(data);
          
          // Immediately fetch movie torrents
          if (electron) {
            setLoadingMovieTorrents(true);
            try {
              const movieYear = new Date(data.release_date).getFullYear();
              const query = `${data.title} ${movieYear}`;
              const torrents = await electron.searchTorrents(query);
              setMovieTorrents(torrents || []);
            } catch (err) {
              console.error('Failed to fetch movie torrents:', err);
              setMovieTorrents([]);
            }
            setLoadingMovieTorrents(false);
          }
        } else {
          const data = await tmdb.getTVDetails(item.id);
          setDetails(data);
          
          // Sort seasons: Specials (0) first, then newest to oldest
          const sortedSeasons = (data.seasons || []).sort((a, b) => {
            // Keep Specials (season 0) at the start
            if (a.season_number === 0) return -1;
            if (b.season_number === 0) return 1;
            // Otherwise sort descending (newest first)
            return b.season_number - a.season_number;
          });
          setSeasons(sortedSeasons);
          
          if (sortedSeasons.length > 0) {
            // Default to most recent season (highest number, not specials)
            const regularSeasons = sortedSeasons.filter(s => s.season_number > 0);
            const mostRecent = regularSeasons.length > 0 ? regularSeasons[0] : sortedSeasons[0];
            setSelectedSeason(mostRecent?.season_number || 1);
          }
        }
      } catch (error) {
        console.error('Failed to fetch details', error);
      }
      setLoading(false);
    };

    fetchDetails();
  }, [item.id, type]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (type === 'tv' && selectedSeason) {
        try {
          const data = await tmdb.getTVSeason(item.id, selectedSeason);
          setEpisodes(data.episodes || []);
        } catch (error) {
          console.error('Failed to fetch episodes', error);
        }
      }
    };

    fetchEpisodes();
  }, [item.id, type, selectedSeason]);

  if (loading || !details) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const backdropUrl = tmdb.getImageUrl(details.backdrop_path, 'original');
  const posterUrl = tmdb.getImageUrl(details.poster_path);
  const year = new Date(details.release_date || details.first_air_date).getFullYear();

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900 overflow-y-auto">
      {/* Sticky Header with Banners and Nav */}
      <div className="sticky top-0 z-[210] w-full flex flex-col">
        {/* Ad Banners Row */}
        <div className="grid grid-cols-2 bg-black h-[100px] w-full">
          <iframe 
            src={banners.column1}
            className="w-full h-full border-0"
            title="Ad Banner 1"
            scrolling="no"
          />
          <iframe 
            src={banners.column2}
            className="w-full h-full border-0"
            title="Ad Banner 2"
            scrolling="no"
          />
        </div>

        {/* Navigation Bar with Close Button */}
        <nav className="bg-gray-900 text-white p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-bold text-red-600">PopcornTime SS</span>
              <span className="text-white text-sm font-normal tracking-wide">(SuperSized)</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-red-500 bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="relative h-[50vh]">
        <div className="absolute inset-0">
          <img 
            src={backdropUrl} 
            alt="backdrop" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8 flex items-end">
          <img 
            src={posterUrl} 
            alt="poster" 
            className="w-48 rounded-lg shadow-2xl hidden md:block mr-8"
          />
          <div className="flex-1 text-white">
            <h1 className="text-4xl font-bold mb-2">{details.title || details.name} <span className="text-gray-400 font-normal">({year})</span></h1>
            <div className="flex items-center space-x-4 mb-4 text-sm">
              <span className="text-green-400">{details.vote_average?.toFixed(1)} Match</span>
              <span>{details.runtime ? `${details.runtime}m` : ''}</span>
              <span>{details.genres?.map(g => g.name).join(', ')}</span>
            </div>
            <p className="text-gray-300 max-w-2xl text-lg line-clamp-3 mb-6">{details.overview}</p>
            
            {type === 'movie' && (
              <div className="mt-2">
                {!electron ? (
                  <div className="text-yellow-500 text-sm">Desktop App required for streaming.</div>
                ) : loadingMovieTorrents ? (
                  <div className="flex items-center space-x-2 text-gray-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-600"></div>
                    <span>Searching for sources...</span>
                  </div>
                ) : movieTorrents && movieTorrents.length === 0 ? (
                  <div className="text-gray-500">No sources found for this movie.</div>
                ) : movieTorrents ? (
                  <div className="flex flex-wrap gap-2">
                    {groupByQuality(movieTorrents).map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          setStreamingStatus(`Starting stream: ${opt.torrent.title}...`);
                          try {
                            const streamInfo = await electron.startStream(opt.torrent.magnet);
                            if (onStreamStart) {
                              onStreamStart(streamInfo.url, details.title);
                            }
                          } catch (err) {
                            setStreamingStatus(`Playback failed: ${err.message}`);
                          }
                        }}
                        className={`${getQualityColor(opt.quality)} text-white px-4 py-2 rounded font-semibold flex items-center space-x-2 transition-all`}
                      >
                        <span>{opt.quality}</span>
                        <span className="opacity-70">•</span>
                        <span className="text-green-300 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          {opt.seeds}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {streamingStatus && type === 'movie' && (
                  <div className="mt-3 text-gray-400 text-sm">{streamingStatus}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episodes Section (TV Only) */}
      {type === 'tv' && (
        <div className="container mx-auto p-8">
          <div className="flex items-center space-x-4 mb-6 overflow-x-auto pb-4">
            {seasons.map(season => (
              <button
                key={season.id}
                onClick={() => setSelectedSeason(season.season_number)}
                className={`px-4 py-2 rounded whitespace-nowrap ${
                  selectedSeason === season.season_number 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {season.name}
              </button>
            ))}
          </div>

          {/* Status Message */}
          {streamingStatus && (
            <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm rounded mb-4 flex justify-between items-center">
              <span>{streamingStatus}</span>
              <button onClick={() => setStreamingStatus('')} className="hover:text-white">&times;</button>
            </div>
          )}

          <div className="space-y-4">
            {[...episodes].reverse().map(episode => {
              const epKey = `${selectedSeason}-${episode.episode_number}`;
              const isExpanded = expandedEpisode === epKey;
              const torrents = episodeTorrents[epKey];
              const isLoadingThis = loadingTorrents === epKey;
              const qualityOptions = torrents ? groupByQuality(torrents) : [];

              const handleEpisodeClick = async () => {
                if (isExpanded) {
                  setExpandedEpisode(null);
                  return;
                }
                
                setExpandedEpisode(epKey);
                
                // If already fetched, don't refetch
                if (episodeTorrents[epKey]) return;
                
                if (!electron) {
                  setStreamingStatus('Desktop App required for streaming.');
                  return;
                }
                
                setLoadingTorrents(epKey);
                try {
                  const s = selectedSeason.toString().padStart(2, '0');
                  const e = episode.episode_number.toString().padStart(2, '0');
                  const query = `${details.name} S${s}E${e}`;
                  const results = await electron.searchTorrents(query);
                  setEpisodeTorrents(prev => ({ ...prev, [epKey]: results || [] }));
                } catch (err) {
                  console.error('Torrent search failed:', err);
                  setEpisodeTorrents(prev => ({ ...prev, [epKey]: [] }));
                }
                setLoadingTorrents(null);
              };

              const handleQualitySelect = async (torrent) => {
                if (!electron) {
                  setStreamingStatus('Desktop App required for streaming.');
                  return;
                }
                
                setStreamingStatus(`Starting stream: ${torrent.title}...`);
                try {
                  const streamInfo = await electron.startStream(torrent.magnet);
                  // Call parent to handle stream URL
                  if (onStreamStart) {
                    onStreamStart(streamInfo.url, `${details.name} S${selectedSeason}E${episode.episode_number}`);
                  }
                } catch (err) {
                  setStreamingStatus(`Playback failed: ${err.message}`);
                }
              };

              return (
                <div key={episode.id} className="bg-gray-800 rounded overflow-hidden border border-transparent hover:border-gray-600 transition-all">
                  {/* Episode Row */}
                  <div 
                    className="p-4 flex items-center cursor-pointer hover:bg-gray-700 transition-all"
                    onClick={handleEpisodeClick}
                  >
                    <div className="w-8 text-gray-500">{episode.episode_number}</div>
                    <div className="w-32 aspect-video bg-gray-900 rounded mr-4 overflow-hidden relative flex-shrink-0">
                      {episode.still_path ? (
                        <img 
                          src={tmdb.getImageUrl(episode.still_path, 'w300')} 
                          alt={episode.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-bold truncate">{episode.name}</h4>
                      <p className="text-gray-400 text-sm line-clamp-1">{episode.overview}</p>
                    </div>
                    <div className="text-gray-500 text-sm ml-4 flex-shrink-0">
                      {episode.runtime ? `${episode.runtime}m` : ''}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Quality Options */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-gray-850 border-t border-gray-700">
                      {isLoadingThis ? (
                        <div className="flex items-center space-x-2 text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                          <span className="text-sm">Searching for sources...</span>
                        </div>
                      ) : qualityOptions.length === 0 ? (
                        <div className="text-gray-500 text-sm">No sources found for this episode.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {qualityOptions.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQualitySelect(opt.torrent);
                              }}
                              className={`${getQualityColor(opt.quality)} text-white px-3 py-2 rounded text-sm font-semibold flex items-center space-x-2 transition-all`}
                            >
                              <span>{opt.quality}</span>
                              <span className="opacity-70">•</span>
                              <span className="text-green-300 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                {opt.seeds}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailView;
