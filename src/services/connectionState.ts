export interface PusherLikeConnection {
  state?: string;
  bind: (event: string, cb: (states: { current: string }) => void) => void;
  unbind: (event: string, cb: (states: { current: string }) => void) => void;
}

/**
 * Mirrors the WebSocket connection state into the room store (spec EC-04: offline indicator).
 * Returns an unbind function.
 */
export function bindConnectionState(
  connection: PusherLikeConnection | undefined,
  setConnected: (connected: boolean) => void
): () => void {
  if (!connection) return () => {};
  const onChange = ({ current }: { current: string }) => setConnected(current === 'connected');
  if (connection.state) setConnected(connection.state === 'connected');
  connection.bind('state_change', onChange);
  return () => connection.unbind('state_change', onChange);
}
