export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type ScanType = 'sms' | 'url' | 'qr';

export interface IndicatorDetail {
  type: string;
  value: string;
  severity: 'info' | 'suspicious' | 'malicious';
  label?: string;
}

export interface HeuristicDetail {
  code: string;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score_impact: number;
  explanation: string;
}

export interface ExternalIntelSource {
  source: string;
  status: 'clean' | 'threat_found' | 'unconfigured' | 'rate_limited' | 'error';
  threat_type?: string;
  details?: string;
  query_time_ms?: number;
  is_external: boolean;
}

export interface CorrelationMatch {
  indicator_type: string;
  indicator_value: string;
  matched_scan_id: string;
  matched_scan_title: string;
  matched_scan_type: ScanType;
  matched_scan_risk: RiskLevel;
  matched_scan_created_at: string;
  channel_crossover: boolean;
  relationship_reason: string;
}

export interface CorrelationGraphNode {
  id: string;
  label: string;
  type: string;
  scan_type?: ScanType;
  risk_level?: RiskLevel;
  details?: string;
}

export interface CorrelationGraphEdge {
  source: string;
  target: string;
  label: string;
  type: string;
}

export interface CorrelationReport {
  total_correlations: number;
  channel_crossover: boolean;
  channels_involved: string[];
  shared_indicators: string[];
  first_seen?: string;
  last_seen?: string;
  matches: CorrelationMatch[];
  graph_nodes: CorrelationGraphNode[];
  graph_edges: CorrelationGraphEdge[];
  caution_statement: string;
}

export interface ScanReportResponse {
  id: string;
  scan_type: ScanType;
  title: string;
  raw_content: string;
  risk_score: number;
  risk_level: RiskLevel;
  insufficient_evidence: boolean;
  evidence_statement: string;
  indicators: IndicatorDetail[];
  heuristics: HeuristicDetail[];
  threat_intel: ExternalIntelSource[];
  correlations: CorrelationReport;
  recommendations: string[];
  created_at: string;
}

export interface ScanHistoryItem {
  id: string;
  scan_type: ScanType;
  title: string;
  raw_preview: string;
  risk_score: number;
  risk_level: RiskLevel;
  correlation_count: number;
  created_at: string;
}

export interface StatsSummary {
  total_scans: number;
  suspicious_scans: number;
  high_risk_scans: number;
  correlated_indicators: number;
  channel_breakdown: {
    sms: number;
    url: number;
    qr: number;
  };
  risk_breakdown: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };
  recent_activity: ScanHistoryItem[];
  recent_alerts: {
    id: string;
    scan_type: ScanType;
    title: string;
    risk_level: RiskLevel;
    risk_score: number;
    correlation_count: number;
    created_at?: string;
    message: string;
  }[];
}

export interface SystemConfig {
  thresholds: {
    low_max: number;
    medium_max: number;
    high_max: number;
    critical_min: number;
  };
  integrations: {
    google_safe_browsing: {
      name: string;
      configured: boolean;
      key_env_var: string;
      status: string;
    };
    urlhaus: {
      name: string;
      configured: boolean;
      key_env_var: string;
      status: string;
    };
    local_threat_db: {
      name: string;
      configured: boolean;
      status: string;
    };
  };
  ssrf_protection: {
    status: string;
    rfc1918_blocked: boolean;
    cloud_metadata_blocked: boolean;
  };
}

export interface CorrelationCluster {
  indicator_value: string;
  indicator_type: string;
  occurrences: number;
  channels: string[];
  is_cross_channel: boolean;
  associated_scans: {
    id: string;
    title: string;
    scan_type: ScanType;
    risk_level: RiskLevel;
    risk_score: number;
    created_at?: string;
  }[];
}

export interface GlobalGraphData {
  nodes: {
    id: string;
    label: string;
    full_label?: string;
    type: string;
    scan_type?: ScanType;
    risk_level?: RiskLevel;
    risk_score?: number;
    created_at?: string;
    indicator_type?: string;
    is_shared?: boolean;
    severity?: string;
  }[];
  edges: {
    source: string;
    target: string;
    label: string;
    type: string;
  }[];
  stats: {
    node_count: number;
    edge_count: number;
    scans_represented: number;
  };
}
