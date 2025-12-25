import React, { useState } from 'react';

// Helper to get Electron IPC
const getIpcRenderer = () => {
  if (window.electron) return window.electron; // Preload method
  if (window.require) {
    try {
      const { ipcRenderer } = window.require('electron');
      return {
        searchTorrents: (q) => ipcRenderer.invoke('search-torrents', q),
        startStream: (m) => ipcRenderer.invoke('start-stream', m)
      };
    } catch (e) {
      console.error('Failed to require electron:', e);
    }
  }
  return null;
};

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  const electron = getIpcRenderer();

  React.useEffect(() => {
    // Check if running in a browser environment (not Electron)
    const isElectron = /Electron/.test(navigator.userAgent);
    
    if (!isElectron) {
      setStatus('Warning: You are running in a Browser. Torrent streaming requires the Desktop App.');
      return;
    }

    if (!electron) {
      setStatus('Error: Electron IPC not connected. Please restart the app.');
      console.log('User Agent:', navigator.userAgent);
    }
  }, [electron]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    if (!electron) {
      setStatus('Error: Cannot search, Electron not connected.');
      return;
    }

    setLoading(true);
    setStatus('Searching networks...');
    try {
      const searchResults = await electron.searchTorrents(query);
      setResults(searchResults);
      setStatus(`Found ${searchResults.length} results`);
    } catch (err) {
      console.error(err);
      setStatus('Search failed');
    }
    setLoading(false);
  };

  const handleStream = async (magnet) => {
    setLoading(true);
    setStatus('Initializing stream (downloading metadata)...');
    try {
      const streamInfo = await electron.startStream(magnet);
      setStreamUrl(streamInfo.url);
      setStatus(`Now Playing: ${streamInfo.name} (Transcoding Audio via FFmpeg)`);
    } catch (err) {
      console.error(err);
      setStatus('Streaming failed');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-red-500">StreamEngine</h1>
      
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies, shows..."
          className="flex-1 p-3 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-red-500"
        />
        <button 
          type="submit"
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-bold"
          disabled={loading}
        >
          {loading ? 'Working...' : 'Search'}
        </button>
      </form>

      {/* Status Bar */}
      {status && <div className="mb-4 text-gray-400">{status}</div>}

      {/* Video Player */}
      {streamUrl && (
        <div className="mb-8 bg-black rounded overflow-hidden aspect-video relative">
          <video 
            src={streamUrl} 
            controls 
            autoPlay 
            className="w-full h-full"
          />
          <button 
            onClick={() => setStreamUrl(null)}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white px-3 py-1 rounded"
          >
            Close Player
          </button>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item, index) => (
          <div key={index} className="bg-gray-800 p-4 rounded hover:bg-gray-750 transition flex flex-col">
            <h3 className="font-bold text-lg mb-2 truncate" title={item.title}>{item.title}</h3>
            <div className="text-sm text-gray-400 mb-4 flex justify-between">
              <span>{item.time}</span>
              <span>{item.size}</span>
            </div>
            <div className="mt-auto flex justify-between items-center">
              <span className="text-green-500 text-sm">Seeds: {item.seeds}</span>
              <button
                onClick={() => handleStream(item.magnet)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                Stream Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
