import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { API_BASE_URL } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore } from '../store/useRoomStore';

function resolveConstructor(imported: any, name: string): any {
  if (typeof imported === 'function') return imported;
  if (imported && typeof imported.default === 'function') return imported.default;
  if (imported && typeof imported[name] === 'function') return imported[name];
  if (imported && imported.default && typeof imported.default[name] === 'function') return imported.default[name];
  if (imported && imported.default && typeof imported.default.default === 'function') return imported.default.default;
  return imported;
}

const EchoConstructor: any = resolveConstructor(Echo, 'Echo');
const PusherConstructor: any = resolveConstructor(Pusher, 'Pusher');

if (typeof window !== 'undefined') {
  (window as any).Pusher = PusherConstructor;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Pusher = PusherConstructor;
}

let echoInstance: any = null;
let activeConnection = '';
let echoInitFailed = false;

const echoResetListeners = new Set<() => void>();

export function onEchoReset(listener: () => void): () => void {
  echoResetListeners.add(listener);
  return () => {
    echoResetListeners.delete(listener);
  };
}

let serverConfig: {
  broadcaster?: 'reverb' | 'pusher';
  key?: string;
  cluster?: string;
  host?: string;
  port?: number;
  scheme?: string;
  useTLS?: boolean;
} | null = null;

function describeConnection(config: typeof serverConfig): string {
  if (config?.broadcaster === 'pusher') return `pusher:${config.cluster || 'mt1'}:${config.key}`;
  const host = (config?.host || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return host ? `reverb:${host}` : '';
}

let isFetchingConfig = false;

// A failed config fetch would leave realtime dead for the session (guests never call getEcho again): retry with backoff
const CONFIG_RETRY_MIN_MS = 2000;
const CONFIG_RETRY_MAX_MS = 30000;
let configRetryDelayMs = CONFIG_RETRY_MIN_MS;
let configRetryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleConfigRetry() {
  if (configRetryTimer || serverConfig) return;
  configRetryTimer = setTimeout(async () => {
    configRetryTimer = null;
    await fetchBroadcastingConfig();
    if (serverConfig) {
      configRetryDelayMs = CONFIG_RETRY_MIN_MS;
      return;
    }
    configRetryDelayMs = Math.min(CONFIG_RETRY_MAX_MS, configRetryDelayMs * 2);
    scheduleConfigRetry();
  }, configRetryDelayMs);
}

export async function fetchBroadcastingConfig(): Promise<any> {
  if (serverConfig) return serverConfig;
  if (isFetchingConfig) return null;
  isFetchingConfig = true;

  try {
    const res = await fetch(`${API_BASE_URL}/broadcasting/config`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      serverConfig = data?.data || data;
      console.log('📡 [Broadcasting Config Loaded from Backend]:', serverConfig);
      const configConnection = describeConnection(serverConfig);
      if (echoInstance && configConnection && configConnection !== activeConnection) {
        disconnectEcho();
        echoResetListeners.forEach((listener) => listener());
      } else if (echoInitFailed) {
        echoInitFailed = false;
        echoResetListeners.forEach((listener) => listener());
      }
      return serverConfig;
    }
  } catch (e) {
    console.log('ℹ️ [Broadcasting Config Fallback to Local Defaults]');
  } finally {
    isFetchingConfig = false;
  }
  return null;
}

// Eagerly initiate config fetch in browser
if (typeof window !== 'undefined') {
  fetchBroadcastingConfig();
}

export function getEcho(): any {
  if (echoInstance) return echoInstance;

  if (!serverConfig && !isFetchingConfig && typeof window !== 'undefined') {
    fetchBroadcastingConfig();
  }

  try {
    const appKey = serverConfig?.key || (import.meta as any).env?.VITE_REVERB_APP_KEY;
    if (!appKey) {
      throw new Error('No Reverb/Pusher app key: broadcasting config unavailable and VITE_REVERB_APP_KEY unset');
    }
    const isPusher = serverConfig?.broadcaster === 'pusher';
    let connectionOptions: Record<string, any>;

    if (isPusher) {
      connectionOptions = { cluster: serverConfig?.cluster || 'mt1', forceTLS: true };
      activeConnection = describeConnection(serverConfig);
    } else {
      let wsHost = serverConfig?.host || (import.meta as any).env?.VITE_REVERB_HOST || '';
      let wsPort = serverConfig?.port ? Number(serverConfig.port) : Number((import.meta as any).env?.VITE_REVERB_PORT || '8082');
      let forceTLS = serverConfig?.useTLS ?? (serverConfig?.scheme === 'https');

      if (wsHost) {
        wsHost = wsHost.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (wsHost.includes('trycloudflare.com') || wsPort === 443 || (import.meta as any).env?.VITE_REVERB_SCHEME === 'https') {
          forceTLS = true;
          wsPort = 443;
        }
      } else if (typeof window !== 'undefined') {
        wsHost = window.location.hostname || 'localhost';
        wsPort = 8082;
        forceTLS = false;
      } else {
        wsHost = 'localhost';
        wsPort = 8082;
        forceTLS = false;
      }

      connectionOptions = {
        cluster: 'mt1',
        wsHost: wsHost,
        wsPort: wsPort,
        wssPort: wsPort,
        forceTLS: forceTLS,
        enabledTransports: ['ws', 'wss'],
      };
      activeConnection = `reverb:${wsHost}`;
    }

    const authUrl = `${API_BASE_URL}/broadcasting/auth`;

    const PusherClass = resolveConstructor(PusherConstructor, 'Pusher');
    const pusherClient = new PusherClass(appKey, {
      ...connectionOptions,
      disableStats: true,
      authorizer: (channel: any) => ({
        authorize: (socketId: string, callback: (error: any, authData?: any) => void) => {
          const token = useAuthStore.getState().token;
          fetch(authUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}`, 'X-Session-Token': token } : {}),
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
              token: token,
            }),
          })
            .then(async (res) => {
              if (!res.ok) {
                const err = await res.text();
                throw new Error(`Broadcast Auth Error ${res.status}: ${err}`);
              }
              return res.json();
            })
            .then((data) => {
              callback(null, data);
            })
            .catch((error) => {
              console.warn('❌ [Echo Authorizer Failed]:', error);
              callback(error);
            });
        },
      }),
    });

    pusherClient.connection.bind('state_change', (states: any) => {
      console.log(`📡 [Reverb WebSocket State]: ${states.previous} -> ${states.current}`);
    });

    pusherClient.connection.bind('connected', () => {
      console.log(`🟢 [Reverb WebSocket Connected Successfully] (${activeConnection})`);
    });

    pusherClient.connection.bind('error', (err: any) => {
      console.warn(`🔴 [Reverb WebSocket Connection Error]:`, err);
    });

    const EchoClass = resolveConstructor(EchoConstructor, 'Echo');

    echoInstance = new EchoClass({
      broadcaster: isPusher ? 'pusher' : 'reverb',
      client: pusherClient,
      Pusher: PusherClass,
    });

    return echoInstance;
  } catch (err) {
    console.error('⚠️ [Echo Init Error] realtime unavailable:', err);
    echoInitFailed = true;
    useRoomStore.getState().setConnected(false);
    // Once the config arrives, fetchBroadcastingConfig sees echoInitFailed and asks the rooms to re-join
    scheduleConfigRetry();
    // Inert stub keeps callers from crashing; the offline banner is shown because isConnected stays false.
    return {
      join: () => ({
        here: () => ({ joining: () => ({ leaving: () => ({ error: () => ({}) }) }) }),
        listen: () => ({ listen: () => ({}) }),
      }),
      leave: () => {},
      disconnect: () => {},
      socketId: () => undefined,
    };
  }
}

export function disconnectEcho() {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {}
    echoInstance = null;
  }
}
