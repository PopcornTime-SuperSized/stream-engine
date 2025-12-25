import React from 'react';
import { tmdb } from '../services/tmdb';

const MediaCard = ({ item, onClick }) => {
  const title = item.title || item.name;
  const releaseDate = item.release_date || item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
  const imageUrl = tmdb.getImageUrl(item.poster_path);

  return (
    <div 
      className="group relative cursor-pointer transition-transform duration-200 hover:scale-105"
      onClick={() => onClick(item)}
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-xl">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-red-600 text-white rounded-full p-3 transform scale-0 group-hover:scale-100 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <h3 className="text-white font-medium truncate text-sm">{title}</h3>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{year}</span>
          <span className="flex items-center text-yellow-500">
            ★ {item.vote_average?.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
