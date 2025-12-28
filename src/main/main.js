const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const TorrentSearchApi = require('torrent-search-api');
const WebTorrent = require('webtorrent');

const fs = require('fs');
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Tell fluent-ffmpeg where to find the static binary
ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'));

// Initialize WebTorrent client
const client = new WebTorrent();

// Stream State
let streamServer = null;
let activeFile = null;

// Initialize Express for Transcoding
const appServer = express();
let serverPort = 0;

// IPC: Download Active File
ipcMain.handle('download-active-file', async () => {
  if (!activeFile) {
    throw new Error('No active stream to download');
  }

  const { filePath } = await dialog.showSaveDialog({
    title: 'Download Media',
    defaultPath: activeFile.name,
    buttonLabel: 'Download',
    filters: [
      { name: 'Media Files', extensions: [path.extname(activeFile.name).replace('.', '')] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!filePath) return { success: false, cancelled: true };

  return new Promise((resolve, reject) => {
    const stream = activeFile.createReadStream();
    const writeStream = fs.createWriteStream(filePath);

    stream.pipe(writeStream);

    writeStream.on('finish', () => {
      resolve({ success: true, path: filePath });
    });

    writeStream.on('error', (err) => {
      reject(err);
    });

    // Send progress if possible (optional enhancement)
  });
});

appServer.get('/stream', (req, res) => {
  if (!activeFile) {
    return res.status(404).send('No active file');
  }

  const range = req.headers.range;
  const isAudio = activeFile.name.match(/\.(mp3|flac|wav|m4a|aac)$/i);
  
  // If we just want to probe or simple stream
  res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');

  // FFmpeg Transcoding Stream
  const stream = activeFile.createReadStream();
  let command = ffmpeg(stream);

  if (isAudio) {
    command = command
      .noVideo()
      .format('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate('192k') // Good balance for streaming
      .audioChannels(2)
      .audioFilters([
        'dynaudnorm=f=150:g=15',
        'volume=1.5'
      ]);
  } else {
    command = command
      .videoCodec('copy')
      .format('mp4')
      .audioCodec('aac')
      .audioChannels(2)
      .audioFilters([
        'dynaudnorm=f=150:g=15',
        'volume=1.5'
      ])
      .outputOptions([
        '-movflags frag_keyframe+empty_moov',
        '-deadline realtime'
      ]);
  }

  command = command
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

  // Handle external links (banners, etc) by opening in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only open http/https links externally
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' }; // Prevent internal window creation
  });


  const startUrl = isDev
    ? 'http://localhost:3100'
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

// IPC: Get User Data Path (Sync)
ipcMain.on('get-user-data-path-sync', (event) => {
  event.returnValue = app.getPath('userData');
});

// IPC: Start Streaming
ipcMain.handle('start-stream', async (event, magnetURI, fileName = null) => {
  return new Promise((resolve, reject) => {
    // Validate magnet URI
    if (!magnetURI || typeof magnetURI !== 'string') {
      return reject(new Error('Invalid magnet link: empty or not a string'));
    }
    
    // Check for valid magnet format (must start with magnet:? and contain xt=urn:btih:)
    if (!magnetURI.startsWith('magnet:?') || !magnetURI.includes('xt=urn:btih:')) {
      return reject(new Error('Invalid magnet link format'));
    }
    
    // Check for dummy/placeholder magnet (no real hash)
    if (magnetURI.includes('btih:0000000000000000000000000000000000000000')) {
      return reject(new Error('No valid torrent source found'));
    }
    
    // Cleanup previous torrents
    if (client.torrents.length > 0) {
      client.torrents.forEach(t => t.destroy());
    }
    activeFile = null;

    console.log(`Starting stream for magnet: ${magnetURI}`);
    if (fileName) console.log(`Targeting file: ${fileName}`);
    
    try {
      const torrent = client.add(magnetURI);
      
      // Timeout if metadata doesn't load within 20 seconds
      const metadataTimeout = setTimeout(() => {
        // Destroy torrent if it's stuck fetching metadata
        torrent.destroy(); 
        reject(new Error('Timeout fetching torrent metadata (no peers found)'));
      }, 20000);

      torrent.on('ready', () => {
        clearTimeout(metadataTimeout);
        console.log('Torrent added, looking for video file...');
        
        let file;

        if (fileName) {
          // 1. Try exact match
          file = torrent.files.find(f => f.name === fileName);
          
          // 2. Try fuzzy match (if passed "Song Name", find "01 - Song Name.mp3")
          if (!file) {
            const cleanTarget = fileName.toLowerCase().replace(/[^a-z0-9]/g, '');
            file = torrent.files.find(f => {
              const cleanName = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              return cleanName.includes(cleanTarget);
            });
          }
        }

        // 3. Fallback to largest media file if no specific file found or requested
        if (!file) {
          file = torrent.files.find(function (file) {
            const name = file.name.toLowerCase();
            return name.endsWith('.mp4') || name.endsWith('.mkv') || name.endsWith('.avi') || name.endsWith('.webm') ||
                   name.endsWith('.mp3') || name.endsWith('.flac') || name.endsWith('.wav') || name.endsWith('.m4a') || name.endsWith('.aac');
          });
        }

        if (!file) {
          const largestFile = torrent.files.reduce((a, b) => a.length > b.length ? a : b);
          console.log(`No standard media extension found. Using largest file: ${largestFile.name}`);
          setupStream(torrent, largestFile, resolve, reject);
          return;
        }

        console.log(`Selected file: ${file.name}`);
        setupStream(torrent, file, resolve, reject);
      });
      
      torrent.on('error', (err) => {
        console.error('Torrent error:', err.message);
        reject(new Error(`Torrent error: ${err.message}`));
      });
    } catch (err) {
      console.error('Failed to add torrent:', err.message);
      reject(new Error(`Failed to start stream: ${err.message}`));
    }
  });
});

// Stop stream and cleanup torrents
ipcMain.handle('stop-stream', async () => {
  console.log('Stopping stream and cleaning up torrents...');
  if (client.torrents.length > 0) {
    client.torrents.forEach(t => {
      console.log(`Destroying torrent: ${t.name || t.infoHash}`);
      t.destroy();
    });
  }
  activeFile = null;
  return { success: true };
});

function setupStream(torrent, file, resolve, reject) {
  activeFile = file;
  const streamUrl = `http://localhost:${serverPort}/stream`;
  let attempts = 0;
  const maxAttempts = 60; // 30 seconds max wait (60 * 500ms)
  let resolved = false;
  const initialDownloaded = torrent.downloaded; // Track starting point
  
  // Send progress updates to renderer
  const sendProgress = () => {
    if (mainWindow && mainWindow.webContents) {
      const newDownloaded = torrent.downloaded - initialDownloaded; // Only show NEW data
      const totalSize = file.length || torrent.length || 0;
      
      // Show KB if under 1MB, otherwise MB
      let downloadedDisplay;
      let unit;
      if (newDownloaded < 1024 * 1024) {
        downloadedDisplay = (newDownloaded / 1024).toFixed(1);
        unit = 'KB';
      } else {
        downloadedDisplay = (newDownloaded / 1024 / 1024).toFixed(2);
        unit = 'MB';
      }
      
      const progress = {
        peers: torrent.numPeers || 0,
        speed: (torrent.downloadSpeed / 1024).toFixed(1),
        downloaded: downloadedDisplay,
        downloadUnit: unit,
        totalSize: (totalSize / 1024 / 1024).toFixed(0),
        progress: Math.round(torrent.progress * 100),
        fileName: file.name
      };
      mainWindow.webContents.send('torrent-progress', progress);
    }
  };
  
  // Wait for torrent to have some data before resolving
  const checkReady = () => {
    if (resolved) return;
    attempts++;
    
    const peers = torrent.numPeers || 0;
    const speed = (torrent.downloadSpeed / 1024).toFixed(1);
    const downloaded = (torrent.downloaded / 1024 / 1024).toFixed(2);
    
    console.log(`Buffering: ${downloaded}MB downloaded, ${peers} peers, ${speed}KB/s (attempt ${attempts}/${maxAttempts})`);
    
    // Send progress to renderer
    sendProgress();
    
    // Check if we have any downloaded pieces
    if (torrent.downloaded > 100000) { // At least 100KB downloaded
      resolved = true;
      console.log(`Stream ready at: ${streamUrl}`);
      resolve({
        name: file.name,
        url: streamUrl,
        infoHash: torrent.infoHash,
        fileType: file.name.match(/\.(mp3|flac|wav|m4a|aac|ogg|wma)$/i) ? 'audio' : 'video'
      });
      
      // Continue sending progress for 10 more seconds after stream is ready
      // so the video player UI can receive updates when it renders
      let postResolveAttempts = 0;
      const continueProgress = () => {
        if (postResolveAttempts < 20) { // 10 seconds (20 * 500ms)
          postResolveAttempts++;
          sendProgress();
          setTimeout(continueProgress, 500);
        }
      };
      continueProgress();
      
    } else if (attempts >= maxAttempts) {
      resolved = true;
      console.log('Timeout waiting for torrent data - no peers available');
      reject(new Error('No peers available - torrent may be dead or slow'));
    } else {
      setTimeout(checkReady, 500);
    }
  };
  
  // Start checking
  checkReady();
}

// Deprecated startServer function removed
