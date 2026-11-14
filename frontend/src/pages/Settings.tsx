import React, { useEffect, useState } from 'react';
import { SystemConfig } from '../services/types';
import { api } from '../services/api';
import { 
  Settings as SettingsIcon, 
  Sliders, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  RefreshCw, 
  Lock, 
  Key 
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingThresholds, setSavingThresholds] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  // Threshold form inputs
  const [lowMax, setLowMax] = useState<number>(24);
  const [medMax, setMedMax] = useState<number>(49);
  const [highMax, setHighMax] = useState<number>(74);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getConfig();
      setConfig(data);
      setLowMax(data.thresholds.low_max);
      setMedMax(data.thresholds.medium_max);
      setHighMax(data.thresholds.high_max);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleUpdateThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingThresholds(true);
    try {
      await api.updateThresholds({
        low_max: Number(lowMax),
        medium_max: Number(medMax),
        high_max: Number(highMax),
      });
      setMessage('Risk scoring thresholds updated successfully.');
      setTimeout(() => setMessage(null), 3000);
      loadConfig();
    } catch (err: any) {
      alert(err.message || 'Failed to update thresholds.');
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await api.seedData();
      setMessage(res.message);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to seed sample data.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-cyan-400 font-mono text-sm animate-pulse">
        LOADING INTELLIGENCE CONFIGURATION...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <SettingsIcon className="h-6 w-6 text-cyan-400" />
          <span>System & Intelligence Configuration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Adjust risk scoring parameters, verify external threat-intelligence connectivity, and manage demonstration seeds.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Configurable Risk Thresholds */}
      <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Configurable Risk Scoring Thresholds</h3>
            <p className="text-xs text-slate-400">
              Customize the score brackets governing Low, Medium, High, and Critical classification.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateThresholds} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg bg-navy-950/80 border border-slate-800">
              <label className="block text-xs font-mono uppercase text-emerald-400 mb-1">
                Low Risk Max (0–X)
              </label>
              <input
                type="number"
                min={5}
                max={40}
                value={lowMax}
                onChange={(e) => setLowMax(Number(e.target.value))}
                className="w-full rounded-md border border-slate-700 bg-navy-900 px-3 py-1.5 text-sm font-mono text-white focus:border-cyan-400 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 24 (0–24)</span>
            </div>

            <div className="p-3.5 rounded-lg bg-navy-950/80 border border-slate-800">
              <label className="block text-xs font-mono uppercase text-amber-400 mb-1">
                Medium Risk Max (X+1–Y)
              </label>
              <input
                type="number"
                min={lowMax + 1}
                max={70}
                value={medMax}
                onChange={(e) => setMedMax(Number(e.target.value))}
                className="w-full rounded-md border border-slate-700 bg-navy-900 px-3 py-1.5 text-sm font-mono text-white focus:border-cyan-400 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 49 (25–49)</span>
            </div>

            <div className="p-3.5 rounded-lg bg-navy-950/80 border border-slate-800">
              <label className="block text-xs font-mono uppercase text-orange-400 mb-1">
                High Risk Max (Y+1–Z)
              </label>
              <input
                type="number"
                min={medMax + 1}
                max={95}
                value={highMax}
                onChange={(e) => setHighMax(Number(e.target.value))}
                className="w-full rounded-md border border-slate-700 bg-navy-900 px-3 py-1.5 text-sm font-mono text-white focus:border-cyan-400 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 74 (50–74)</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-rose-400 font-mono">
              Critical Threat: {Number(highMax) + 1}–100
            </span>

            <button
              type="submit"
              disabled={savingThresholds}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all"
            >
              {savingThresholds ? 'Updating...' : 'Save Thresholds'}
            </button>
          </div>
        </form>
      </div>

      {/* External Threat Intelligence Status */}
      <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">External Threat Intelligence Integrations</h3>
            <p className="text-xs text-slate-400">
              Secret API keys are isolated on backend environment variables and never exposed to the frontend.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Google Safe Browsing */}
          <div className="p-4 rounded-lg bg-navy-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Google Safe Browsing v4</span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                config?.integrations.google_safe_browsing.configured
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {config?.integrations.google_safe_browsing.configured ? 'Configured' : 'Offline / Unconfigured'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {config?.integrations.google_safe_browsing.status}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 pt-1">
              <Key className="h-3.5 w-3.5" />
              <span>Env: GOOGLE_SAFE_BROWSING_API_KEY</span>
            </div>
          </div>

          {/* URLhaus */}
          <div className="p-4 rounded-lg bg-navy-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">URLhaus (abuse.ch)</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                Active (Hybrid)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {config?.integrations.urlhaus.status}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 pt-1">
              <Key className="h-3.5 w-3.5" />
              <span>Env: URLHAUS_API_KEY</span>
            </div>
          </div>
        </div>
      </div>

      {/* SSRF & Zero-Execution Security Guarantees */}
      <div className="rounded-xl border border-slate-800 bg-navy-900/60 p-6 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Privacy & SSRF Defense Status</h3>
            <p className="text-xs text-slate-400">
              Guaranteed server-side URL inspection protections enforced at all layers.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-navy-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Loopback & RFC 1918 Private Ranges Blocked</span>
          </div>
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Cloud Metadata (169.254.169.254) Blocked</span>
          </div>
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Zero Untrusted Script Execution</span>
          </div>
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Transient Memory Sanitization</span>
          </div>
        </div>
      </div>

      {/* Seed Test Data */}
      <div className="rounded-xl border border-cyan-500/30 bg-navy-900/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-glow-cyan">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Demonstration Test Data Seed</span>
          </h3>
          <p className="text-xs text-slate-400 max-w-lg">
            Populate sample paired submissions across SMS, URL, and QR channels that demonstrate cross-channel correlation without needing real malicious links.
          </p>
        </div>

        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          <span>{seeding ? 'Seeding...' : 'Load Sample Test Scans'}</span>
        </button>
      </div>
    </div>
  );
};
