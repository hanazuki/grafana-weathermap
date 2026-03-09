export interface WeathermapOptions {
  nodes: NodeConfig[];
  links: LinkConfig[];
  queries: QueryConfig[];
  colorScaleMode: 'linear' | 'log';
  logScaleBase?: number;        // integer in [2, 10]; only used when colorScaleMode='log' (default: 10)
  defaultZoom?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  nodeLabelPattern?: string;
  nodeLabelReplacement?: string;
  linkStrokeWidth?: number;     // half-arrow line stroke width in pixels (default: 4; min: 1)
  linkTipLength?: number;       // pencil-tip triangle length in pixels (default: 8; min: 1)
  linkLabelDistance?: number;   // distance of speed label from midpoint in pixels (default: 40; min: 1)
  linkParallelOffset?: number;  // perpendicular gap per step between parallel links in pixels (default: 6; min: 1)
  linkLabelFontSize?: number;   // font size of speed label text in pixels (default: 10; min: 1)
}

export type QueryConfig = LinkTrafficQueryConfig;

export interface LinkTrafficQueryConfig {
  id: number;       // internal auto-incremented integer (≥1); never shown to users
  refId: string;    // Grafana query refId (e.g. "A") — must match the panel's data query
  type: 'linkTraffic';
  instanceLabelKey: string;
  interfaceLabelKey: string;
}

export interface NodeConfig {
  id: number;   // internal auto-incremented integer (≥1); never shown to users; immutable once created
  name: string; // user-visible display name; also the string matched against metric labels
  x?: number;
  y?: number;
}

export interface LinkConfig {
  id: number;             // internal auto-incremented integer (≥1); never shown to users
  source: number;         // source node's internal ID
  target: number;         // target node's internal ID
  sourceInterface: string;
  targetInterface: string;
  capacity: number;       // bps, denominator for utilization coloring
  inQueryId?: number;     // query internal ID for ingress (target→source) traffic
  inReversed?: boolean;
  outQueryId?: number;    // query internal ID for egress (source→target) traffic
  outReversed?: boolean;
}
