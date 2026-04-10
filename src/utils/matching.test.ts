import { FieldType, PanelData } from '@grafana/data';
import { findTrafficTimeSeries, findHealthTimeSeries } from './matching';
import { LinkTrafficQueryConfig, NodeHealthQueryConfig } from '../types';

function makeFrame(refId: string, timeValues: number[], numericFields: Array<{ labels?: Record<string, string>; values: number[] }>) {
  return {
    refId,
    length: timeValues.length,
    fields: [
      { name: 'Time', type: FieldType.time, values: timeValues, config: {} },
      ...numericFields.map((f) => ({
        name: 'Value',
        type: FieldType.number,
        labels: f.labels ?? {},
        values: f.values,
        config: {},
      })),
    ],
  };
}

function makeData(frames: Array<ReturnType<typeof makeFrame>>): PanelData {
  return { series: frames } as unknown as PanelData;
}

const trafficQuery = (overrides: Partial<LinkTrafficQueryConfig> = {}): LinkTrafficQueryConfig => ({
  id: 1,
  refId: 'A',
  type: 'linkTraffic',
  instanceLabelKey: 'instance',
  interfaceLabelKey: 'ifName',
  direction: 'egress',
  ...overrides,
});

const healthQuery = (overrides: Partial<NodeHealthQueryConfig> = {}): NodeHealthQueryConfig => ({
  id: 2,
  refId: 'B',
  type: 'nodeHealth',
  instanceLabelKey: 'instance',
  ...overrides,
});

// ---------------------------------------------------------------------------
// findTrafficTimeSeries
// ---------------------------------------------------------------------------

describe('findTrafficTimeSeries', () => {
  const frame = makeFrame('A', [1000, 2000], [
    { labels: { instance: 'router-1', ifName: 'eth0' }, values: [10, 20] },
    { labels: { instance: 'router-1', ifName: 'eth1' }, values: [30, 40] },
  ]);
  const data = makeData([frame]);

  // Helper: call with router-1 on the A-side (egress picks A-side labels)
  const call = (qc: LinkTrafficQueryConfig, aName: string, aIface: string, zName = 'router-z', zIface = 'eth9') =>
    findTrafficTimeSeries({ data, queryConfig: qc, aNode: { name: aName, iface: aIface }, zNode: { name: zName, iface: zIface } });

  test('non-null keys: returns matching series (regression)', () => {
    const ts = call(trafficQuery(), 'router-1', 'eth0');
    expect(ts).not.toBeNull();
    expect(ts!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
  });

  test('non-null keys: returns null when no field matches', () => {
    const ts = call(trafficQuery(), 'router-1', 'eth99');
    expect(ts).toBeNull();
  });

  test('null instanceLabelKey: skips instance check, matches on ifName', () => {
    const ts = call(trafficQuery({ instanceLabelKey: null }), 'ignored', 'eth1');
    expect(ts).not.toBeNull();
    expect(ts!.getLatestValue()).toEqual({ value: 40, timestamp: 2000 });
  });

  test('null instanceLabelKey: returns null when ifName still does not match', () => {
    const ts = call(trafficQuery({ instanceLabelKey: null }), 'ignored', 'eth99');
    expect(ts).toBeNull();
  });

  test('null interfaceLabelKey: skips iface check, matches on instance', () => {
    const ts = call(trafficQuery({ interfaceLabelKey: null }), 'router-1', 'ignored');
    expect(ts).not.toBeNull();
    // first numeric field for router-1 is eth0
    expect(ts!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
  });

  test('null interfaceLabelKey: returns null when instance still does not match', () => {
    const ts = call(trafficQuery({ interfaceLabelKey: null }), 'router-99', 'ignored');
    expect(ts).toBeNull();
  });

  test('both null: returns first numeric field', () => {
    const ts = call(trafficQuery({ instanceLabelKey: null, interfaceLabelKey: null }), 'ignored', 'ignored');
    expect(ts).not.toBeNull();
    // first numeric field is eth0 with values [10, 20]
    expect(ts!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
  });

  test('returns null when refId does not match', () => {
    const ts = call(trafficQuery({ refId: 'Z' }), 'router-1', 'eth0');
    expect(ts).toBeNull();
  });

  // direction tests use a frame with both A-side and Z-side series
  const directionFrame = makeFrame('A', [1000, 2000], [
    { labels: { instance: 'router-a', ifName: 'eth0' }, values: [10, 20] },
    { labels: { instance: 'router-b', ifName: 'eth1' }, values: [30, 40] },
  ]);
  const directionData = makeData([directionFrame]);
  const directionCall = (qc: LinkTrafficQueryConfig) =>
    findTrafficTimeSeries({ data: directionData, queryConfig: qc, aNode: { name: 'router-a', iface: 'eth0' }, zNode: { name: 'router-b', iface: 'eth1' } });
  const directionCallSwapped = (qc: LinkTrafficQueryConfig) =>
    findTrafficTimeSeries({ data: directionData, queryConfig: qc, aNode: { name: 'router-b', iface: 'eth1' }, zNode: { name: 'router-a', iface: 'eth0' } });

  test('direction egress: selects A-side labels', () => {
    const ts = directionCall(trafficQuery({ direction: 'egress' }));
    expect(ts).not.toBeNull();
    expect(ts!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
    // swapped: A-side is now router-b/eth1, which has values [30,40]
    const tsSwapped = directionCallSwapped(trafficQuery({ direction: 'egress' }));
    expect(tsSwapped).not.toBeNull();
    expect(tsSwapped!.getLatestValue()).toEqual({ value: 40, timestamp: 2000 });
  });

  test('direction ingress: selects Z-side labels', () => {
    const ts = directionCall(trafficQuery({ direction: 'ingress' }));
    expect(ts).not.toBeNull();
    expect(ts!.getLatestValue()).toEqual({ value: 40, timestamp: 2000 });
    // swapped: Z-side is now router-a/eth0, which has values [10,20]
    const tsSwapped = directionCallSwapped(trafficQuery({ direction: 'ingress' }));
    expect(tsSwapped).not.toBeNull();
    expect(tsSwapped!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
  });

  test('direction egress with null instanceLabelKey: A-side iface still matches', () => {
    const ts = directionCall(trafficQuery({ direction: 'egress', instanceLabelKey: null }));
    expect(ts).not.toBeNull();
    // A-side iface is eth0; first series with ifName=eth0 is router-a [10,20]
    expect(ts!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
  });

  test('direction ingress with null interfaceLabelKey: Z-side instance still matches', () => {
    const ts = directionCall(trafficQuery({ direction: 'ingress', interfaceLabelKey: null }));
    expect(ts).not.toBeNull();
    // Z-side instance is router-b; first series with instance=router-b is [30,40]
    expect(ts!.getLatestValue()).toEqual({ value: 40, timestamp: 2000 });
  });
});

// ---------------------------------------------------------------------------
// findHealthTimeSeries
// ---------------------------------------------------------------------------

describe('findHealthTimeSeries', () => {
  const frame = makeFrame('B', [1000, 2000, 3000], [
    { labels: { instance: 'host-1' }, values: [1, 0, 1] },
    { labels: { instance: 'host-2' }, values: [0, 0, 0] },
  ]);
  const data = makeData([frame]);

  test('non-null instanceLabelKey: returns matching series (regression)', () => {
    const ts = findHealthTimeSeries(data, healthQuery(), 'host-1');
    expect(ts).not.toBeNull();
    expect(ts!.getLatestValue()).toEqual({ value: 'up', timestamp: 3000 });
  });

  test('non-null instanceLabelKey: returns null when no field matches', () => {
    const ts = findHealthTimeSeries(data, healthQuery(), 'host-99');
    expect(ts).toBeNull();
  });

  test('null instanceLabelKey: returns first numeric field regardless of nodeName', () => {
    const ts = findHealthTimeSeries(data, healthQuery({ instanceLabelKey: null }), 'ignored');
    expect(ts).not.toBeNull();
    // first numeric field is host-1
    expect(ts!.getLatestValue()).toEqual({ value: 'up', timestamp: 3000 });
  });

  test('null instanceLabelKey: getValues returns decoded health statuses', () => {
    const ts = findHealthTimeSeries(data, healthQuery({ instanceLabelKey: null }), 'ignored');
    expect(ts!.getValues()).toEqual({ values: ['up', 'down', 'up'], timestamps: [1000, 2000, 3000] });
  });

  test('returns null when refId does not match', () => {
    const ts = findHealthTimeSeries(data, healthQuery({ refId: 'Z' }), 'host-1');
    expect(ts).toBeNull();
  });
});
