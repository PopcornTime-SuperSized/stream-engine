import React, { useState, useEffect } from 'react';
import PlaylistModal from './PlaylistModal';
import { tmdb } from '../services/tmdb';
import { itunes } from '../services/itunes';
import { favorites } from '../services/favorites';
import { history } from '../services/history';
import { getBannerUrls } from '../config/banners';
import { getElectron } from '../utils/electron';
import { getQualityColor, groupAllByQuality } from '../utils/torrent';

const DetailView = ({ item, type, onClose, onPlay, onStreamStart }) => {
  const [details, setDetails] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [historyUpdate, setHistoryUpdate] = useState(0);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Inline quality selection state (TV episodes & Music tracks)
  const [expandedEpisode, setExpandedEpisode] = useState(null);
  const [episodeTorrents, setEpisodeTorrents] = useState({});
  const [loadingTorrents, setLoadingTorrents] = useState(null);
  const [streamingStatus, setStreamingStatus] = useState('');
  const [expandedTvQuality, setExpandedTvQuality] = useState(null); // For TV/Music dropdown
  
  // Movie quality selection state
  const [movieTorrents, setMovieTorrents] = useState(null);
  const [loadingMovieTorrents, setLoadingMovieTorrents] = useState(false);
  const [movieTorrentsFetched, setMovieTorrentsFetched] = useState(false);
  const [expandedQuality, setExpandedQuality] = useState(null); // For dropdown
  
  const electron = getElectron();
  const banners = getBannerUrls();

  useEffect(() => {
    if (item && type) {
      setIsFavorite(favorites.isFavorite(item.id, type));
      setIsWatched(history.isWatched(type, item.id));
    }
  }, [item, type, historyUpdate]);

  useEffect(() => {
    const fetchDetails = async () => {
      console.log('DetailView: fetchDetails called for type:', type, 'ID:', item.id, 'CollectionID:', item.collectionId);
      setLoading(true);
      try {
        if (type === 'movie') {
          const data = await tmdb.getMovieDetails(item.id);
          setDetails(data);
        } else if (type === 'tv') {
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
        } else if (type === 'music') {
          const collectionId = item.collectionId || item.id;
          console.log('Fetching album details for collectionId:', collectionId);
          const data = await itunes.getAlbumDetails(collectionId);
          const results = data.results || [];
          console.log('iTunes lookup results:', results.length);
          
          if (results.length > 0) {
            setDetails(results[0]); // Collection info
            // Map tracks to episode-like structure
            const tracks = results.slice(1).map(track => ({
              id: track.trackId,
              episode_number: track.trackNumber,
              name: track.trackName,
              overview: `${track.artistName} • ${((track.trackTimeMillis || 0) / 60000).toFixed(1)} min`,
              runtime: Math.round((track.trackTimeMillis || 0) / 60000),
              still_path: null // No per-track image usually
            }));
            setEpisodes(tracks);
          } else {
            console.warn('No album details found in iTunes lookup');
            // Fallback: use item data if lookup fails
            setDetails(item); 
          }
        }
      } catch (error) {
        console.error('Failed to fetch details', error);
        // Fallback to basic item data if fetch fails (especially for Music where list data is rich)
        if (!details && type === 'music') {
          console.log('Falling back to basic item data');
          setDetails(item);
        }
      }
      setLoading(false);
    };

    fetchDetails();
  }, [item, type]);

  // Fetch torrents (Movies & Music Albums)
  useEffect(() => {
    if ((type !== 'movie' && type !== 'music') || !details || !electron) return;
    if (movieTorrentsFetched) return; // Already fetched
    
    const fetchTorrents = async () => {
      setMovieTorrentsFetched(true);
      setLoadingMovieTorrents(true);
      
      let query;
      let category = 'All';

      if (type === 'movie') {
        const movieYear = new Date(details.release_date).getFullYear();
        query = `${details.title} ${movieYear}`;
        category = 'Movies';
      } else if (type === 'music') {
        query = `${details.artistName} ${details.collectionName}`;
        category = 'Audio';
      }
      
      try {
        const results = await electron.searchTorrents(query, category);
        setMovieTorrents(results || []);
      } catch (err) {
        console.error('Torrent search failed:', err);
        setMovieTorrents([]);
      }
      setLoadingMovieTorrents(false);
    };
    
    fetchTorrents();
  }, [type, details, electron, movieTorrentsFetched]);

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

  const isMusic = type === 'music';
  
  let backdropUrl, posterUrl, title, year, rating, runtime, genres, overview;
  
  if (isMusic) {
    // iTunes Metadata
    const artwork = details.artworkUrl100?.replace('100x100', '1000x1000');
    backdropUrl = artwork; // Use high-res artwork as backdrop
    posterUrl = artwork;
    title = details.collectionName;
    year = new Date(details.releaseDate).getFullYear();
    rating = null; // No rating
    runtime = null; // Album runtime not always available easily in top-level
    genres = [details.primaryGenreName];
    overview = details.copyright; // Use copyright as overview for albums
  } else {
    // TMDB Metadata
    backdropUrl = tmdb.getImageUrl(details.backdrop_path, 'original');
    posterUrl = tmdb.getImageUrl(details.poster_path);
    title = details.title || details.name;
    year = new Date(details.release_date || details.first_air_date).getFullYear();
    rating = details.vote_average;
    runtime = details.runtime; // Movies have runtime
    genres = details.genres?.map(g => g.name);
    overview = details.overview;
  }

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
            <div className="flex items-center">
              <span className="text-2xl font-bold text-red-600">PopcornTime<sup className="text-xs">X</sup></span>
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
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src={backdropUrl} 
            alt="backdrop" 
            className={`w-full h-full object-cover ${isMusic ? 'blur-xl scale-110 opacity-50' : ''}`} 
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
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-4xl font-bold">{title} <span className="text-gray-400 font-normal">({year})</span></h1>
              <button
                onClick={() => {
                  if (type === 'music') {
                    setShowPlaylistModal(true);
                  } else {
                    const newStatus = favorites.toggle(item, type);
                    setIsFavorite(newStatus);
                  }
                }}
                className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-white bg-gray-800'}`}
                title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <svg className="w-8 h-8" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

              {showPlaylistModal && (
                <PlaylistModal 
                  item={item} 
                  onClose={() => setShowPlaylistModal(false)}
                  onFavoriteUpdate={() => {
                    setIsFavorite(favorites.isFavorite(item.id, type));
                  }}
                />
              )}
              
              <button
                onClick={() => {
                  const newStatus = history.toggle(type, item.id);
                  setIsWatched(newStatus);
                  setHistoryUpdate(prev => prev + 1); // Trigger re-render for children that rely on history
                }}
                className={`p-2 rounded-full transition-colors group relative ${isWatched ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-white bg-gray-800'}`}
                title={type === 'music' ? (isWatched ? 'Heard!' : 'Mark as Heard') : (isWatched ? 'Watched!' : 'Mark as Watched')}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="absolute left-full ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {type === 'music' ? 'Heard!' : 'Watched!'}
                </span>
              </button>
            </div>
            <div className="flex items-center space-x-4 mb-4 text-sm">
              {rating && <span className="text-green-400">{rating.toFixed(1)} Match</span>}
              {runtime && <span>{runtime}m</span>}
              <span>{genres?.join(', ')}</span>
            </div>
            <p className="text-gray-300 max-w-2xl text-lg line-clamp-3 mb-6">{overview}</p>
            
            {type === 'movie' && (
              <div className="mt-2">
                {!electron ? (
                  <div className="text-yellow-500 text-sm">Desktop App required.</div>
                ) : loadingMovieTorrents ? (
                  <div className="flex items-center space-x-2 text-gray-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-600"></div>
                    <span>Searching for sources...</span>
                  </div>
                ) : movieTorrents && movieTorrents.length === 0 ? (
                  <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded inline-block">
                    No torrent sources found.
                  </div>
                ) : movieTorrents ? (
                  <div className="flex flex-wrap gap-2">
                    {groupAllByQuality(movieTorrents).map((group, idx) => (
                      <div key={idx} className="relative">
                        <button
                          onClick={() => setExpandedQuality(expandedQuality === group.quality ? null : group.quality)}
                          className={`${getQualityColor(group.quality)} text-white px-4 py-2 rounded font-semibold flex items-center space-x-2 transition-all`}
                        >
                          <span>{group.quality}</span>
                          <span className="opacity-70">•</span>
                          <span className="text-green-300 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            {group.bestSeeds}
                          </span>
                          <span className="text-xs opacity-70">({group.torrents.length})</span>
                          <svg className={`w-4 h-4 transition-transform ${expandedQuality === group.quality ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {expandedQuality === group.quality && (
                          <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-xl z-50 min-w-[300px] max-h-60 overflow-y-auto">
                            {group.torrents.map((torrent, tidx) => (
                              <button
                                key={tidx}
                                onClick={async () => {
                                  setExpandedQuality(null);
                                  
                                  // Movies: Start Stream
                                  setStreamingStatus(`Starting stream: ${torrent.title}...`);
                                  try {
                                    const streamInfo = await electron.startStream(torrent.magnet);
                                    if (onStreamStart) {
                                      onStreamStart(streamInfo.url, details.title, streamInfo.fileType);
                                      setStreamingStatus(''); // Clear status when video player opens
                                    }
                                  } catch (err) {
                                    setStreamingStatus(`Playback failed: ${err.message}`);
                                  }
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-0"
                              >
                                <div className="text-white text-sm truncate">{torrent.title}</div>
                                <div className="flex items-center space-x-3 text-xs mt-1">
                                  <span className="text-green-400">↑ {torrent.seeds || 0} seeds</span>
                                  <span className="text-red-400">↓ {torrent.peers || 0} peers</span>
                                  {torrent.size && <span className="text-gray-400">{torrent.size}</span>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
                {streamingStatus && (
                  <div className="mt-4 flex items-center space-x-3 bg-gray-800/80 px-4 py-3 rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-600"></div>
                    <div>
                      <p className="text-white text-sm font-medium">{streamingStatus}</p>
                      <p className="text-gray-500 text-xs">Connecting to peers and buffering...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episodes/Tracks Section */}
      {(type === 'tv' || type === 'music') && (
        <div className="container mx-auto p-8">
          {/* Season Selector (TV Only) */}
          {type === 'tv' && (
            <div className="flex items-center space-x-4 mb-6 overflow-x-auto pb-4">
              {seasons.map(season => {
                const isSeasonWatched = history.isWatched('tv', item.id, season.season_number);
                return (
                  <div key={season.id} className="relative group/season flex-shrink-0">
                    <button
                      onClick={() => setSelectedSeason(season.season_number)}
                      className={`px-4 py-2 rounded whitespace-nowrap pr-8 transition-colors ${
                        selectedSeason === season.season_number 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {season.name}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        history.toggle('tv', item.id, season.season_number);
                        setHistoryUpdate(prev => prev + 1);
                      }}
                      className={`absolute right-1 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
                        isSeasonWatched 
                          ? 'text-green-400 hover:text-green-300' 
                          : 'text-gray-600 hover:text-gray-400'
                      }`}
                      title={isSeasonWatched ? "Season Watched!" : "Mark Season as Watched"}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Status Message */}
          {streamingStatus && (
            <div className="bg-gray-800 text-gray-300 px-4 py-3 rounded mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-600"></div>
                <div>
                  <p className="text-white text-sm font-medium">{streamingStatus}</p>
                  <p className="text-gray-500 text-xs">Connecting to peers and buffering...</p>
                </div>
              </div>
              <button onClick={() => setStreamingStatus('')} className="hover:text-white text-gray-400">&times;</button>
            </div>
          )}

          <div className="space-y-4">
            {/* Availability Warning for Music */}
            {type === 'music' && !loadingMovieTorrents && (!movieTorrents || !movieTorrents.some(t => (t.seeds || 0) > 0)) && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
                No playable torrent sources found for this album (0 seeds).
              </div>
            )}

            {(type === 'music' ? episodes : [...episodes].reverse()).map(episode => {
              const epKey = type === 'music' ? `${episode.id}` : `${selectedSeason}-${episode.episode_number}`;
              const isExpanded = expandedEpisode === epKey;
              const torrents = episodeTorrents[epKey];
              const isLoadingThis = loadingTorrents === epKey;
              
              // Check availability for Music
              const isMusic = type === 'music';
              // Consider available only if we have torrents with at least 1 seed
              const albumHasSources = movieTorrents && movieTorrents.some(t => (t.seeds || 0) > 0);
              const isUnavailable = isMusic && !loadingMovieTorrents && !albumHasSources;

              // Check watched status
              const isEpWatched = type === 'music' 
                ? history.isWatched('music', item.id, null, episode.id)
                : history.isWatched('tv', item.id, selectedSeason, episode.episode_number);

              const handleEpisodeClick = async () => {
                if (isUnavailable) return;
                
                if (isExpanded) {
                  setExpandedEpisode(null);
                  return;
                }
                
                setExpandedEpisode(epKey);
                
                // If already fetched, don't refetch
                if (episodeTorrents[epKey]) return;
                
                // For Music, reuse the Album torrents we already fetched
                if (type === 'music') {
                  setEpisodeTorrents(prev => ({ ...prev, [epKey]: movieTorrents || [] }));
                  return;
                }
                
                if (!electron) {
                  setStreamingStatus('Desktop App required for streaming.');
                  return;
                }
                
                setLoadingTorrents(epKey);
                try {
                  const s = selectedSeason.toString().padStart(2, '0');
                  const e = episode.episode_number.toString().padStart(2, '0');
                  const query = `${details.name} S${s}E${e}`;
                  const results = await electron.searchTorrents(query, 'TV');
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
                  // For Music, pass the track name to target specific file
                  const fileName = type === 'music' ? episode.name : null;
                  const streamInfo = await electron.startStream(torrent.magnet, fileName);
                  
                  // Call parent to handle stream URL
                  if (onStreamStart) {
                    const label = type === 'music' 
                      ? `${details.artistName} - ${episode.name}`
                      : `${details.name} S${selectedSeason}E${episode.episode_number}`;
                    onStreamStart(streamInfo.url, label, streamInfo.fileType);
                    setStreamingStatus(''); // Clear status when video player opens
                  }
                } catch (err) {
                  setStreamingStatus(`Playback failed: ${err.message}`);
                }
              };

              return (
                <div key={episode.id} className={`bg-gray-800 rounded border border-transparent transition-all overflow-visible ${isUnavailable ? 'opacity-50' : 'hover:border-gray-600'}`}>
                  {/* Episode/Track Row */}
                  <div 
                    className={`p-4 flex items-center transition-all ${isUnavailable ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700'}`}
                    onClick={handleEpisodeClick}
                  >
                    <div className="w-8 text-gray-500">{episode.episode_number}</div>
                    <div className="w-16 aspect-square bg-gray-900 rounded mr-4 overflow-hidden relative flex-shrink-0">
                      {type === 'music' ? (
                        <img 
                          src={details.artworkUrl100?.replace('100x100', '200x200')} 
                          alt={details.collectionName}
                          className="w-full h-full object-cover"
                        />
                      ) : episode.still_path ? (
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

                    <div className="ml-4 flex-shrink-0 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          history.toggle(type === 'music' ? 'music' : 'tv', item.id, type === 'music' ? null : selectedSeason, type === 'music' ? episode.id : episode.episode_number);
                          setHistoryUpdate(prev => prev + 1);
                        }}
                        className={`p-1 rounded-full transition-colors group/check relative ${isEpWatched ? 'text-green-500' : 'text-gray-600 hover:text-green-500'}`}
                        title={type === 'music' ? (isEpWatched ? 'Heard!' : 'Mark as Heard') : (isEpWatched ? 'Watched!' : 'Mark as Watched')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="absolute right-full mr-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/check:opacity-100 transition-opacity whitespace-nowrap pointer-events-none top-1/2 transform -translate-y-1/2 z-50">
                          {type === 'music' ? (isEpWatched ? 'Heard!' : 'Mark as Heard') : (isEpWatched ? 'Watched!' : 'Mark as Watched')}
                        </span>
                      </button>
                    </div>

                    <div className="ml-4 flex-shrink-0">
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Quality Options */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-gray-850 border-t border-gray-700 overflow-visible">
                      {isLoadingThis ? (
                        <div className="flex items-center space-x-2 text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                          <span className="text-sm">Searching for sources...</span>
                        </div>
                      ) : !torrents || torrents.length === 0 ? (
                        <div className="text-gray-500 text-sm">No sources found for this episode.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {groupAllByQuality(torrents).map((group, idx) => (
                            <div key={idx} className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const key = `${epKey}-${group.quality}`;
                                  setExpandedTvQuality(expandedTvQuality === key ? null : key);
                                }}
                                className={`${getQualityColor(group.quality)} text-white px-3 py-2 rounded text-sm font-semibold flex items-center space-x-2 transition-all`}
                              >
                                <span>{group.quality}</span>
                                <span className="opacity-70">•</span>
                                <span className="text-green-300 flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                  {group.bestSeeds}
                                </span>
                                <span className="text-xs opacity-70">({group.torrents.length})</span>
                                <svg className={`w-3 h-3 transition-transform ${expandedTvQuality === `${epKey}-${group.quality}` ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              {expandedTvQuality === `${epKey}-${group.quality}` && (
                                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-xl z-[100] min-w-[280px] max-h-48 overflow-y-auto">
                                  {group.torrents.map((torrent, tidx) => (
                                    <button
                                      key={tidx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedTvQuality(null);
                                        handleQualitySelect(torrent);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-0"
                                    >
                                      <div className="text-white text-xs truncate">{torrent.title}</div>
                                      <div className="flex items-center space-x-3 text-xs mt-1">
                                        <span className="text-green-400">↑ {torrent.seeds || 0}</span>
                                        <span className="text-red-400">↓ {torrent.peers || 0}</span>
                                        {torrent.size && <span className="text-gray-400">{torrent.size}</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {streamingStatus && (
                        <div className="mt-3 flex items-center space-x-3 bg-gray-700/50 px-3 py-2 rounded-lg">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                          <div>
                            <p className="text-white text-sm">{streamingStatus}</p>
                            <p className="text-gray-500 text-xs">Connecting to peers and buffering...</p>
                          </div>
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
