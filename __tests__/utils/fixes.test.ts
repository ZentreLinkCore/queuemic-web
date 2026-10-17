import { describe, it, expect, vi } from 'vitest';
import { validateJoinInput, JOIN_REQUIRED_MESSAGE, JOIN_CODE_LENGTH_MESSAGE } from '../../src/utils/validation';
import { runOptimistic } from '../../src/utils/optimistic';
import { bindConnectionState } from '../../src/services/connectionState';

describe('validateJoinInput (EC-01)', () => {
  it('requires both nickname and room code', () => {
    expect(validateJoinInput('ABC123', '')).toBe(JOIN_REQUIRED_MESSAGE);
    expect(validateJoinInput('', 'Sam')).toBe(JOIN_REQUIRED_MESSAGE);
    expect(validateJoinInput('   ', '   ')).toBe(JOIN_REQUIRED_MESSAGE);
  });

  it('requires a 6-character code', () => {
    expect(validateJoinInput('ABCD', 'Sam')).toBe(JOIN_CODE_LENGTH_MESSAGE);
    expect(validateJoinInput('ABCDEFG', 'Sam')).toBe(JOIN_CODE_LENGTH_MESSAGE);
  });

  it('accepts valid input', () => {
    expect(validateJoinInput('ABC123', 'Sam')).toBeNull();
  });
});

describe('runOptimistic (rollback on failure)', () => {
  it('keeps the optimistic state when the request succeeds', async () => {
    const state = { v: 'playing' };
    const ok = await runOptimistic(
      () => { state.v = 'paused'; },
      () => { state.v = 'playing'; },
      () => Promise.resolve({ success: true })
    );
    expect(ok).toBe(true);
    expect(state.v).toBe('paused');
  });

  it('restores the previous state when the request fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = { v: 'playing' };
    const ok = await runOptimistic(
      () => { state.v = 'paused'; },
      () => { state.v = 'playing'; },
      () => Promise.reject({ status: 500 })
    );
    expect(ok).toBe(false);
    expect(state.v).toBe('playing');
  });
});

describe('bindConnectionState (EC-04)', () => {
  it('mirrors connection state changes and unbinds', () => {
    let handler: ((s: { current: string }) => void) | undefined;
    const connection = {
      state: 'connected',
      bind: vi.fn((_e: string, cb: (s: { current: string }) => void) => { handler = cb; }),
      unbind: vi.fn(),
    };
    const setConnected = vi.fn();

    const unbind = bindConnectionState(connection, setConnected);
    expect(setConnected).toHaveBeenLastCalledWith(true);

    handler!({ current: 'unavailable' });
    expect(setConnected).toHaveBeenLastCalledWith(false);
    handler!({ current: 'connected' });
    expect(setConnected).toHaveBeenLastCalledWith(true);

    unbind();
    expect(connection.unbind).toHaveBeenCalledWith('state_change', handler);
  });
});
