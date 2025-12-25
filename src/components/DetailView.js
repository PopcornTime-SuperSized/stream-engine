import React, { useState, useEffect } from 'react';
import { tmdb } from '../services/tmdb';

const DetailView = ({ item, type, onClose, onPlay }) => {
  const [details, setDetails] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        if (type === 'movie') {
          const data = await tmdb.getMovieDetails(item.id);
          setDetails(data);
        } else {
          const data = await tmdb.getTVDetails(item.id);
          setDetails(data);
          setSeasons(data.seasons || []);
          if (data.seasons && data.seasons.length > 0) {
            // Find first season that isn't season 0 (specials) usually
            const firstSeason = data.seasons.find(s => s.season_number > 0) || data.seasons[0];
            setSelectedSeason(firstSeason?.season_number || 1);
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
      {/* Hero Section */}
      <div className="relative h-[60vh]">
        <div className="absolute inset-0">
          <img 
            src={backdropUrl} 
            alt="backdrop" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
        </div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-red-500 z-10 bg-black/50 rounded-full p-2"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

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
              <button 
                onClick={() => onPlay({
                  title: details.title,
                  year: year,
                  type: 'movie'
                })}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold text-lg flex items-center transition"
              >
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Watch Now
              </button>
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

          <div className="space-y-4">
            {episodes.map(episode => (
              <div 
                key={episode.id}
                className="bg-gray-800 p-4 rounded flex items-center hover:bg-gray-750 transition group cursor-pointer"
                onClick={() => onPlay({
                  title: details.name,
                  year: year,
                  type: 'tv',
                  season: selectedSeason,
                  episode: episode.episode_number,
                  episodeTitle: episode.name
                })}
              >
                <div className="w-8 text-gray-500">{episode.episode_number}</div>
                <div className="w-32 aspect-video bg-gray-900 rounded mr-4 overflow-hidden relative">
                  {episode.still_path ? (
                    <img 
                      src={tmdb.getImageUrl(episode.still_path, 'w300')} 
                      alt={episode.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700">No Image</div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold">{episode.name}</h4>
                  <p className="text-gray-400 text-sm line-clamp-2">{episode.overview}</p>
                </div>
                <div className="text-gray-500 text-sm">
                  {episode.runtime ? `${episode.runtime}m` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailView;
