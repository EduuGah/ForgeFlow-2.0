import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyTheme, readThemePreference } from './lib/theme';
import { registerServiceWorker } from './lib/offlineMedia';
import { keepAliveSupabase } from './supabase';
import { captureInvite } from './features/invite';
import { watchInstallPrompt } from './lib/install';
import { captureDeepLink } from './features/deepLink';

captureInvite();
watchInstallPrompt();
captureDeepLink();
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
