import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ensureStorageSchema } from '@core/utils/storage';
import { installChunkErrorRecovery } from '@core/utils/chunkReload';

installChunkErrorRecovery();

// Inside the Flutter APK (JS channel `Flutter`, or Android WebView "; wv)" UA)
// the native side already handles system-bar insets; tell CSS to ignore them
// so the header/bottom nav sit flush (see public/md3-tokens.css).
if (window.Flutter || /; wv\)/.test(navigator.userAgent)) {
    document.documentElement.classList.add('in-app-webview');
}

// Wipe legacy persisted blobs from previous schema versions on the very first
// load after a deploy. Runs synchronously before React mounts so no component
// can ever read stale state from a bumped schema version.
ensureStorageSchema();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
