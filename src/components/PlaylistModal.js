import React, { useState, useEffect } from 'react';
import { favorites } from '../services/favorites';

const PlaylistModal = ({ item, onClose, onFavoriteUpdate }) => {
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPlaylists(favorites.getPlaylists('music'));
  }, []);

  const handleTogglePlaylist = (pName) => {
    favorites.toggle(item, 'music', pName);
    onFavoriteUpdate();
  };

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    const success = favorites.createPlaylist('music', newPlaylistName.trim());
    if (success) {
      setPlaylists(favorites.getPlaylists('music'));
      setNewPlaylistName('');
      setError('');
    } else {
      setError('Playlist already exists or invalid name.');
    }
  };

  const handleDeletePlaylist = (e, pName) => {
    e.stopPropagation();
    if (pName === 'General Playlist') return;
    if (window.confirm(`Are you sure you want to delete "${pName}"?`)) {
      favorites.deletePlaylist('music', pName);
      setPlaylists(favorites.getPlaylists('music'));
      onFavoriteUpdate();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full shadow-2xl border border-gray-700 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Save to Playlist</h2>
            <p className="text-gray-400 text-sm truncate">{item.collectionName || item.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {playlists.map(pName => {
            const isFav = favorites.isFavorite(item.id, 'music', pName);
            return (
              <div 
                key={pName}
                onClick={() => handleTogglePlaylist(pName)}
                className={`w-full p-4 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  isFav 
                    ? 'bg-red-600/20 border-red-600 text-white' 
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isFav ? 'bg-red-600 border-red-600' : 'border-gray-500'}`}>
                    {isFav && (
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium truncate">{pName}</span>
                </div>
                {pName !== 'General Playlist' && (
                  <button 
                    onClick={(e) => handleDeletePlaylist(e, pName)}
                    className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                    title="Delete Playlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h14" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Create New Playlist */}
        <div className="p-6 border-t border-gray-700 bg-gray-850">
          <form onSubmit={handleCreatePlaylist} className="flex flex-col space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
              />
              <button 
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm"
              >
                Create
              </button>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal;
