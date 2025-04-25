import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LogLevel, appLogger } from './utils/logger';
import './styles/globals.css';

// Configure logger based on environment
if (process.env.NODE_ENV === 'development') {
  appLogger.setLevel(LogLevel.DEBUG);
  appLogger.info('Starting Royal Trainer in development mode');
} else {
  appLogger.setLevel(LogLevel.WARN);
}

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a <div id="root"></div> in your HTML.');
}

// Create React root and render the app
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);