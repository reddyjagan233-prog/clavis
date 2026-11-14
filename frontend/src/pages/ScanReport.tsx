import React, { useState } from 'react';
import { ScanReportResponse } from '../services/types';
import { RiskBadge } from '../components/RiskBadge';
import { RiskGauge } from '../components/RiskGauge';
import { IndicatorsList } from '../components/IndicatorsList';
import { HeuristicsBreakdown } from '../components/HeuristicsBreakdown';
import { CorrelationAlert } from '../components/CorrelationAlert';
import { CorrelationGraph } from '../components/CorrelationGraph';
import { ThreatIntelResults } from '../components/ThreatIntelResults';
import { RecommendedActions } from '../components/RecommendedActions';
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  Calendar, 
  Tag, 
  Shield, 
  Layers, 
  ExternalLink 
} from 'lucide-react';

interface ScanReportProps {
  report: ScanReportResponse;
  onBackToScanner: () => void;
  onViewScan: (scanId: string) => void;
  onExploreCorrelations: () => void;
}

export const ScanReport: React.FC<ScanReportProps> = ({
  report,
  onBackToScanner,
  onViewScan,
  onExploreCorrelations,
}) => {
  const [copied, setCopied] = useState(false);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return isoString;
    }
  };

  const copyReportSummary = () => {
    const summary = `
[CLAVIS THREAT REPORT]
ID: ${report.id}
Type: ${report.scan_type.toUpperCase()}
Title: ${report.title}
Risk Score: ${report.risk_score} / 100 (${report.risk_level})
Timestamp: ${report.created_at}
Indicators Extracted: ${report.indicators.length}
Correlated Scans: ${report.correlations.total_correlations}
Evidence: ${report.evidence_statement}
`.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `clavis-report-${report.id.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBackToScanner}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Scanner</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={copyReportSummary}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-navy-900/80 hover:bg-navy-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={downloadReportJson}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-300 transition-colors shadow-glow-cyan"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Main Executive Summary Card */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/80 backdrop-blur-xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Summary and Title */}
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-navy-800 text-cyan-300 border border-slate-700 font-bold">
                {report.scan_type} Scan
              </span>
              <RiskBadge level={report.risk_level} size="lg" />
              {report.correlations.channel_crossover && (
                <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                  Cross-Channel Correlated
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white break-words">
              {report.title}
            </h1>

            {/* Evidence Statement Banner */}
            <div className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
              report.insufficient_evidence
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : report.risk_level === 'Critical' || report.risk_level === 'High'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-navy-950/80 border-slate-800 text-slate-300'
            }`}>
              <div className="font-semibold text-white mb-0.5 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-cyan-400" />
                <span>Executive Assessment Statement</span>
              </div>
              <p>{report.evidence_statement}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                {formatDate(report.created_at)}
              </span>
              <span className="text-slate-600">•</span>
              <span>Report ID: <span className="text-slate-300">{report.id.slice(0, 13)}</span></span>
            </div>
          </div>

          {/* Right: Circular Risk Gauge */}
          <div className="shrink-0 flex flex-col items-center justify-center p-4 rounded-xl bg-navy-950/60 border border-slate-800/80">
            <RiskGauge score={report.risk_score} level={report.risk_level} size={190} />
            <div className="text-[11px] font-mono text-slate-500 mt-2 text-center">
              Scale 0-100 • Weighted Heuristics
            </div>
          </div>
        </div>
      </div>

      {/* Raw Content Collapsible */}
      <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-4">
        <span className="text-xs font-mono uppercase text-slate-400 block mb-1">
          Analyzed Raw Submission:
        </span>
        <div className="p-3 rounded-lg bg-navy-950/80 border border-slate-800 text-xs font-mono text-slate-300 break-all select-all">
          {report.raw_content}
        </div>
      </div>

      {/* Cross-Channel Correlation Alert & Relationship Graph */}
      <CorrelationAlert correlations={report.correlations} onViewScan={onViewScan} />

      {/* Relationship Graph (if correlations exist) */}
      {report.correlations.total_correlations > 0 && (
        <CorrelationGraph
          nodes={report.correlations.graph_nodes}
          edges={report.correlations.graph_edges}
          height={340}
        />
      )}

      {/* Extracted Indicators List */}
      <IndicatorsList indicators={report.indicators} />

      {/* Heuristics Explainability Breakdown */}
      <HeuristicsBreakdown heuristics={report.heuristics} />

      {/* Threat Intelligence Layer */}
      <ThreatIntelResults intelSources={report.threat_intel} />

      {/* Recommended Action Checklist */}
      <RecommendedActions
        recommendations={report.recommendations}
        riskLevel={report.risk_level}
      />
    </div>
  );
};
