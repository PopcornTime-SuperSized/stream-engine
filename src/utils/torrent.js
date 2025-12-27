// Torrent quality detection and grouping utilities

// Quality detection from torrent title
export const getQuality = (title) => {
  const t = title.toLowerCase();
  
  // Video Qualities
  if (t.includes('2160p') || t.includes('4k') || t.includes('uhd')) return '4K';
  if (t.includes('1080p') || t.includes('1080')) return '1080p';
  if (t.includes('720p') || t.includes('720')) return '720p';
  if (t.includes('480p') || t.includes('480')) return '480p';
  if (t.includes('hdtv') || t.includes('hdrip')) return 'HD';
  
  // Audio Qualities
  if (t.includes('flac')) return 'FLAC';
  if (t.includes('wav')) return 'WAV';
  if (t.includes('320') || t.includes('320kbps')) return '320kbps';
  if (t.includes('v0')) return 'MP3 V0';
  if (t.includes('mp3')) return 'MP3';
  if (t.includes('m4a') || t.includes('aac')) return 'AAC';
  
  return 'SD';
};

// Quality badge colors
export const getQualityColor = (quality) => {
  const colors = {
    // Video
    '4K': 'bg-purple-600 hover:bg-purple-700',
    '1080p': 'bg-green-600 hover:bg-green-700',
    '720p': 'bg-blue-600 hover:bg-blue-700',
    '480p': 'bg-yellow-600 hover:bg-yellow-700',
    'HD': 'bg-teal-600 hover:bg-teal-700',
    'SD': 'bg-gray-600 hover:bg-gray-700',
    
    // Audio
    'FLAC': 'bg-pink-600 hover:bg-pink-700',
    'WAV': 'bg-pink-600 hover:bg-pink-700',
    '320kbps': 'bg-indigo-600 hover:bg-indigo-700',
    'MP3 V0': 'bg-indigo-500 hover:bg-indigo-600',
    'MP3': 'bg-blue-500 hover:bg-blue-600',
    'AAC': 'bg-cyan-600 hover:bg-cyan-700'
  };
  return colors[quality] || colors['SD'];
};

// Quality priority for sorting
const QUALITY_PRIORITY = { 
  '4K': 10, '1080p': 9, '720p': 8, 'HD': 7, '480p': 6, 
  'FLAC': 5, 'WAV': 5, '320kbps': 4, 'MP3 V0': 3, 'AAC': 2, 'MP3': 1,
  'SD': 0 
};

// Group ALL torrents by quality (for dropdown with multiple options)
export const groupAllByQuality = (torrents) => {
  if (!torrents || !Array.isArray(torrents)) return [];
  
  const groups = {};
  torrents.forEach(t => {
    const q = getQuality(t.title);
    if (!groups[q]) groups[q] = [];
    groups[q].push(t);
  });
  
  // Sort each group by seeds descending
  Object.keys(groups).forEach(q => {
    groups[q].sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
  });
  
  return Object.entries(groups)
    .map(([quality, torrents]) => ({ quality, torrents, bestSeeds: torrents[0]?.seeds || 0 }))
    .sort((a, b) => (QUALITY_PRIORITY[b.quality] || 0) - (QUALITY_PRIORITY[a.quality] || 0));
};
