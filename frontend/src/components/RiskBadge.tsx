import React from 'react';
import { RiskLevel } from '../services/types';
import { ShieldCheck, AlertTriangle, AlertOctagon, Flame } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', showIcon = true }) => {
  const configs = {
    Low: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      glow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]',
      icon: ShieldCheck,
      label: 'Low Risk',
    },
    Medium: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      icon: AlertTriangle,
      label: 'Medium Risk',
    },
    High: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-400',
      border: 'border-orange-500/40',
      glow: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]',
      icon: AlertOctagon,
      label: 'High Risk',
    },
    Critical: {
      bg: 'bg-rose-500/20',
      text: 'text-rose-400',
      border: 'border-rose-500/50',
      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse',
      icon: Flame,
      label: 'Critical Threat',
    },
  };

  const config = configs[level] || configs.Low;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs md:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm md:text-base px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono uppercase tracking-wider border font-medium ${config.bg} ${config.text} ${config.border} ${config.glow} ${sizeClasses[size]}`}
    >
      {showIcon && <IconComponent size={iconSizes[size]} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
