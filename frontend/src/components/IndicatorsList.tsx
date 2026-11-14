import React, { useState } from 'react';
import { IndicatorDetail } from '../services/types';
import { Globe, Link, Hash, Phone, Mail, ShieldAlert, Copy, Check, Filter } from 'lucide-react';

interface IndicatorsListProps {
  indicators: IndicatorDetail[];
}

export const IndicatorsList: React.FC<IndicatorsListProps> = ({ indicators }) => {
  const [filter, setFilter] = useState<string>('all');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Link className="h-4 w-4 text-cyan-400" />;
      case 'domain':
      case 'root_domain':
        return <Globe className="h-4 w-4 text-blue-400" />;
      case 'ip':
        return <Hash className="h-4 w-4 text-purple-400" />;
      case 'phone':
        return <Phone className="h-4 w-4 text-emerald-400" />;
      case 'email':
        return <Mail className="h-4 w-4 text-amber-400" />;
      case 'brand_target':
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      default:
        return <Globe className="h-4 w-4 text-slate-400" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'malicious':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'suspicious':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-700/30 text-slate-400 border-slate-700';
    }
  };

  const copyToClipboard = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedValue(val);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const filteredIndicators = indicators.filter((ind) => {
    if (filter === 'all') return true;
    if (filter === 'web') return ind.type === 'url' || ind.type === 'domain' || ind.type === 'root_domain';
    if (filter === 'contacts') return ind.type === 'phone' || ind.type === 'email';
    if (filter === 'network') return ind.type === 'ip';
    if (filter === 'brand') return ind.type === 'brand_target';
    return true;
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Extracted Indicators</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {indicators.length} Discovered
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Normalized digital artifacts extracted from the submission for threat assessment.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'web', label: 'Web/Domains' },
            { id: 'contacts', label: 'Contacts' },
            { id: 'network', label: 'IPs' },
            { id: 'brand', label: 'Brands' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                filter === btn.id
                  ? 'bg-cyan-500 text-navy-950 font-semibold shadow-glow-cyan'
                  : 'bg-navy-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {filteredIndicators.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
          No indicators matched the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredIndicators.map((ind, idx) => (
            <div
              key={`${ind.type}-${ind.value}-${idx}`}
              className="flex items-center justify-between p-3 rounded-lg bg-navy-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="p-2 rounded-lg bg-navy-800/80 shrink-0">
                  {getIcon(ind.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono uppercase text-slate-400">
                      {ind.label || ind.type.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${getSeverityStyle(
                        ind.severity
                      )}`}
                    >
                      {ind.severity}
                    </span>
                  </div>
                  <div
                    className="text-xs font-mono text-slate-200 truncate select-all"
                    title={ind.value}
                  >
                    {ind.value}
                  </div>
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(ind.value)}
                className="shrink-0 p-1.5 text-slate-500 hover:text-cyan-400 rounded-md hover:bg-slate-800 transition-colors"
                title="Copy indicator"
              >
                {copiedValue === ind.value ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
