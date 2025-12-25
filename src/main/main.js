const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const TorrentSearchApi = require('torrent-search-api');
const WebTorrent = require('webtorrent');

const fs = require('fs');
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');

// Initialize WebTorrent client
const client = new WebTorrent();

// Stream State
let streamServer = null;
let activeFile = null;

// Initialize Express for Transcoding
const appServer = express();
let serverPort = 0;

appServer.get('/stream', (req, res) => {
  if (!activeFile) {
    return res.status(404).send('No active file');
  }

  const range = req.headers.range;
  
  // If we just want to probe or simple stream
  res.setHeader('Content-Type', 'video/mp4');

  // FFmpeg Transcoding Stream
  // We copy video (fast) and transcode audio to AAC (compatible)
  // We use mp4 container with fragmentation for streaming
  const stream = activeFile.createReadStream();
  
  const command = ffmpeg(stream)
    .videoCodec('copy')
    .audioCodec('aac')
    .audioChannels(2) // Downmix to stereo
    .audioFilters([
      'dynaudnorm=f=150:g=15', // Dynamic Audio Normalizer (boosts quiet parts)
      'volume=1.5' // Global 150% boost
    ])
    .format('mp4')
    .outputOptions([
      '-movflags frag_keyframe+empty_moov', // Essential for streaming MP4
      '-deadline realtime' // For VP9/WebM if we ever switched
    ])
    .on('error', (err) => {
      // Expected error when client closes stream
      if (err.message.includes('Output stream closed')) return;
      
      console.error('FFmpeg Error:', err.message);
      if (!res.headersSent) {
         res.status(500).send('Streaming Error');
      }
    })
    .on('start', (commandLine) => {
      console.log('Spawned Ffmpeg with command: ' + commandLine);
    });
    
  command.pipe(res, { end: true });

  // Clean up FFmpeg process if client disconnects
  res.on('close', () => {
    console.log('Client disconnected, killing FFmpeg process');
    command.kill();
  });
});

// Start Express Server
const serverInstance = appServer.listen(0, () => {
  serverPort = serverInstance.address().port;
  console.log(`Transcoding server running on port ${serverPort}`);
});

// Initialize Search API
TorrentSearchApi.enablePublicProviders();
const activeProviders = TorrentSearchApi.getActiveProviders();
console.log('Active Torrent Providers:', activeProviders.map(p => p.name).join(', '));

let mainWindow;

function createWindow() {
  const preloadPath = path.resolve(__dirname, 'preload.js');
  console.log('Preload script path:', preloadPath);
  console.log('Preload script exists:', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false
    },
  });

  // Log any renderer process crashes
  mainWindow.webContents.on('crashed', (e) => console.error('Renderer process crashed!', e));
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => console.error('Failed to load:', desc));


  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC: Search Torrents
ipcMain.handle('search-torrents', async (event, query, category = 'All') => {
  try {
    console.log(`Searching for: ${query} in ${category}`);
    const results = await TorrentSearchApi.search(query, category, 20);
    return results;
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
});

// IPC: Start Streaming
ipcMain.handle('start-stream', async (event, magnetURI) => {
  return new Promise((resolve, reject) => {
    // Cleanup previous torrents
    if (client.torrents.length > 0) {
      client.torrents.forEach(t => t.destroy());
    }
    activeFile = null;

    console.log(`Starting stream for magnet: ${magnetURI}`);
    
    client.add(magnetURI, (torrent) => {
      console.log('Torrent added, looking for video file...');
      
      // Find the largest file, usually the video
      const file = torrent.files.find(function (file) {
        return file.name.endsWith('.mp4') || file.name.endsWith('.mkv') || file.name.endsWith('.avi') || file.name.endsWith('.webm');
      });

      if (!file) {
        const largestFile = torrent.files.reduce((a, b) => a.length > b.length ? a : b);
        console.log(`No standard video extension found. Using largest file: ${largestFile.name}`);
        setupStream(torrent, largestFile, resolve);
        return;
      }

      setupStream(torrent, file, resolve);
    });
  });
});

function setupStream(torrent, file, resolve) {
  activeFile = file;
  const streamUrl = `http://localhost:${serverPort}/stream`;
  
  console.log(`Stream ready at: ${streamUrl}`);
  
  resolve({
    name: file.name,
    url: streamUrl,
    infoHash: torrent.infoHash
  });
}

// Deprecated startServer function removed
