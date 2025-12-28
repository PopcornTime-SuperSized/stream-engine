import React, { useState, useEffect } from 'react';
import { tmdb } from '../services/tmdb';
import { itunes } from '../services/itunes';
import { favorites } from '../services/favorites';
import { history } from '../services/history';

const MediaCard = ({ item, type, onClick }) => {
  // Determine if it's TMDB or iTunes content based on properties
  const isMusic = item.wrapperType === 'collection' || item.kind === 'album' || item.artistName;

  // Local state for immediate feedback
  const [isFav, setIsFav] = useState(() => type ? favorites.isFavorite(item.id, type) : false);
  const [isWatched, setIsWatched] = useState(() => type ? history.isWatched(type, item.id) : false);

  useEffect(() => {
    const checkStatus = () => {
      if (type) {
        const newFav = favorites.isFavorite(item.id, type);
        const newWatched = history.isWatched(type, item.id);
        // console.log(`[MediaCard] checkStatus for ${item.title}: Fav=${newFav}, Watched=${newWatched}`);
        setIsFav(newFav);
        setIsWatched(newWatched);
      }
    };

    checkStatus(); // Initial check

    // Listen for global updates (e.g. from DetailView)
    window.addEventListener('favorites-updated', checkStatus);
    window.addEventListener('history-updated', checkStatus);

    return () => {
      window.removeEventListener('favorites-updated', checkStatus);
      window.removeEventListener('history-updated', checkStatus);
    };
  }, [item, type]);

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (!type) return;
    const newState = favorites.toggle(item, type);
    setIsFav(newState);
  };

  const handleToggleWatched = (e) => {
    e.stopPropagation();
    if (!type) return;
    const newState = history.toggle(type, item.id);
    setIsWatched(newState);
  };

  let title, year, imageUrl, rating, subtitle;

  if (isMusic) {
    // iTunes Data
    title = item.collectionName || item.name;
    subtitle = item.artistName;
    const date = item.releaseDate;
    year = date ? new Date(date).getFullYear() : '';
    imageUrl = itunes.getArtworkUrl(item.artworkUrl100, 400);
    rating = null; 
  } else {
    // TMDB Data
    title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    year = releaseDate ? new Date(releaseDate).getFullYear() : '';
    imageUrl = tmdb.getImageUrl(item.poster_path);
    rating = item.vote_average;
    subtitle = null;
  }

  return (
    <div 
      className="group relative cursor-pointer transition-transform duration-200 hover:scale-105"
      onClick={() => onClick(item)}
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-xl relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Status Indicators - Interactive */}
        <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start pointer-events-none z-30">
          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md shadow-sm transition-all duration-200 ${
              isFav 
                ? 'bg-black/60 opacity-50 group-hover:opacity-100 hover:!opacity-100' 
                : 'bg-black/40 opacity-50 group-hover:opacity-100 hover:!opacity-100'
            }`}
            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
          >
            <svg 
              className={`w-5 h-5 ${isFav ? 'text-yellow-400' : 'text-white hover:text-white'}`} 
              fill={isFav ? "currentColor" : "none"} 
              stroke="currentColor" 
              strokeWidth={isFav ? 0 : 2}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
          
          {/* Watched Button */}
          <button
            onClick={handleToggleWatched}
            className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md shadow-sm transition-all duration-200 ml-auto ${
              isWatched 
                ? 'bg-black/60 opacity-50 group-hover:opacity-100 hover:!opacity-100' 
                : 'bg-black/40 opacity-50 group-hover:opacity-100 hover:!opacity-100'
            }`}
            title={
              isWatched 
                ? (isMusic ? "Mark as Unheard" : "Mark as Unwatched") 
                : (isMusic ? "Mark as Heard" : "Mark as Watched")
            }
          >
            <svg 
              className={`w-5 h-5 ${isWatched ? 'text-green-500' : 'text-white hover:text-white'}`} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
          <div className="bg-red-600 text-white rounded-full p-3 transform scale-0 group-hover:scale-100 transition-transform shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              {isMusic ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.5-4.5V7a1 1 0 011-1h3.5a1 1 0 011 1v2a1 1 0 01-1 1H10v3.5a1 1 0 01-1 1h-1z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              )}
            </svg>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <h3 className="text-white font-medium truncate text-sm">{title}</h3>
        {subtitle && <p className="text-gray-400 text-xs truncate">{subtitle}</p>}
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{year}</span>
          {rating && (
            <span className="flex items-center text-yellow-500">
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
