// ============================================================
// main.jsx — Application bootstrap file.
//
// This is the first JavaScript file executed by the browser.
// Its only job is to mount the React component tree onto the DOM.
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client'; // React 18 uses the new "root" API
import App from './App';
import './index.css'; // Global stylesheet imported once here so it applies everywhere

const root = document.getElementById('root');

// Use hydrateRoot when react-snap has pre-rendered HTML (root has child nodes),
// otherwise fall back to createRoot for normal dev/non-pre-rendered loads.
if (root.hasChildNodes()) {
  ReactDOM.hydrateRoot(
    root,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
