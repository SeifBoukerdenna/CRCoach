// royal_trainer_client/src/main.tsx - Updated with Discord router integration

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Router from './components/Router.tsx'
import './index.css'

// Ensure CSS is loaded
console.log('🎨 CSS imported successfully');

// Initialize Discord auth logging
console.log('🔐 Initializing Discord authentication...');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)