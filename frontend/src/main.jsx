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

// ReactDOM.createRoot() selects the <div id="root"> from index.html and
// hands it to React. From this point React controls everything inside that div.
ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictMode is a development-only wrapper.
  // It intentionally double-invokes certain functions to surface bugs early.
  // It has no effect on the production build.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
