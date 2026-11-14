import React from 'react';
import { RiskLevel } from '../services/types';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, size = 180 }) => {
  // SVG circular arc calculations
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 260 degree arc
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (Math.min(Math.max(score, 0), 100) / 100) * arcLength;

  const colorMap = {
    Low: { stroke: '#10b981', text: 'text-emerald-400', glow: 'rgba(16, 185, 129, 0.4)' },
    Medium: { stroke: '#f59e0b', text: 'text-amber-400', glow: 'rgba(245, 158, 11, 0.4)' },
    High: { stroke: '#f97316', text: 'text-orange-400', glow: 'rgba(249, 115, 22, 0.5)' },
    Critical: { stroke: '#ef4444', text: 'text-rose-400', glow: 'rgba(239, 68, 68, 0.6)' },
  };

  const currentColor = colorMap[level] || colorMap.Low;

  return (
    <div className="relative flex flex-col items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-135">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Animated Active Score bar */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={currentColor.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 10px ${currentColor.glow})`,
            transition: 'stroke-dashoffset 1s ease-in-out',
          }}
        />
      </svg>

      {/* Center Score readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2">
        <span className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-white">
          {score}
        </span>
        <span className="text-xs uppercase font-mono tracking-widest text-slate-400 mt-0.5">
          Risk Index
        </span>
        <span className={`text-xs font-semibold uppercase tracking-wider mt-1 px-2 py-0.5 rounded ${currentColor.text}`}>
          {level}
        </span>
      </div>
    </div>
  );
};
