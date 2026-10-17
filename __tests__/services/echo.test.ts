import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const config = { data: { broadcaster: 'reverb', key: 'app-key', host: 'localhost', port: 8082, scheme: 'http' } };

describe('getEcho when the broadcasting config cannot be fetched (code review #2)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubEnv('VITE_REVERB_APP_KEY', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('keeps retrying with backoff and re-joins once the config arrives', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline')) // eager fetch when the module loads
      .mockRejectedValueOnce(new Error('offline')) // getEcho's own attempt
      .mockRejectedValueOnce(new Error('offline')) // first retry, after 2 s
      .mockResolvedValue({ ok: true, json: async () => config }); // second retry, 4 s later
    vi.stubGlobal('fetch', fetchMock);

    const echo = await import('../../src/services/echo');
    await vi.advanceTimersByTimeAsync(0);
    const onReset = vi.fn();
    echo.onEchoReset(onReset);

    // No app key yet: the inert stub comes back, and the room shows offline
    const stub = echo.getEcho();
    expect(stub.connector).toBeUndefined();

    await vi.advanceTimersByTimeAsync(2000);
    expect(onReset).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(4000);
    expect(onReset).toHaveBeenCalledTimes(1);

    // Config in hand: no further retries
    const calls = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
