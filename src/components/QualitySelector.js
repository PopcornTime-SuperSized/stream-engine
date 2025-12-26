import React from 'react';

const QualitySelector = ({ torrents, onSelect, onClose, title }) => {
  // Group torrents by quality
  const getQuality = (torrentTitle) => {
    const titleLower = torrentTitle.toLowerCase();
    if (titleLower.includes('2160p') || titleLower.includes('4k') || titleLower.includes('uhd')) return '4K';
    if (titleLower.includes('1080p') || titleLower.includes('1080')) return '1080p';
    if (titleLower.includes('720p') || titleLower.includes('720')) return '720p';
    if (titleLower.includes('480p') || titleLower.includes('480')) return '480p';
    if (titleLower.includes('hdtv') || titleLower.includes('hdrip')) return 'HD';
    return 'SD';
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case '4K': return 'bg-purple-600 hover:bg-purple-700';
      case '1080p': return 'bg-green-600 hover:bg-green-700';
      case '720p': return 'bg-blue-600 hover:bg-blue-700';
      case '480p': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'HD': return 'bg-teal-600 hover:bg-teal-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  // Group and sort torrents by quality
  const qualityGroups = {};
  torrents.forEach(torrent => {
    const quality = getQuality(torrent.title);
    if (!qualityGroups[quality]) {
      qualityGroups[quality] = [];
    }
    qualityGroups[quality].push(torrent);
  });

  // Sort each group by seeds and get best option per quality
  const qualityOptions = Object.entries(qualityGroups)
    .map(([quality, tors]) => {
      const sorted = tors.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
      const best = sorted[0];
      return {
        quality,
        torrent: best,
        seeds: best.seeds || 0,
        title: best.title,
        size: best.size || 'Unknown'
      };
    })
    .sort((a, b) => {
      // Sort by quality priority
      const priority = { '4K': 5, '1080p': 4, '720p': 3, 'HD': 2, '480p': 1, 'SD': 0 };
      return (priority[b.quality] || 0) - (priority[a.quality] || 0);
    });

  return (
    <div className="fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-lg w-full shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Select Quality</h2>
              <p className="text-gray-400 text-sm">{title}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quality Options */}
        <div className="p-4 space-y-3">
          {qualityOptions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No sources found for this title.
            </div>
          ) : (
            qualityOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(option.torrent)}
                className={`w-full p-4 rounded-lg ${getQualityColor(option.quality)} text-white transition-all flex items-center justify-between group`}
              >
                <div className="flex items-center space-x-4">
                  {/* Quality Badge */}
                  <div className="bg-black/30 px-3 py-1 rounded font-bold text-lg min-w-[70px] text-center">
                    {option.quality}
                  </div>
                  
                  {/* Size */}
                  <div className="text-sm opacity-80">
                    {option.size}
                  </div>
                </div>

                {/* Seeds/Peers */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">{option.seeds}</span>
                    <span className="text-sm opacity-70">seeds</span>
                  </div>
                  
                  {/* Play Icon */}
                  <svg className="w-6 h-6 ml-2 opacity-0 group-hover:opacity-100 transition" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center">
          <p className="text-gray-500 text-xs">
            Higher seeds = faster & more stable streaming
          </p>
        </div>
      </div>
    </div>
  );
};

export default QualitySelector;
