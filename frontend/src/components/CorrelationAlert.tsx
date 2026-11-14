import React from 'react';
import { CorrelationReport } from '../services/types';
import { GitMerge, Layers, Clock, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

interface CorrelationAlertProps {
  correlations: CorrelationReport;
  onViewScan?: (scanId: string) => void;
}

export const CorrelationAlert: React.FC<CorrelationAlertProps> = ({ correlations, onViewScan }) => {
  if (correlations.total_correlations === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-navy-900/50 p-5">
        <div className="flex items-center space-x-3 text-slate-400">
          <GitMerge className="h-5 w-5 text-slate-500" />
          <div>
            <h4 className="text-sm font-semibold text-slate-300">No Historical Correlations Detected</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              The indicators in this submission have not been previously observed in CLAVIS local intelligence.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Unknown';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      correlations.channel_crossover
        ? 'border-cyan-500/40 bg-gradient-to-br from-cyan-950/20 via-navy-900/80 to-navy-950 shadow-glow-cyan'
        : 'border-blue-500/30 bg-navy-900/70'
    }`}>
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
            <GitMerge className="h-5 w-5 animate-pulse-subtle" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                {correlations.channel_crossover
                  ? '⚡ Cross-Channel Correlation Detected'
                  : 'Historical Correlation Identified'}
              </h3>
              {correlations.channel_crossover && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-400 text-navy-950 font-bold">
                  Multi-Channel Converged
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              CLAVIS correlated indicators from this scan with {correlations.total_correlations} historical submission(s).
            </p>
          </div>
        </div>

        {/* Channels badges */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Channels:</span>
          {correlations.channels_involved.map((ch) => (
            <span
              key={ch}
              className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-cyan-300 border border-slate-700"
            >
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* First / Last Seen Timestamps & Shared Indicators Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-navy-950/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            First Seen
          </div>
          <div className="text-xs font-semibold text-white">
            {formatDate(correlations.first_seen)}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-navy-950/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            Last Seen
          </div>
          <div className="text-xs font-semibold text-white">
            {formatDate(correlations.last_seen)}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-navy-950/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1.5 mb-1">
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            Shared Indicators
          </div>
          <div className="text-xs font-semibold text-white truncate" title={correlations.shared_indicators.join(', ')}>
            {correlations.shared_indicators.length} artifact(s) linked
          </div>
        </div>
      </div>

      {/* Individual Correlation Matches */}
      <div className="space-y-2.5 mb-4">
        <h4 className="text-xs font-mono uppercase text-slate-400">Related Submissions & Shared Vectors:</h4>
        {correlations.matches.map((m, idx) => (
          <div
            key={`${m.matched_scan_id}-${idx}`}
            className="p-3 rounded-lg bg-navy-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {m.matched_scan_type}
                </span>
                <span className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                  {m.matched_scan_title}
                </span>
                <RiskBadge level={m.matched_scan_risk} size="sm" />
              </div>
              <p className="text-xs text-slate-300 font-sans">
                {m.relationship_reason}
              </p>
            </div>

            {onViewScan && (
              <button
                onClick={() => onViewScan(m.matched_scan_id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-navy-900 hover:bg-navy-800 border border-cyan-800/60 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                <span>View Scan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Mandatory Honesty / Caution Statement */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2 text-xs text-amber-300/90">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-semibold block text-amber-300 mb-0.5">Analyst Caution</span>
          {correlations.caution_statement}
        </div>
      </div>
    </div>
  );
};
