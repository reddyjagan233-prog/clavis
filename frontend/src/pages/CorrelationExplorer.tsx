import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { CorrelationCluster, GlobalGraphData } from '../services/types';
import { CorrelationGraph } from '../components/CorrelationGraph';
import { RiskBadge } from '../components/RiskBadge';
import { 
  GitMerge, 
  Layers, 
  Globe, 
  Phone, 
  Link, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  Activity, 
  RefreshCw 
} from 'lucide-react';

interface CorrelationExplorerProps {
  onViewScan: (scanId: string) => void;
}

export const CorrelationExplorer: React.FC<CorrelationExplorerProps> = ({ onViewScan }) => {
  const [clusters, setClusters] = useState<CorrelationCluster[]>([]);
  const [graphData, setGraphData] = useState<GlobalGraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'clusters' | 'graph'>('clusters');
  const [selectedCluster, setSelectedCluster] = useState<CorrelationCluster | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, graphRes] = await Promise.all([
        api.getCorrelationsOverview(),
        api.getGlobalGraph(),
      ]);
      setClusters(overviewRes.clusters || []);
      setGraphData(graphRes);
      if (overviewRes.clusters && overviewRes.clusters.length > 0) {
        setSelectedCluster(overviewRes.clusters[0]);
      }
    } catch (err) {
      console.error('Failed to load correlations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getIndicatorIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Phone className="h-4 w-4 text-emerald-400" />;
      case 'url':
        return <Link className="h-4 w-4 text-cyan-400" />;
      default:
        return <Globe className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Signature Feature Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-850 p-6 md:p-8 shadow-glow-cyan">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-mono font-medium text-cyan-300">
              <GitMerge className="h-3.5 w-3.5 text-cyan-400" />
              <span>Signature Capability • Graph Correlation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Cross-Channel Threat Correlation Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Attackers routinely reuse malicious infrastructure across communication channels—distributing the same phishing domain via SMS, parking meter QR codes, or redirect chains. CLAVIS connects these dots to expose coordinated campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-800 bg-navy-900/80 hover:bg-navy-800 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Refresh intelligence"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* View Switcher: Clusters List vs Global Topological Graph */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('clusters')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'clusters'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900'
            }`}
          >
            Shared Indicator Clusters ({clusters.length})
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'graph'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900'
            }`}
          >
            Global Network Graph
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono hidden sm:inline-block">
          {graphData?.stats.scans_represented || 0} scans mapped across network
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-cyan-400 font-mono text-sm animate-pulse">
          FETCHING CROSS-CHANNEL RELATIONSHIPS...
        </div>
      ) : activeTab === 'graph' ? (
        /* Global Network Graph View */
        <div className="space-y-4">
          <CorrelationGraph
            nodes={
              graphData?.nodes.map((n) => ({
                id: n.id,
                label: n.label,
                type: n.type,
                scan_type: n.scan_type,
                risk_level: n.risk_level,
                details: n.full_label,
              })) || []
            }
            edges={graphData?.edges || []}
            height={520}
          />
        </div>
      ) : (
        /* Clusters Master-Detail View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Shared Clusters Catalog */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center justify-between">
              <span>Recurrent Indicator Clusters</span>
              <span className="text-xs font-mono text-slate-400">
                {clusters.filter((c) => c.is_cross_channel).length} Multi-Channel
              </span>
            </h3>

            {clusters.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                No shared indicators recorded yet. Scan multiple items with overlapping domains, numbers, or URLs to observe correlations.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {clusters.map((c, idx) => {
                  const isSelected = selectedCluster?.indicator_value === c.indicator_value;
                  return (
                    <div
                      key={`${c.indicator_value}-${idx}`}
                      onClick={() => setSelectedCluster(c)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/30 shadow-glow-cyan'
                          : 'border-slate-800 bg-navy-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 rounded-md bg-navy-800">
                            {getIndicatorIcon(c.indicator_type)}
                          </div>
                          <span className="text-xs font-mono uppercase text-slate-400">
                            {c.indicator_type.replace('_', ' ')}
                          </span>
                        </div>

                        {c.is_cross_channel ? (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                            Cross-Channel
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-navy-800 text-slate-400 border border-slate-700">
                            Single-Channel
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-mono font-semibold text-white truncate mb-2 select-all">
                        {c.indicator_value}
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>Seen in {c.occurrences} submissions</span>
                        <div className="flex items-center gap-1">
                          {c.channels.map((ch) => (
                            <span
                              key={ch}
                              className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-navy-950 text-cyan-400 border border-slate-800"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Cluster Detail & Connected Submissions */}
          <div className="lg:col-span-7">
            {selectedCluster ? (
              <div className="rounded-xl border border-slate-800 bg-navy-900/80 p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                      Cluster Inspector
                    </span>
                    {selectedCluster.is_cross_channel && (
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        Multi-Channel Delivery ({selectedCluster.channels.join(' + ')})
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-mono font-bold text-white break-all select-all">
                    {selectedCluster.indicator_value}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Shared {selectedCluster.indicator_type.replace('_', ' ')} observed across {selectedCluster.associated_scans.length} distinct scans.
                  </p>
                </div>

                {/* Submissions in this cluster */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase text-slate-400">
                    Connected Submissions ({selectedCluster.associated_scans.length}):
                  </h4>
                  {selectedCluster.associated_scans.map((scan) => (
                    <div
                      key={scan.id}
                      className="p-4 rounded-lg bg-navy-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-cyan-300 border border-slate-700">
                            {scan.scan_type}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {scan.title}
                          </span>
                          <RiskBadge level={scan.risk_level} size="sm" />
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          Risk Score: {scan.risk_score} / 100
                        </p>
                      </div>

                      <button
                        onClick={() => onViewScan(scan.id)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-colors shrink-0"
                      >
                        <span>Inspect Report</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Caution Note */}
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start space-x-2 text-xs text-amber-300/90">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-300 mb-0.5">Analyst Guidance</span>
                    A shared indicator is a relationship clue, not definitive proof of a common attacker. Independent verification is always required.
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-sm">
                Select an indicator cluster from the list to view its connected submissions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
