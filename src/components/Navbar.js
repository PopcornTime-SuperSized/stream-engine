import React, { useState } from 'react';

const Navbar = ({ onSearch, onCategoryChange, activeCategory, onSortChange, activeSort }) => {
  const [query, setQuery] = useState('');

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
    <nav className="bg-gray-900 text-white p-4 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="text-2xl font-bold text-red-600 flex items-center">
            PopcornTime
          </div>
          <div className="hidden md:flex space-x-4">
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
  );
};

export default Navbar;
