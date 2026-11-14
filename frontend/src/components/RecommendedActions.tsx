import React, { useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, ShieldAlert } from 'lucide-react';
import { RiskLevel } from '../services/types';

interface RecommendedActionsProps {
  recommendations: string[];
  riskLevel: RiskLevel;
}

export const RecommendedActions: React.FC<RecommendedActionsProps> = ({ recommendations, riskLevel }) => {
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setCompleted((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const isSevere = riskLevel === 'High' || riskLevel === 'Critical';

  return (
    <div className={`rounded-xl border p-5 ${
      isSevere
        ? 'border-rose-500/30 bg-navy-900/70'
        : 'border-slate-800 bg-navy-900/60'
    }`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2 rounded-lg ${isSevere ? 'bg-rose-500/10 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Recommended Security Actions</h3>
          <p className="text-xs text-slate-400">
            Immediate mitigation checklist tailored to this threat profile.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {recommendations.map((action, idx) => {
          const isDone = !!completed[idx];
          return (
            <div
              key={idx}
              onClick={() => toggleCheck(idx)}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                isDone
                  ? 'bg-navy-950/40 border-slate-800/50 opacity-60'
                  : 'bg-navy-950/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                className="mt-0.5 shrink-0 text-slate-400 hover:text-cyan-400"
                aria-label={isDone ? 'Mark uncompleted' : 'Mark completed'}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-500" />
                )}
              </button>
              <span className={`text-xs ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {action}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
