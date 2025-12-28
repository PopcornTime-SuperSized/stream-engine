import React from 'react';
import MediaCard from './MediaCard';

const MediaGrid = ({ items, onSelect, loading, type }) => {
  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
      {items.map((item) => (
        <MediaCard 
          key={item.id} 
          item={item} 
          type={type} 
          onClick={onSelect} 
        />
      ))}
    </div>
  );
};

export default MediaGrid;
