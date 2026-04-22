import { FieldType, type PanelData } from '@grafana/data';
import type { LinkTrafficQueryConfig, NodeHealthQueryConfig } from '../types';
import { collectInterfaces, collectLabels, findHealthTimeSeries, findTrafficTimeSeries } from './matching';

function makeFrame(
  refId: string,
  timeValues: number[],
  numericFields: Array<{ labels?: Record<string, string>; values: number[] }>,
) {
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

function makeData(frames: Array<ReturnType<typeof makeFrame>>, timeRangeToMs?: number): PanelData {
  return {
    series: frames,
    ...(timeRangeToMs !== undefined ? { timeRange: { to: { valueOf: () => timeRangeToMs } } } : {}),
  } as unknown as PanelData;
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

describe('collectLabels', () => {
  const frame = makeFrame(
    'A',
    [1000, 2000],
    [
      { labels: { instance: 'router-1', ifName: 'eth0' }, values: [10, 20] },
      { labels: { instance: 'router-1', region: 'us-east' }, values: [30, 40] },
    ],
  );

  test('basic match: returns all label keys from numeric fields, sorted ascending', () => {
    const result = collectLabels([frame], 'A');
    expect(result).toEqual(['ifName', 'instance', 'region']);
  });

  test('wrong refId filtered: frames for a different refId are excluded', () => {
    const result = collectLabels([frame], 'Z');
    expect(result).toEqual([]);
  });

  test('deduplication: the same label key from multiple fields appears exactly once', () => {
    const result = collectLabels([frame], 'A');
    const instanceCount = result.filter((k) => k === 'instance').length;
    expect(instanceCount).toBe(1);
  });

  test('sorting: returned keys are in ascending alphabetical order', () => {
    const result = collectLabels([frame], 'A');
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });

  test('empty frames: no frames returns []', () => {
    const result = collectLabels([], 'A');
    expect(result).toEqual([]);
  });

  test('no frames matching refId returns []', () => {
    const frameB = makeFrame('B', [1000], [{ labels: { foo: 'bar' }, values: [1] }]);
    const result = collectLabels([frameB], 'A');
    expect(result).toEqual([]);
  });
});

describe('collectInterfaces', () => {
  const frame = makeFrame(
    'A',
    [1000, 2000],
    [
      { labels: { instance: 'router-1', ifName: 'eth0' }, values: [10, 20] },
      { labels: { instance: 'router-1', ifName: 'eth1' }, values: [30, 40] },
      { labels: { instance: 'router-2', ifName: 'eth0' }, values: [50, 60] },
    ],
  );

  test('basic match: returns interface name for matching instance and interface label', () => {
    const result = collectInterfaces([frame], [trafficQuery()], 'router-1');
    expect(result).toEqual([
      { name: 'eth0', description: null },
      { name: 'eth1', description: null },
    ]);
  });

  test('interfaceLabelKey null: query is skipped, returns []', () => {
    const result = collectInterfaces([frame], [trafficQuery({ interfaceLabelKey: null })], 'router-1');
    expect(result).toEqual([]);
  });

  test('instanceLabelKey null: all fields included regardless of instance', () => {
    const result = collectInterfaces([frame], [trafficQuery({ instanceLabelKey: null })], 'ignored');
    expect(result).toEqual([
      { name: 'eth0', description: null },
      { name: 'eth1', description: null },
    ]);
  });

  test('no instance match: field instance does not match nodeName, returns []', () => {
    const result = collectInterfaces([frame], [trafficQuery()], 'router-99');
    expect(result).toEqual([]);
  });

  test('deduplication: same interface name from multiple fields appears once', () => {
    const result = collectInterfaces([frame], [trafficQuery({ instanceLabelKey: null })], 'ignored');
    const eth0Count = result.filter((r) => r.name === 'eth0').length;
    expect(eth0Count).toBe(1);
  });

  test('sorting: returned names are in ascending alphabetical order', () => {
    const frameUnsorted = makeFrame(
      'A',
      [1000],
      [
        { labels: { instance: 'r1', ifName: 'eth2' }, values: [1] },
        { labels: { instance: 'r1', ifName: 'eth0' }, values: [2] },
        { labels: { instance: 'r1', ifName: 'eth1' }, values: [3] },
      ],
    );
    const result = collectInterfaces([frameUnsorted], [trafficQuery()], 'r1');
    expect(result.map((r) => r.name)).toEqual(['eth0', 'eth1', 'eth2']);
  });

  test('empty queries array: returns []', () => {
    const result = collectInterfaces([frame], [], 'router-1');
    expect(result).toEqual([]);
  });

  test('multiple queries / frames: results merged, deduplicated, sorted', () => {
    const frameB = makeFrame('B', [1000], [{ labels: { instance: 'router-1', ifName: 'eth2' }, values: [10] }]);
    const queryA = trafficQuery({ refId: 'A' });
    const queryB = trafficQuery({ refId: 'B', id: 2 });
    const result = collectInterfaces([frame, frameB], [queryA, queryB], 'router-1');
    expect(result).toEqual([
      { name: 'eth0', description: null },
      { name: 'eth1', description: null },
      { name: 'eth2', description: null },
    ]);
  });

  test('descriptionLabel set: returns description from matching field', () => {
    const frameWithAlias = makeFrame(
      'A',
      [1000],
      [{ labels: { instance: 'router-1', ifName: 'eth0', ifAlias: 'Uplink' }, values: [10] }],
    );
    const result = collectInterfaces([frameWithAlias], [trafficQuery({ descriptionLabel: 'ifAlias' })], 'router-1');
    expect(result).toEqual([{ name: 'eth0', description: 'Uplink' }]);
  });

  test('descriptionLabel null: description is always null', () => {
    const frameWithAlias = makeFrame(
      'A',
      [1000],
      [{ labels: { instance: 'router-1', ifName: 'eth0', ifAlias: 'Uplink' }, values: [10] }],
    );
    const result = collectInterfaces([frameWithAlias], [trafficQuery({ descriptionLabel: null })], 'router-1');
    expect(result).toEqual([{ name: 'eth0', description: null }]);
  });

  test('descriptionLabel set but key absent from field: description is null', () => {
    const frameNoAlias = makeFrame('A', [1000], [{ labels: { instance: 'router-1', ifName: 'eth0' }, values: [10] }]);
    const result = collectInterfaces([frameNoAlias], [trafficQuery({ descriptionLabel: 'ifAlias' })], 'router-1');
    expect(result).toEqual([{ name: 'eth0', description: null }]);
  });

  test('newer non-null wins over older non-null', () => {
    const olderFrame = makeFrame(
      'A',
      [1000],
      [{ labels: { instance: 'router-1', ifName: 'eth0', ifAlias: 'Old' }, values: [10] }],
    );
    const newerFrame = makeFrame(
      'A',
      [2000],
      [{ labels: { instance: 'router-1', ifName: 'eth0', ifAlias: 'New' }, values: [20] }],
    );
    const result = collectInterfaces(
      [olderFrame, newerFrame],
      [trafficQuery({ descriptionLabel: 'ifAlias' })],
      'router-1',
    );
    expect(result).toEqual([{ name: 'eth0', description: 'New' }]);
  });

  test('newer null does not overwrite older non-null', () => {
    const olderFrame = makeFrame(
      'A',
      [1000],
      [{ labels: { instance: 'router-1', ifName: 'eth0', ifAlias: 'Old' }, values: [10] }],
    );
    const newerFrame = makeFrame('A', [2000], [{ labels: { instance: 'router-1', ifName: 'eth0' }, values: [20] }]);
    const result = collectInterfaces(
      [olderFrame, newerFrame],
      [trafficQuery({ descriptionLabel: 'ifAlias' })],
      'router-1',
    );
    expect(result).toEqual([{ name: 'eth0', description: 'Old' }]);
  });

  test('frame with no time field is skipped', () => {
    const frameNoTime = {
      refId: 'A',
      length: 1,
      fields: [
        {
          name: 'Value',
          type: FieldType.number,
          labels: { instance: 'router-1', ifName: 'eth0' },
          values: [10],
          config: {},
        },
      ],
    };
    const result = collectInterfaces(
      [frameNoTime as unknown as Parameters<typeof collectInterfaces>[0][0]],
      [trafficQuery()],
      'router-1',
    );
    expect(result).toEqual([]);
  });

  test('interface collected with null description when all frames have null desc', () => {
    const frameNullDesc = makeFrame('A', [1000], [{ labels: { instance: 'router-1', ifName: 'eth0' }, values: [10] }]);
    const result = collectInterfaces([frameNullDesc], [trafficQuery({ descriptionLabel: 'ifAlias' })], 'router-1');
    expect(result).toEqual([{ name: 'eth0', description: null }]);
  });
});

describe('findTrafficTimeSeries', () => {
  const frame = makeFrame(
    'A',
    [1000, 2000],
    [
      { labels: { instance: 'router-1', ifName: 'eth0' }, values: [10, 20] },
      { labels: { instance: 'router-1', ifName: 'eth1' }, values: [30, 40] },
    ],
  );
  const data = makeData([frame]);

  // Helper: call with router-1 as the source (egress picks src labels)
  const call = (
    qc: LinkTrafficQueryConfig,
    srcName: string,
    srcIface: string,
    dstName = 'router-z',
    dstIface = 'eth9',
  ) =>
    findTrafficTimeSeries({
      data,
      queryConfig: qc,
      srcNode: { name: srcName, iface: srcIface },
      dstNode: { name: dstName, iface: dstIface },
    });

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
  const directionFrame = makeFrame(
    'A',
    [1000, 2000],
    [
      { labels: { instance: 'router-a', ifName: 'eth0' }, values: [10, 20] },
      { labels: { instance: 'router-b', ifName: 'eth1' }, values: [30, 40] },
    ],
  );
  const directionData = makeData([directionFrame]);
  // atoz slot: src=router-a (A side), dst=router-b (Z side)
  const directionCall = (qc: LinkTrafficQueryConfig) =>
    findTrafficTimeSeries({
      data: directionData,
      queryConfig: qc,
      srcNode: { name: 'router-a', iface: 'eth0' },
      dstNode: { name: 'router-b', iface: 'eth1' },
    });
  // ztoa slot: src=router-b (Z side), dst=router-a (A side)
  const directionCallZtoa = (qc: LinkTrafficQueryConfig) =>
    findTrafficTimeSeries({
      data: directionData,
      queryConfig: qc,
      srcNode: { name: 'router-b', iface: 'eth1' },
      dstNode: { name: 'router-a', iface: 'eth0' },
    });

  test('direction egress: selects src labels', () => {
    // atoz: src=router-a/eth0 → values [10,20]
    const ts = directionCall(trafficQuery({ direction: 'egress' }));
    expect(ts).not.toBeNull();
    expect(ts!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
    // ztoa: src=router-b/eth1 → values [30,40]
    const tsZtoa = directionCallZtoa(trafficQuery({ direction: 'egress' }));
    expect(tsZtoa).not.toBeNull();
    expect(tsZtoa!.getLatestValue()).toEqual({ value: 40, timestamp: 2000 });
  });

  test('direction ingress: selects dst labels', () => {
    // atoz: dst=router-b/eth1 → values [30,40]
    const ts = directionCall(trafficQuery({ direction: 'ingress' }));
    expect(ts).not.toBeNull();
    expect(ts!.getLatestValue()).toEqual({ value: 40, timestamp: 2000 });
    // ztoa: dst=router-a/eth0 → values [10,20]
    const tsZtoa = directionCallZtoa(trafficQuery({ direction: 'ingress' }));
    expect(tsZtoa).not.toBeNull();
    expect(tsZtoa!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
  });

  test('direction egress with null instanceLabelKey: src iface still matches', () => {
    const ts = directionCall(trafficQuery({ direction: 'egress', instanceLabelKey: null }));
    expect(ts).not.toBeNull();
    // src iface is eth0; first series with ifName=eth0 is router-a [10,20]
    expect(ts!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
  });

  test('direction ingress with null interfaceLabelKey: dst instance still matches', () => {
    const ts = directionCall(trafficQuery({ direction: 'ingress', interfaceLabelKey: null }));
    expect(ts).not.toBeNull();
    // dst instance is router-b; first series with instance=router-b is [30,40]
    expect(ts!.getLatestValue()).toEqual({ value: 40, timestamp: 2000 });
  });

  describe('staleness (maxAgeMs)', () => {
    // frame has timestamps [1000, 2000]; latest value is 20 at t=2000
    const staleFrame = makeFrame('A', [1000, 2000], [{ labels: { instance: 'router-1', ifName: 'eth0' }, values: [10, 20] }]);
    const call = (maxAgeMs: number, timeRangeToMs: number) =>
      findTrafficTimeSeries({
        data: makeData([staleFrame], timeRangeToMs),
        queryConfig: trafficQuery(),
        srcNode: { name: 'router-1', iface: 'eth0' },
        dstNode: { name: 'router-z', iface: 'eth9' },
        maxAgeMs,
      });

    test('returns null when gap between timeRange.to and last timestamp exceeds maxAgeMs', () => {
      // gap = 5000 - 2000 = 3000 > 2000
      expect(call(2000, 5000)!.getLatestValue()).toBeNull();
    });

    test('returns value when gap equals maxAgeMs (boundary: not stale)', () => {
      // gap = 4000 - 2000 = 2000, not > 2000
      expect(call(2000, 4000)!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
    });

    test('returns value when gap is within maxAgeMs', () => {
      // gap = 3500 - 2000 = 1500 < 2000
      expect(call(2000, 3500)!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
    });

    test('no maxAgeMs: returns value regardless of age', () => {
      const ts = findTrafficTimeSeries({
        data: makeData([staleFrame], 9999999),
        queryConfig: trafficQuery(),
        srcNode: { name: 'router-1', iface: 'eth0' },
        dstNode: { name: 'router-z', iface: 'eth9' },
      });
      expect(ts!.getLatestValue()).toEqual({ value: 20, timestamp: 2000 });
    });
  });
});

describe('findHealthTimeSeries', () => {
  const frame = makeFrame(
    'B',
    [1000, 2000, 3000],
    [
      { labels: { instance: 'host-1' }, values: [1, 0, 1] },
      { labels: { instance: 'host-2' }, values: [0, 0, 0] },
    ],
  );
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
