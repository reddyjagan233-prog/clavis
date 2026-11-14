import React from 'react';
import { ExternalIntelSource } from '../services/types';
import { Database, CheckCircle, AlertTriangle, HelpCircle, Activity } from 'lucide-react';

interface ThreatIntelResultsProps {
  intelSources: ExternalIntelSource[];
}

export const ThreatIntelResults: React.FC<ThreatIntelResultsProps> = ({ intelSources }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'threat_found':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-rose-400" />,
          badge: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
          label: 'Threat Detected',
        };
      case 'clean':
        return {
          icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
          label: 'No Matches',
        };
      case 'unconfigured':
        return {
          icon: <HelpCircle className="h-4 w-4 text-slate-400" />,
          badge: 'bg-slate-800 text-slate-400 border-slate-700',
          label: 'Local Fallback',
        };
      case 'rate_limited':
        return {
          icon: <Activity className="h-4 w-4 text-amber-400" />,
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
          label: 'Rate Limited',
        };
      default:
        return {
          icon: <Activity className="h-4 w-4 text-slate-400" />,
          badge: 'bg-slate-800 text-slate-400 border-slate-700',
          label: 'Query Offline',
        };
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <span>Threat Intelligence Feeds</span>
          </h3>
          <p className="text-xs text-slate-400">
            Multi-source external intelligence cross-referenced with local threat feeds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {intelSources.map((src, i) => {
          const statusInfo = getStatusBadge(src.status);
          return (
            <div
              key={`${src.source}-${i}`}
              className="p-3.5 rounded-lg bg-navy-950/80 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-white">{src.source}</span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${statusInfo.badge}`}
                  >
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                  </span>
                </div>

                {src.threat_type && (
                  <div className="text-xs font-mono font-semibold text-rose-400 mb-1">
                    {src.threat_type}
                  </div>
                )}

                <p className="text-xs text-slate-300 leading-normal mb-2">
                  {src.details || 'Index evaluation completed.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                <span>{src.is_external ? 'External Service' : 'Local Heuristic DB'}</span>
                {src.query_time_ms !== undefined && (
                  <span>{src.query_time_ms} ms</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
