import {
  ScanReportResponse,
  ScanHistoryItem,
  StatsSummary,
  SystemConfig,
  CorrelationCluster,
  GlobalGraphData,
  ScanType,
  RiskLevel
} from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Accept': 'application/json',
      ...(!options.body || typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        let errorMsg = `Server error ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errorMsg;
        } catch {
          // Fallback if not json
        }
        throw new Error(errorMsg);
      }
      return await response.json();
    } catch (err: any) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // Scanner Endpoints
  async scanSMS(text: string, sender?: string): Promise<ScanReportResponse> {
    return this.request<ScanReportResponse>('/api/scan/sms', {
      method: 'POST',
      body: JSON.stringify({ text, sender: sender || null }),
    });
  }

  async scanURL(url: string): Promise<ScanReportResponse> {
    return this.request<ScanReportResponse>('/api/scan/url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async scanQRText(content: string, filename?: string): Promise<ScanReportResponse> {
    return this.request<ScanReportResponse>('/api/scan/qr/text', {
      method: 'POST',
      body: JSON.stringify({ content, filename: filename || null }),
    });
  }

  async scanQRUpload(file: File): Promise<ScanReportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<ScanReportResponse>('/api/scan/qr/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getScanReport(id: string): Promise<ScanReportResponse> {
    return this.request<ScanReportResponse>(`/api/scan/${id}`);
  }

  // Dashboard Stats
  async getStats(): Promise<StatsSummary> {
    return this.request<StatsSummary>('/api/stats');
  }

  // History Endpoints
  async getHistory(params?: {
    q?: string;
    scan_type?: string;
    risk_level?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScanHistoryItem[]> {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.scan_type && params.scan_type !== 'all') query.append('scan_type', params.scan_type);
    if (params?.risk_level && params.risk_level !== 'all') query.append('risk_level', params.risk_level);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    return this.request<ScanHistoryItem[]>(`/api/history?${query.toString()}`);
  }

  async deleteScan(id: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/history/${id}`, {
      method: 'DELETE',
    });
  }

  async clearAllHistory(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/api/history', {
      method: 'DELETE',
    });
  }

  async compareScans(id1: string, id2: string): Promise<any> {
    return this.request<any>(`/api/history/compare/${id1}/${id2}`);
  }

  // Correlations
  async getCorrelationsOverview(): Promise<{
    total_shared_clusters: number;
    cross_channel_clusters: number;
    clusters: CorrelationCluster[];
  }> {
    return this.request<any>('/api/correlations/overview');
  }

  async getGlobalGraph(): Promise<GlobalGraphData> {
    return this.request<GlobalGraphData>('/api/correlations/graph');
  }

  // Configuration
  async getConfig(): Promise<SystemConfig> {
    return this.request<SystemConfig>('/api/config');
  }

  async updateThresholds(thresholds: { low_max: number; medium_max: number; high_max: number }): Promise<any> {
    return this.request<any>('/api/config/thresholds', {
      method: 'POST',
      body: JSON.stringify(thresholds),
    });
  }

  async seedData(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/api/config/seed', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
