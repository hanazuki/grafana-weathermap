import type { XYPosition } from '@xyflow/react';

export type Axis = 'x' | 'y';

/**
 * Decides which axis a drag is moving along, or null while the movement from
 * the origin is still below the threshold on both axes.
 * Ties go to the x axis.
 */
export function decideAxis(origin: XYPosition, position: XYPosition, threshold: number): Axis | null {
  const dx = Math.abs(position.x - origin.x);
  const dy = Math.abs(position.y - origin.y);
  if (dx < threshold && dy < threshold) {
    return null;
  }
  return dx >= dy ? 'x' : 'y';
}

/**
 * Pins the coordinate perpendicular to the locked axis back to the origin.
 * With no axis decided yet, the node stays at the origin.
 */
export function constrainToAxis(origin: XYPosition, position: XYPosition, axis: Axis | null): XYPosition {
  switch (axis) {
    case 'x':
      return { x: position.x, y: origin.y };
    case 'y':
      return { x: origin.x, y: position.y };
    default:
      return { x: origin.x, y: origin.y };
  }
}
