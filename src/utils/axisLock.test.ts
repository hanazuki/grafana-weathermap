import { constrainToAxis, decideAxis } from './axisLock';

const origin = { x: 100, y: 200 };

describe('decideAxis', () => {
  test('returns null below the threshold', () => {
    expect(decideAxis(origin, { x: 104, y: 196 }, 5)).toBeNull();
  });

  test('picks the axis with the larger movement', () => {
    expect(decideAxis(origin, { x: 130, y: 210 }, 5)).toBe('x');
    expect(decideAxis(origin, { x: 90, y: 160 }, 5)).toBe('y');
  });

  test('ties go to x', () => {
    expect(decideAxis(origin, { x: 110, y: 210 }, 5)).toBe('x');
  });
});

describe('constrainToAxis', () => {
  const position = { x: 150, y: 260 };

  test('keeps y at the origin when locked to x', () => {
    expect(constrainToAxis(origin, position, 'x')).toEqual({ x: 150, y: 200 });
  });

  test('keeps x at the origin when locked to y', () => {
    expect(constrainToAxis(origin, position, 'y')).toEqual({ x: 100, y: 260 });
  });

  test('stays at the origin while no axis is decided', () => {
    expect(constrainToAxis(origin, position, null)).toEqual(origin);
  });
});
