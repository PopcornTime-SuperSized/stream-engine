import React from 'react';
import ReactDOM from 'react-dom/client';

// Pipe logs to Main process - DO THIS FIRST
if (window.require) {
  try {
    const { ipcRenderer } = window.require('electron');
    const oldLog = console.log;
    const oldError = console.error;
    console.log = (...args) => {
      oldLog(...args);
      // ipcRenderer.send('renderer-log', ...args);
    };
    console.error = (...args) => {
      oldError(...args);
      // ipcRenderer.send('renderer-log', 'ERROR:', ...args);
    };
  } catch (e) {
    // Fallback if ipcRenderer fails
  }
}

import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
