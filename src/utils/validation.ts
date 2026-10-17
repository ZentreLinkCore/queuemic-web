export const ROOM_CODE_LENGTH = 6;

export const JOIN_REQUIRED_MESSAGE = 'Nickname and room code are required';
export const JOIN_CODE_LENGTH_MESSAGE = 'Please enter a valid 6-character room code';

/**
 * Client-side guard for the join form (spec EC-01): returns an error message, or null when valid.
 */
export function validateJoinInput(roomCode: string, nickname: string): string | null {
  const code = roomCode.trim();
  if (!code || !nickname.trim()) return JOIN_REQUIRED_MESSAGE;
  if (code.length !== ROOM_CODE_LENGTH) return JOIN_CODE_LENGTH_MESSAGE;
  return null;
}
