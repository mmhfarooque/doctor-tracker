import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** false during server render and hydration, true afterwards — without a setState-in-effect. */
export default function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
