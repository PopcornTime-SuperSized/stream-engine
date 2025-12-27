# Project Framework & Development Log

## Overview
**StreamEngine** is a desktop application for searching and streaming torrents directly without waiting for downloads. It combines the power of **Electron** for desktop integration, **React** for a modern UI, and **WebTorrent** for decentralized streaming.

## Tech Stack

### Core Frameworks
*   **Electron (v25+)**: Desktop runtime environment.
*   **React (v18)**: Frontend UI library.
*   **Node.js**: Backend logic execution.

### Key Libraries
1.  **WebTorrent**: Implements the BitTorrent protocol in JavaScript for streaming.
2.  **Fluent-FFmpeg**: Handles real-time video/audio transcoding.
3.  **Express**: Runs an internal local server to pipe streams from WebTorrent -> FFmpeg -> Frontend Video Player.
4.  **Torrent-Search-API**: Aggregates results from multiple public torrent providers (1337x, YTS, ThePirateBay, etc.).
5.  **Tailwind CSS**: Utility-first CSS framework for styling.

## Development Steps Taken

### 1. Project Initialization
*   Set up a hybrid **Electron + Create React App** structure.
*   Configured `concurrently` and `wait-on` to manage the dual-process dev environment (React Server + Electron Window).

### 2. UI & Styling
*   Integrated **Tailwind CSS** for rapid UI development.
*   Built a Dark Mode interface with a Search Bar, Results Grid, and Video Player.

### 3. Backend Logic (Main Process)
*   Implemented **IPC (Inter-Process Communication)** handlers:
    *   `search-torrents`: Fetches results from active providers.
    *   `start-stream`: Initiates the torrent download and streaming server.

### 4. Streaming Engine Evolution
*   **Initial V1**: Used `torrent.createServer()` (Basic WebTorrent server).
    *   *Issue*: Failed to play MKV files with AC3/DTS audio (Browsers don't support these codecs).
*   **V2 (Current)**: Custom **Express + FFmpeg** Pipeline.
    *   Spins up an internal Express server on a random port.
    *   **Video**: Copies the H.264 stream (Zero CPU overhead).
    *   **Audio**: Transcodes AC3/DTS to **AAC** in real-time.
    *   **Container**: Muxes into fragmented MP4 for browser compatibility.
    *   **Normalization**: Applied `dynaudnorm` filter to boost dialogue volume and fix low-audio issues common in 5.1 rips.

### 5. Security & Stability
*   Implemented a robust **Preload Script** with Context Isolation.
*   Added a **Dual-Fallback Strategy**: Tries `window.electron` (Preload) first, falls back to `window.require` (Node Integration) if needed.
*   Added proper process cleanup to kill FFmpeg zombies when streaming stops.

### 6. Distribution & Build System
*   **Builder**: Configured `electron-builder` to generate production-ready installers.
    *   **Windows**: NSIS Installer (`PopcornTime-StreamEngine-win.exe`).
    *   **macOS**: DMG Disk Image (`PopcornTime-StreamEngine-mac.dmg`).
    *   **Linux**: AppImage.
*   **Documentation**: Created `INSTALL.md` to guide users through the "Build from Source" process, ensuring transparency and security.

### 7. Technical Decisions: Why Electron?
We evaluated **PWA (Progressive Web Apps)** as an alternative but rejected it for two critical reasons:
1.  **Transcoding**: Our audio fix relies on spawning a native **FFmpeg** process. Browsers (PWAs) are sandboxed and cannot execute external binaries.
2.  **Torrent Protocols**: Browsers are limited to WebRTC peers (WebTorrent). To access the full torrent network (TCP/UDP peers), we need the raw network socket access that only a desktop runtime like Electron provides.

### 8. Production Polish (v0.1.0)
*   **FFmpeg Bundling**: Integrated `ffmpeg-static` and configured ASAR unpacking. This ensures the transcoding engine works out-of-the-box on any machine without manual dependency installation.
*   **Branding**: Renamed to **PopcornTime-StreamEngine** and applied a custom application icon.
*   **Automated Releases**: GitHub Actions now builds and uploads signed artifacts directly to GitHub Releases.

### 9. Code Signing & Platform Security
*   **macOS Notarization**:
    *   Implemented an **Optional Signing Pipeline** in GitHub Actions.
    *   If Apple Developer credentials (`APPLE_ID`, `CSC_LINK`) are provided as Secrets, the app is automatically signed and notarized (Hardened Runtime enabled via `entitlements.mac.plist`).
    *   **Fallback**: If no credentials are present, the build proceeds as unsigned (requiring the `xattr -cr` workaround).
*   **Windows SmartScreen**:
    *   Since we do not use a costly Windows EV certificate, users will see a "Windows protected your PC" prompt.
    *   Documented the "More info -> Run anyway" bypass in `README.md` and `INSTALL.md`.

### 10. TMDB Integration & Netflix-Style UI (v0.2.0)
*   **TMDB API**: Replaced basic torrent search UI with a rich media discovery experience.
    *   Movie and TV Show browsing with poster grids.
    *   Sorting options: Popularity, A-Z, Rating, Newest.
    *   Search functionality across movies and TV shows.
    *   Fetches 5 pages (~100 items) in parallel for expanded catalog.
*   **DetailView**: Netflix-style detail modal with:
    *   Hero backdrop image with gradient overlay.
    *   Poster, title, year, rating, runtime, genres, and overview.
    *   TV Shows: Season selector (Specials first, then newest to oldest).
    *   Episode list with thumbnails (newest episodes first).

### 11. Ad Banner System
*   **Dual Banner Header**: Two iframe-based ad banners above the navigation bar.
    *   Sticky positioning on both main view and detail view.
    *   100px fixed height with perfect vertical centering.
    *   Bounce-in animations (left banner from left, right banner from right).
    *   Hover effects with scale transform.
*   **Banner Source Toggle** (`/src/config/banners.js`):
    *   `BANNER_SOURCE = 'local'` → Uses `/banners/column_1.html` and `/banners/column_2.html`.
    *   `BANNER_SOURCE = 'external'` → Uses `https://nsdb.com/streamengine/banners/` URLs.
    *   Single config file controls both Navbar and DetailView components.

### 12. Quality Selection & Streaming UX
*   **Movies**: Inline quality options displayed immediately in detail view.
    *   Torrents fetched automatically when movie details load.
    *   Color-coded quality badges with seed counts replace "Watch Now" button.
    *   Loading spinner while searching for sources.
    *   "No sources found" message if unavailable.
*   **TV Episodes**: Inline expandable quality selection.
    *   Click episode row → expands to show quality badges.
    *   Torrents searched on-demand per episode (cached after first fetch).
    *   Quality badges display: resolution + seed count.
    *   User stays in DetailView throughout the selection process.
    *   "No sources found" message if no torrents available.
*   **Quality Detection**: Parses torrent titles for resolution keywords.
    *   Groups by quality, picks highest-seeded option per tier.
    *   Priority: 4K > 1080p > 720p > HD > 480p > SD.

### 13. UI/UX Refinements
*   **Sticky Header**: Banners + Navbar stay fixed during scroll.
*   **Z-Index Management**: Proper layering for modals, headers, and overlays.
*   **Episode Ordering**: Seasons sorted newest-first (after Specials), episodes reversed.
*   **Responsive Design**: Hidden elements on smaller screens, flexible layouts.

### 14. Advanced Torrent Selection (v0.2.1)
*   **Multi-Source Dropdown**: Quality badges now expand to show ALL available torrents per quality tier.
    *   Click quality badge → dropdown shows every torrent at that resolution.
    *   Each option displays: title, seed count, peer count, file size.
    *   Allows users to try alternative sources if one fails.
    *   Count indicator shows number of options per quality (e.g., "1080p (7)").
*   **Works for both Movies and TV Episodes**.

### 15. Real-Time Buffering Stats
*   **Video Player Overlay**: Shows live torrent statistics during buffering.
    *   Peer count and download speed (e.g., "32 peers • 125.5 KB/s").
    *   Downloaded amount with dynamic units (KB for small, MB for large).
    *   Total file size display (e.g., "5.25 MB / 1500 MB").
*   **DetailView Status**: Spinner with "Connecting to peers and buffering..." message while stream initializes.
*   **Progress Tracking**: Only shows NEW data downloaded since stream started (not cached data).

### 16. Torrent Lifecycle Management
*   **Automatic Cleanup**: Previous torrents destroyed when starting a new stream.
*   **Stop Playback**: Clicking X button (hover-visible) stops torrent and cleans up.
*   **Close DetailView**: Closing the detail modal stops any active downloads.
*   **Single Download Policy**: Only one torrent active at a time to prevent resource conflicts.
*   **IPC Handler**: `stop-stream` command for explicit torrent termination.

### 17. Video Player Polish
*   **Minimal Close Button**: Small X icon, only visible on hover over video.
*   **Error Display**: Shows video loading errors in the buffering overlay.
*   **Event Logging**: Console logs for canPlay, waiting, playing, and error events.

### 18. Code Refactoring & Shared Utilities
*   **Electron IPC Helper** (`/src/utils/electron.js`):
    *   Centralized `getElectron()` function used by App.js and DetailView.js.
    *   Dual fallback: tries `window.electron` (preload), falls back to `window.require`.
    *   Exposes `searchTorrents`, `startStream`, `stopStream`, `openExternal` methods.
*   **Torrent Utilities** (`/src/utils/torrent.js`):
    *   `getQuality(title)` - Detects resolution from torrent title (4K, 1080p, 720p, etc.) AND Audio quality (FLAC, MP3, 320kbps).
    *   `getQualityColor(quality)` - Returns Tailwind color classes for quality badges.
    *   `groupAllByQuality(torrents)` - Groups torrents by quality tier, sorted by seeds.
*   **Removed Duplication**:
    *   Eliminated ~70 lines of duplicate helper functions from DetailView.js.
    *   Removed unused `torrentProgress` state from App.js (using DOM manipulation).
    *   Consolidated IPC helper definitions into single source of truth.
*   **Branding Update**: Renamed app to **PopcornTime<sup>X</sup>** across Navbar and DetailView.

### 19. Multi-Category Support (v0.4.0)
*   **Music Category**:
    *   **Metadata Source**: **iTunes Search API** (via `src/services/itunes.js`).
    *   **Torrent Search**: Searches 'Audio' category for Artist + Track Name.
    *   **Streaming**: Supports MP3, FLAC, WAV, AAC, M4A via FFmpeg transcoding (audio-only mode).
    *   **UI**: Square artwork grids, Tracklist view in Detail Modal.
*   **Games Category**:
    *   **Metadata Source**: **Steam Store API** (via `src/services/steam.js`).
    *   **Torrent Search**: Searches 'Games' category for Game Title.
    *   **Download Only**: "Play" button replaced with "Download" action.
    *   **Magnet Handling**: Opens magnet links in system default torrent client (e.g., qBittorrent, Transmission) using `shell.openExternal`.
    *   **UI**: Steam Header images for posters, Game description and metadata.

## How to Run
```bash
# Install dependencies
npm install

# Start Development Mode (React + Electron)
npm run dev

# Build for Production (Detects OS automatically)
npm run dist
```

## Configuration Files
| File | Purpose |
|------|---------|
| `/src/config/banners.js` | Toggle between local/external banner sources |
| `/src/utils/electron.js` | Shared Electron IPC helper |
| `/src/utils/torrent.js` | Quality detection & grouping utilities |
| `/public/banners/*.html` | Local banner HTML files |
| `.env` | TMDB API key (`REACT_APP_TMDB_API_KEY`) |
