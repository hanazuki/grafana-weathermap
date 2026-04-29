export interface WeathermapOptions {
  nodes: NodeConfig[];
  links: LinkConfig[];
  queries: QueryConfig[];
  colorScaleMode: 'linear' | 'log';
  logScaleBase?: number; // integer in [2, 10]; only used when colorScaleMode='log' (default: 10)
  nodeWidth?: number;
  nodeHeight?: number;
  nodeLabelPattern?: string;
  nodeLabelReplacement?: string;
  linkStrokeWidth?: number; // half-arrow line stroke width in pixels (default: 4; min: 1)
  linkTipLength?: number; // pencil-tip triangle length in pixels (default: 8; min: 1)
  linkLabelDistance?: number; // distance of speed label from midpoint in pixels (default: 40; min: 1)
  linkParallelOffset?: number; // perpendicular gap per step between parallel links in pixels (default: 6; min: 1)
  linkLabelFontSize?: number; // font size of speed label text in pixels (default: 10; min: 1)
  dataMaxAge?: number; // seconds; latest value older than this relative to timeRange.to is treated as missing
}

export type QueryConfig = LinkTrafficQueryConfig | NodeHealthQueryConfig;
export type QueryType = QueryConfig['type'];

export type TrafficDirection = 'ingress' | 'egress';
export interface LinkTrafficQueryConfig {
  id: number; // internal auto-incremented integer (≥1); never shown to users
  refId: string; // Grafana query refId (e.g. "A") — must match the panel's data query
  type: 'linkTraffic';
  instanceLabelKey: string | null;
  interfaceLabelKey: string | null;
  descriptionLabel?: string | null;
  direction: TrafficDirection;
}

export interface NodeHealthQueryConfig {
  id: number; // internal auto-incremented integer (≥1); never shown to users
  refId: string; // Grafana query refId
  type: 'nodeHealth';
  instanceLabelKey: string | null; // e.g., "host", "instance"
}

// null (at use sites) = health series is configured but has no current data → gray indicator
// undefined (at use sites) = no health series configured → indicator not rendered
export type HealthStatus = 'up' | 'down';

export interface TimeSeries<T> {
  getValueAt(timestampMs: number | null): { value: T; timestamp: number } | null;
  getLatestValue(): { value: T; timestamp: number } | null;
  getValues(): { values: T[]; timestamps: number[] };
}

export interface NodeConfig {
  id: number; // internal auto-incremented integer (≥1); never shown to users; immutable once created
  name: string; // user-visible display name; also the string matched against metric labels
  x?: number;
  y?: number;
  statusQueryId?: number; // query internal ID for health status; matches series where labels[instanceLabelKey] === node.name
  description?: string;
}

export interface LinkConfig {
  id: number; // internal auto-incremented integer (≥1); never shown to users
  aNodeId: number; // A node's internal ID
  aInterface: string;
  zNodeId: number; // Z node's internal ID
  zInterface: string;
  capacity: number; // bps, denominator for utilization coloring
  atozQueryId?: number; // query internal ID for A-to-Z traffic
  ztoaQueryId?: number; // query internal ID for Z-to-A traffic
  description?: string;
}
