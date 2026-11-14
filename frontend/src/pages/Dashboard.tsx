import React, { useEffect, useState } from 'react';
import { StatsSummary, ScanHistoryItem } from '../services/types';
import { api } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  GitMerge, 
  PlusCircle, 
  Flame, 
  MessageSquare, 
  Globe, 
  QrCode, 
  ArrowUpRight, 
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  onNavigateToScan: () => void;
  onViewReport: (scanId: string) => void;
  onExploreCorrelations: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToScan,
  onViewReport,
  onExploreCorrelations,
}) => {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const data = await api.getStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Unable to connect to CLAVIS backend service. Ensure backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-blue-500/20 border-b-blue-400 animate-spin"></div>
        </div>
        <p className="font-mono text-sm text-cyan-400 tracking-wider animate-pulse">
          INITIALIZING CYBER DEFENSE TELEMETRY...
        </p>
      </div>
    );
  }

  const riskCounts = stats?.risk_breakdown || { Low: 0, Medium: 0, High: 0, Critical: 0 };
  const totalScans = stats?.total_scans || 0;
  const channelCounts = stats?.channel_breakdown || { sms: 0, url: 0, qr: 0 };

  return (
    <div className="space-y-6">
      {/* Top Banner with Tagline & Quick Action */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-850 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-mono font-medium text-cyan-300">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Cross-Channel Threat Correlation Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
              One scan. Multiple threat signals. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Smarter protection.</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Detect deceptive SMS, malicious URLs, and quishing QR codes. CLAVIS automatically correlates indicators across delivery channels to reveal unified attacker infrastructure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-800 bg-navy-900/80 hover:bg-navy-800 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onNavigateToScan}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-navy-950 font-bold px-5 py-3 rounded-xl shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="h-5 w-5" />
              <span>Perform Threat Scan</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadDashboardData} className="underline text-xs font-bold">Retry</button>
        </div>
      )}

      {/* 4 Core Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Scans */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Total Scans Performed</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-mono font-bold text-white mb-1">
            {stats?.total_scans ?? 0}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold font-mono">Live</span>
            <span>SMS, URL, and QR pipelines active</span>
          </div>
        </div>

        {/* Metric 2: Suspicious Submissions */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Suspicious Submissions</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-mono font-bold text-amber-400 mb-1">
            {stats?.suspicious_scans ?? 0}
          </div>
          <div className="text-xs text-slate-400">
            {totalScans > 0 ? `${Math.round(((stats?.suspicious_scans ?? 0) / totalScans) * 100)}%` : '0%'} of analyzed traffic flagged
          </div>
        </div>

        {/* Metric 3: High-Risk Detections */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">High-Risk Detections</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-mono font-bold text-rose-400 mb-1">
            {stats?.high_risk_scans ?? 0}
          </div>
          <div className="text-xs text-slate-400">
            High & Critical threat confidence
          </div>
        </div>

        {/* Metric 4: Correlated Indicators */}
        <div 
          onClick={onExploreCorrelations}
          className="glass-panel glass-panel-hover rounded-xl p-5 relative overflow-hidden cursor-pointer group border-cyan-500/30 hover:border-cyan-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-300">Correlated Indicators</span>
            <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <GitMerge className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-mono font-bold text-cyan-400 mb-1">
            {stats?.correlated_indicators ?? 0}
          </div>
          <div className="text-xs text-cyan-300/80 flex items-center justify-between">
            <span>Multi-channel shared artifacts</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Middle Row: Risk Distribution Chart & Attack Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Breakdown */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-navy-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Threat Risk Distribution</h3>
              <p className="text-xs text-slate-400">Submissions categorized by explainable weighted risk score</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Critical Threat', count: riskCounts.Critical, range: '75–100', color: 'bg-rose-500', text: 'text-rose-400' },
              { label: 'High Risk', count: riskCounts.High, range: '50–74', color: 'bg-orange-500', text: 'text-orange-400' },
              { label: 'Medium Risk', count: riskCounts.Medium, range: '25–49', color: 'bg-amber-500', text: 'text-amber-400' },
              { label: 'Low Risk', count: riskCounts.Low, range: '0–24', color: 'bg-emerald-500', text: 'text-emerald-400' },
            ].map((cat) => {
              const pct = totalScans > 0 ? Math.round((cat.count / totalScans) * 100) : 0;
              return (
                <div key={cat.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${cat.color}`}></span>
                      {cat.label}
                      <span className="text-[10px] font-mono text-slate-500">({cat.range})</span>
                    </span>
                    <span className="font-mono text-slate-400">
                      {cat.count} scans ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-navy-950 overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full ${cat.color} transition-all duration-700 rounded-full`}
                      style={{ width: `${Math.max(pct, cat.count > 0 ? 3 : 0)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Thresholds: Low (0-24), Med (25-49), High (50-74), Critical (75-100)</span>
            <span className="text-cyan-400 font-mono">Configurable in Settings</span>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Vector Ingestion Channels</h3>
            <p className="text-xs text-slate-400 mb-4">Volume analyzed across delivery vectors</p>

            <div className="space-y-3">
              {[
                { type: 'SMS / Text', icon: MessageSquare, count: channelCounts.sms, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
                { type: 'Direct URL / Web', icon: Globe, count: channelCounts.url, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
                { type: 'QR Code (Quishing)', icon: QrCode, count: channelCounts.qr, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
              ].map((c) => (
                <div key={c.type} className="flex items-center justify-between p-3 rounded-lg bg-navy-950/70 border border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${c.bg} ${c.color} border ${c.border}`}>
                      <c.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-200">{c.type}</span>
                  </div>
                  <span className="text-base font-mono font-bold text-white">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-navy-950/80 border border-cyan-500/20 text-xs text-slate-300">
            <span className="font-semibold text-cyan-300 block mb-0.5">Cross-Channel Synergy:</span>
            CLAVIS analyzes QR destinations through the URL heuristic pipeline and links matching domains back to SMS lures.
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Scan Activity & Recent Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Scan Activity */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-navy-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span>Recent Scan Activity</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Last 6 Submissions</span>
          </div>

          {!stats?.recent_activity || stats.recent_activity.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
              No scans performed yet. Click "Perform Threat Scan" to analyze your first SMS, URL, or QR code.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {stats.recent_activity.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onViewReport(item.id)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-navy-800/40 px-2 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-cyan-300 border border-slate-700 shrink-0">
                      {item.scan_type}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.raw_preview}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {item.correlation_count > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        <GitMerge className="h-3 w-3" />
                        {item.correlation_count} linked
                      </span>
                    )}
                    <RiskBadge level={item.risk_level} size="sm" />
                    <span className="text-[11px] font-mono text-slate-500 hidden md:block">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-400" />
              <span>High-Risk Alerts</span>
            </h3>
          </div>

          {!stats?.recent_alerts || stats.recent_alerts.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
              No high-severity threats currently recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_alerts.map((al) => (
                <div
                  key={al.id}
                  onClick={() => onViewReport(al.id)}
                  className="p-3 rounded-lg bg-navy-950/80 border border-rose-500/30 hover:border-rose-500/60 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                      {al.risk_level} Alert
                    </span>
                    <span className="text-xs font-mono font-semibold text-rose-400">
                      Score: {al.risk_score}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white truncate mb-1">
                    {al.title}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="uppercase font-mono">{al.scan_type} Vector</span>
                    {al.correlation_count > 0 && (
                      <span className="text-cyan-400 font-mono">Linked to {al.correlation_count} past scan(s)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
