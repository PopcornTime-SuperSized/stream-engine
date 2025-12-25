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
    *   **Windows**: NSIS Installer (`.exe`).
    *   **macOS**: DMG Disk Image (`.dmg`).
    *   **Linux**: AppImage.
*   **Documentation**: Created `INSTALL.md` to guide users through the "Build from Source" process, ensuring transparency and security.

### 7. Technical Decisions: Why Electron?
We evaluated **PWA (Progressive Web Apps)** as an alternative but rejected it for two critical reasons:
1.  **Transcoding**: Our audio fix relies on spawning a native **FFmpeg** process. Browsers (PWAs) are sandboxed and cannot execute external binaries.
2.  **Torrent Protocols**: Browsers are limited to WebRTC peers (WebTorrent). To access the full torrent network (TCP/UDP peers), we need the raw network socket access that only a desktop runtime like Electron provides.

## How to Run
```bash
# Install dependencies
npm install

# Start Development Mode (React + Electron)
npm run dev

# Build for Production (Detects OS automatically)
npm run dist
```
