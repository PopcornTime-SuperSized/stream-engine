# Where We Left Off - Torrent Source Reliability

**Date:** January 6, 2026  
**Issue:** "Searching for sources..." hanging or returning no results

---

## Problem Summary

The app was failing to find torrent sources for TV shows. Users would see "Searching for sources..." indefinitely or "No sources found."

## Root Causes Identified

1. **Cloudflare blocking** - Most torrent providers (1337x, YTS, ThePirateBay, etc.) are now Cloudflare-protected and block automated requests from `torrent-search-api`.

2. **Dead providers** - Rarbg shut down in 2023, YTS is frequently blocked.

3. **Missing IPC parameter** - `src/utils/electron.js` was only passing 2 parameters to `searchTorrents`, dropping the `options` object that contains `type`, `season`, `episode`, `imdbId`.

4. **Duplicate query pattern** - The search query was being constructed with `S##E##` twice.

5. **No timeout** - Searches would hang indefinitely when providers didn't respond.

---

## Fixes Applied

| File | Change |
|------|--------|
| `src/main/torrent-sources.js` | New module - uses Eztv provider (only reliable one), 15s timeout |
| `src/main/main.js` | Uses new torrent-sources module |
| `src/main/preload.js` | Passes options parameter through IPC |
| `src/utils/electron.js` | **KEY FIX** - Added 3rd parameter `opts` to searchTorrents |
| `src/services/tmdb.js` | Added `getTVExternalIds` for IMDB ID lookup |
| `src/components/DetailView.js` | Fetches IMDB ID, passes metadata when searching |
| `.github/workflows/build.yml` | New - automated builds for mac/win/linux |

---

## Current State

### Working
- **The Simpsons S35E01** - Returns 13 results instantly
- Timeout prevents infinite hanging (15 seconds max)
- IPC correctly passes options (`type`, `season`, `episode`, `imdbId`)

### Not Working / Limited
- **Stranger Things S05E03** - Times out (Eztv may not have it indexed, or rate limiting)
- **Movies** - Limited results since YTS is blocked, Eztv is TV-focused

---

## Next Steps to Consider

1. **Self-hosted backend API** (like Popcorn Time does)
   - Run scrapers server-side with proxy rotation
   - Cache results in database
   - Client just calls REST API

2. **Add more providers** - Some alternatives to try:
   - Direct EZTV API (tested but IMDB filter didn't work)
   - Jackett (self-hosted indexer aggregator)
   - Prowlarr

3. **Retry logic** - If first search times out, try alternative query format

---

## How to Test

```bash
# Start dev server
npm run dev

# Test in Node directly
node -e "
const { searchTorrents } = require('./src/main/torrent-sources');
searchTorrents('The Simpsons', 'TV', { type: 'tv', season: 35, episode: 1 })
  .then(r => console.log('Results:', r.length));
"
```

---

## Key Files to Review

- `src/main/torrent-sources.js` - Core search logic
- `src/utils/electron.js` - IPC bridge (was the main bug)
- `src/components/DetailView.js` - Episode click handler

---

## GitHub Actions

Build workflow added at `.github/workflows/build.yml`
- Triggers on push to main
- Builds for macOS, Windows, Linux
- Artifacts available in Actions tab
