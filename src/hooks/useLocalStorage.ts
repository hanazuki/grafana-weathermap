import { useCallback, useSyncExternalStore } from 'react';
import * as z from 'zod/v4/core';

const bus = new Map<string, Set<() => void>>();

function getSet(key: string): Set<() => void> {
  let set = bus.get(key);
  if (!set) {
    set = new Set();
    bus.set(key, set);
  }
  return set;
}

function readValue<T extends z.$ZodType>(key: string, schema: T): z.infer<T> {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return z.parse(schema, undefined);
  }
  const result = z.safeParse(schema, JSON.parse(raw));
  return result.success ? result.data : z.parse(schema, undefined);
}

export default <T extends z.$ZodType>(key: string, schema: T): [z.infer<T>, (value: z.infer<T>) => void] => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      getSet(key).add(onStoreChange);

      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          onStoreChange();
        }
      };
      window.addEventListener('storage', onStorage);

      return () => {
        window.removeEventListener('storage', onStorage);
        getSet(key).delete(onStoreChange);
      };
    },
    [key]
  );

  const getSnapshot = useCallback(() => readValue(key, schema), [key, schema]);

  const value = useSyncExternalStore(subscribe, getSnapshot);

  const setValue = useCallback(
    (newValue: z.infer<T>) => {
      localStorage.setItem(key, JSON.stringify(newValue));
      getSet(key).forEach((fn) => fn());
    },
    [key]
  );

  return [value, setValue];
}
