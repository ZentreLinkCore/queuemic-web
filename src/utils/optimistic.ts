/**
 * Optimistic update helper (spec §8: "Optimistic … Rollback state on failure").
 * Runs `apply` immediately, then `request`; if the request rejects, `rollback` restores the previous state.
 * Resolves true on success, false after a rollback.
 */
export async function runOptimistic(
  apply: () => void,
  rollback: () => void | Promise<void>,
  request: () => Promise<unknown>
): Promise<boolean> {
  apply();
  try {
    await request();
    return true;
  } catch (err) {
    console.warn('Optimistic update failed, rolling back:', err);
    await rollback();
    return false;
  }
}
