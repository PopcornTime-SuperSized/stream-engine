import React, { useState } from 'react';
import { getBannerUrls } from '../config/banners';

const Navbar = ({ onSearch, onCategoryChange, activeCategory, onSortChange, activeSort }) => {
  const [query, setQuery] = useState('');
  const banners = getBannerUrls();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const sortOptions = [
    { label: 'Popularity', value: 'popularity' },
    { label: 'A-Z', value: 'alphabetical' },
    { label: 'Rating', value: 'rating' },
    { label: 'Newest', value: 'newest' }
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
            <div className="flex items-center">
              <span className="text-2xl font-bold text-red-600">PopcornTime<sup className="text-xs">X</sup></span>
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
    </div>
  );
};

export default Navbar;
