import { BusEventWithPayload } from '@grafana/data';
import { usePanelContext } from '@grafana/ui';
import { useCallback, useSyncExternalStore } from 'react';
import * as z from 'zod/v4/mini';
import { json } from '../utils/codec';

class LocalStorageChangeEvent extends BusEventWithPayload<{ key: string }> {
  static type = 'iwm-local-storage-change';
}

function readValue<T>(key: string, schema: z.core.$ZodType<T>): T {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return z.parse(schema, undefined);
  }
  const result = z.safeDecode(json(schema), raw);
  return result.success ? result.data : z.parse(schema, undefined);
}

function writeValue<T>(key: string, schema: z.core.$ZodType<T>, value: T) {
  localStorage.setItem(key, z.encode(json(schema), value));
}

export const useLocalStorage = <T>(key: string, schema: z.core.$ZodType<T>): [T, (value: T) => void] => {
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
    (newValue: T) => {
      writeValue(key, schema, newValue);
      eventBus.publish(new LocalStorageChangeEvent({ key }));
    },
    [key, schema, eventBus],
  );

  return [value, setValue];
};
