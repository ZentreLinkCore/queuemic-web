import { describe, it, expect } from 'vitest';
import { toServerTime, toLocalTime, setServerOffsetMsForTest, getServerOffsetMs } from '../../src/services/serverClock';

describe('serverClock service', () => {
  it('converts local time to server time and back using offset', () => {
    // If server is 5000ms ahead of client
    setServerOffsetMsForTest(5000);
    expect(getServerOffsetMs()).toBe(5000);

    const localNow = 1700000000000;
    const serverNow = toServerTime(localNow);
    expect(serverNow).toBe(localNow + 5000);

    const backToLocal = toLocalTime(serverNow);
    expect(backToLocal).toBe(localNow);
  });

  it('handles negative offsets when server clock is behind client', () => {
    setServerOffsetMsForTest(-3000);
    expect(getServerOffsetMs()).toBe(-3000);

    const localNow = 1700000000000;
    const serverNow = toServerTime(localNow);
    expect(serverNow).toBe(localNow - 3000);

    const backToLocal = toLocalTime(serverNow);
    expect(backToLocal).toBe(localNow);
  });
});
