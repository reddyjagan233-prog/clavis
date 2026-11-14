import React from 'react';
import { HeuristicDetail } from '../services/types';
import { ShieldAlert, AlertTriangle, Info, Zap, Flame } from 'lucide-react';

interface HeuristicsBreakdownProps {
  heuristics: HeuristicDetail[];
}

export const HeuristicsBreakdown: React.FC<HeuristicsBreakdownProps> = ({ heuristics }) => {
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/40';
      case 'high':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40';
      default:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'credential_harvesting':
        return <Flame className="h-4 w-4 text-rose-400" />;
      case 'impersonation':
        return <ShieldAlert className="h-4 w-4 text-orange-400" />;
      case 'urgency':
        return <Zap className="h-4 w-4 text-amber-400" />;
      case 'correlation':
        return <AlertTriangle className="h-4 w-4 text-cyan-400" />;
      default:
        return <Info className="h-4 w-4 text-sky-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Explainable Heuristic Signals</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {heuristics.length} Triggered
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Weighted behavioral, lexical, and structural security rules evaluated by the CLAVIS engine.
          </p>
        </div>
      </div>

      {heuristics.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-400 text-sm">
          <p className="font-medium text-slate-300">No suspicious heuristic patterns detected.</p>
          <p className="text-xs text-slate-500 mt-1">
            Note: Absence of heuristic flags does not certify safety. Always verify unrequested communications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {heuristics.map((h, i) => (
            <div
              key={`${h.code}-${i}`}
              className="p-3.5 rounded-lg bg-navy-950/70 border border-slate-800 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-navy-900 shrink-0 mt-0.5">
                    {getCategoryIcon(h.category)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{h.name}</span>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getSeverityBadge(h.severity)}`}>
                        {h.severity}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-navy-900 px-1.5 py-0.5 rounded">
                        {h.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{h.explanation}</p>
                  </div>
                </div>

                {/* Score impact pill */}
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center text-xs font-mono font-semibold px-2 py-1 rounded bg-navy-900 text-cyan-300 border border-cyan-800/50">
                    +{h.score_impact} pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
