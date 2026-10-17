import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateRoomPage } from '../../src/pages/CreateRoomPage';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRoomStore } from '../../src/store/useRoomStore';
import { roomApi } from '../../src/api/roomApi';

vi.mock('../../src/api/roomApi', () => ({
  roomApi: {
    createRoom: vi.fn(),
    getRoomDetails: vi.fn(),
    closeRoom: vi.fn(),
  },
}));

describe('CreateRoomPage create failures (Flow 1 step 1)', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setNickname('DJ Alex');
    useRoomStore.getState().leaveRoom();
    vi.mocked(roomApi.createRoom).mockReset();
  });

  const submit = async () => {
    render(
      <MemoryRouter>
        <CreateRoomPage />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('button', { name: /Launch QueueMic Room/i }));
  };

  it('asks the host to check the connection when the network is offline', async () => {
    // No HTTP response: the client rejects the raw axios error
    vi.mocked(roomApi.createRoom).mockRejectedValueOnce({ message: 'Network Error' });
    await submit();

    expect(await screen.findByText('Unable to create room. Please check your connection.')).toBeTruthy();
    expect(screen.queryByText('Network Error')).toBeNull();
  });

  it('shows the server message when the backend rejects the request', async () => {
    vi.mocked(roomApi.createRoom).mockRejectedValueOnce({ status: 422, message: 'The nickname field is required.' });
    await submit();

    expect(await screen.findByText('The nickname field is required.')).toBeTruthy();
  });
});
