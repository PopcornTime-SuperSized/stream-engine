import React, { useState, useEffect } from 'react';
import { getBannerUrls } from '../config/banners';
import { favorites } from '../services/favorites';

const Navbar = ({ onSearch, onCategoryChange, activeCategory, onSortChange, activeSort, activePlaylist, onPlaylistSelect, isPlaylistPlaying }) => {
  const [query, setQuery] = useState('');
  const [playlists, setPlaylists] = useState([]);
  const [showMusicDropdown, setShowMusicDropdown] = useState(false);
  const banners = getBannerUrls();

  useEffect(() => {
    const updatePlaylists = () => {
      setPlaylists(favorites.getPlaylists('music'));
    };
    updatePlaylists();
    window.addEventListener('favorites-updated', updatePlaylists);
    return () => window.removeEventListener('favorites-updated', updatePlaylists);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const sortOptions = [
    { label: 'Popularity', value: 'popularity' },
    { label: 'A-Z', value: 'alphabetical' },
    { label: 'Rating', value: 'rating' },
    { label: 'Newest', value: 'newest' },
    { label: 'Favorites', value: 'favorites' }
  ];

  return (
    <div className="sticky top-0 z-[100] w-full flex flex-col">
      {/* Ad Banners Row */}
      <div className="grid grid-cols-2 bg-black h-[100px] w-full relative z-[100]">
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

      {/* Navigation Bar */}
      <nav className="bg-gray-900 text-white p-4 shadow-lg relative z-[101]">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            {/* Logo Section */}
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-red-600 leading-none">PopcornTime<sup className="text-xs">X</sup></span>
              <span className="text-[10px] text-gray-500 font-mono opacity-70">v0.5.20</span>
            </div>
            
            {/* Navigation Buttons */}
            <div className="hidden md:flex space-x-4 items-center">
              <button
                onClick={() => onCategoryChange('movie')}
                className={`px-3 py-2 rounded transition ${
                  activeCategory === 'movie' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => onCategoryChange('tv')}
                className={`px-3 py-2 rounded transition ${
                  activeCategory === 'tv' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                TV Shows
              </button>
              
              {/* Music with Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setShowMusicDropdown(true)}
                onMouseLeave={() => setShowMusicDropdown(false)}
              >
                <button
                  onClick={() => onCategoryChange('music')}
                  className={`px-3 py-2 rounded transition flex items-center space-x-1 ${
                    activeCategory === 'music' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>Music</span>
                  <svg className={`w-4 h-4 transition-transform ${showMusicDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showMusicDropdown && (
                  <div className="absolute top-full left-0 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2 mt-0 z-[110]">
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 mb-1">
                      My Playlists
                    </div>
                    {playlists.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400 italic">
                        Add Favorites to a playlist to play from here.
                      </div>
                    ) : (
                      playlists.map(pName => {
                        const isThisPlaying = isPlaylistPlaying && activePlaylist === pName;
                        const hasItems = favorites.getFavorites('music', pName).length > 0;
                        
                        return (
                          <button
                            key={pName}
                            onClick={() => hasItems && onPlaylistSelect(pName)}
                            disabled={!hasItems}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${
                              !hasItems 
                                ? 'text-gray-600 cursor-default' 
                                : 'text-gray-200 hover:bg-gray-700 hover:text-white'
                            }`}
                          >
                            <span className="truncate pr-2">{pName}</span>
                            {isThisPlaying ? (
                              <div className="flex items-end space-x-0.5 h-3">
                                <div className="w-0.5 bg-red-500 animate-[music-bar_0.6s_ease-in-out_infinite]"></div>
                                <div className="w-0.5 bg-red-500 animate-[music-bar_0.9s_ease-in-out_infinite]"></div>
                                <div className="w-0.5 bg-red-500 animate-[music-bar_0.7s_ease-in-out_infinite]"></div>
                              </div>
                            ) : !hasItems && (
                              <span className="text-[10px] text-gray-600 italic">Add Favorites to play</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-1 justify-end">
            {/* Sort Dropdown */}
            <select 
              value={activeSort} 
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600 appearance-none cursor-pointer"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Search Input */}
            <form onSubmit={handleSubmit} className="max-w-md w-64">
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-red-600 border border-gray-700"
              />
            </form>
          </div>
        </div>
      </nav>
      
      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
      `}</style>
    </div>
  );
};

export default Navbar;
