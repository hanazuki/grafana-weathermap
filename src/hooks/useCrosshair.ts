import { DataHoverClearEvent, DataHoverEvent, type EventBus } from '@grafana/data';
import { useEffect, useState } from 'react';

export function useCrosshair(eventBus: EventBus): number | null {
  const [crosshairTime, setCrosshairTime] = useState<number | null>(null);

  useEffect(() => {
    const sub1 = eventBus.subscribe(DataHoverEvent, (e) => {
      const t = e.payload.point.time;
      setCrosshairTime(typeof t === 'number' ? t : null);
    });
    const sub2 = eventBus.subscribe(DataHoverClearEvent, () => {
      setCrosshairTime(null);
    });
    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
    };
  }, [eventBus]);

  return crosshairTime;
}
