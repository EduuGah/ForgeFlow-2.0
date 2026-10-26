import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyTheme, readThemePreference } from './lib/theme';
import { registerServiceWorker } from './lib/offlineMedia';
import { keepAliveSupabase } from './supabase';
import { captureInvite } from './features/invite';

captureInvite();
applyTheme(readThemePreference());
registerServiceWorker();
void keepAliveSupabase();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
