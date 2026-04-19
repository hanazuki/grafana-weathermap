import { BusEventWithPayload } from '@grafana/data';
import { usePanelContext } from '@grafana/ui';
import { useCallback, useSyncExternalStore } from 'react';
import * as z from 'zod/v4/core';

class LocalStorageChangeEvent extends BusEventWithPayload<{ key: string }> {
  static type = 'iwm-local-storage-change';
}

function readValue<T extends z.$ZodType>(key: string, schema: T): z.infer<T> {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return z.parse(schema, undefined);
  }
  const result = z.safeParse(schema, JSON.parse(raw));
  return result.success ? result.data : z.parse(schema, undefined);
}

export const useLocalStorage = <T extends z.$ZodType>(
  key: string,
  schema: T,
): [z.infer<T>, (value: z.infer<T>) => void] => {
  const { eventBus } = usePanelContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const sub = eventBus.subscribe(LocalStorageChangeEvent, (e) => {
        if (e.payload.key === key) {
          onStoreChange();
        }
      });

      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          onStoreChange();
        }
      };
      window.addEventListener('storage', onStorage);

      return () => {
        window.removeEventListener('storage', onStorage);
        sub.unsubscribe();
      };
    },
    [key, eventBus],
  );

  const getSnapshot = useCallback(() => readValue(key, schema), [key, schema]);

  const value = useSyncExternalStore(subscribe, getSnapshot);

  const setValue = useCallback(
    (newValue: z.infer<T>) => {
      localStorage.setItem(key, JSON.stringify(newValue));
      eventBus.publish(new LocalStorageChangeEvent({ key }));
    },
    [key, eventBus],
  );

  return [value, setValue];
};
