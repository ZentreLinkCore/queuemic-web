import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../src/store/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('initializes with null auth and default values', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.memberId).toBeNull();
    expect(state.role).toBe('guest');
    expect(state.deviceUuid).toMatch(/^device-web-/);
  });

  it('sets and clears authentication payload', () => {
    useAuthStore.getState().setAuth({
      token: 'jwt-mock-token-xyz',
      memberId: 10,
      nickname: 'Rockstar',
      avatarColor: '#10B981',
      role: 'host',
    });

    let state = useAuthStore.getState();
    expect(state.token).toBe('jwt-mock-token-xyz');
    expect(state.memberId).toBe(10);
    expect(state.nickname).toBe('Rockstar');
    expect(state.avatarColor).toBe('#10B981');
    expect(state.role).toBe('host');

    useAuthStore.getState().clearAuth();
    state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.memberId).toBeNull();
    expect(state.nickname).toBe('');
    expect(state.role).toBe('guest');
  });

  it('updates nickname with trimmed whitespace', () => {
    useAuthStore.getState().setNickname('  Singer Pro  ', '#EC4899');
    const state = useAuthStore.getState();
    expect(state.nickname).toBe('Singer Pro');
    expect(state.avatarColor).toBe('#EC4899');
  });
});
