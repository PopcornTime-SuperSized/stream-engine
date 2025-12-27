const TorrentSearchApi = require('torrent-search-api');

async function checkMusic() {
    TorrentSearchApi.enablePublicProviders();
    
    // Test 1: Single Track Search
    try {
        console.log('Searching for "Justin Bieber Mistletoe"...');
        const results = await TorrentSearchApi.search('Justin Bieber Mistletoe', 'Audio', 5);
        console.log(`Found ${results.length} results.`);
        results.forEach(r => console.log(`- ${r.title} (${r.seeds} seeds)`));
    } catch (e) { console.error(e); }

    // Test 2: Album Search
    try {
        console.log('\nSearching for "Justin Bieber Under The Mistletoe"...');
        const results = await TorrentSearchApi.search('Justin Bieber Under The Mistletoe', 'Audio', 5);
        console.log(`Found ${results.length} results.`);
        results.forEach(r => console.log(`- ${r.title} (${r.seeds} seeds)`));
    } catch (e) { console.error(e); }
}

checkMusic();
