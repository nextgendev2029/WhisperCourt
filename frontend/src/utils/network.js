/**
 * Network configuration helper for Whisper Court.
 *
 * Supports:
 * 1. VITE_API_URL and VITE_WS_URL environment variables for cloud deployments (e.g. Vercel + Render/Railway)
 * 2. Local development fallbacks (localhost, 127.0.0.1, or LAN IP on port 8000)
 * 3. Automatic TLS protocol matching (http -> ws, https -> wss)
 */

export const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  const host = window.location.hostname;
  const wsHost = (host === 'localhost' || host === '127.0.0.1') ? 'localhost:8000' : `${host}:8000`;
  return `${window.location.protocol}//${wsHost}`;
};

export const getWsBase = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/$/, '');
  }
  const host = window.location.hostname;
  const wsHost = (host === 'localhost' || host === '127.0.0.1') ? 'localhost:8000' : `${host}:8000`;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${wsHost}`;
};
