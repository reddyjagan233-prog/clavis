import React, { useEffect, useState } from 'react';
import { ScanHistoryItem } from '../services/types';
import { api } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { 
  History, 
  Search, 
  Trash2, 
  ArrowRight, 
  Filter, 
  GitMerge, 
  Scale, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

interface ScanHistoryProps {
  onViewReport: (scanId: string) => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({ onViewReport }) => {
  const [items, setItems] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');

  // Compare mode
  const [compareList, setCompareList] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<any | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparing, setComparing] = useState(false);

  // Clear all confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory({
        q: searchQuery || undefined,
        scan_type: selectedType,
        risk_level: selectedRisk,
      });
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedType, selectedRisk]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scan report?')) return;
    try {
      await api.deleteScan(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setCompareList((prev) => prev.filter((cid) => cid !== id));
      setMessage('Scan deleted successfully.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete scan.');
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearAllHistory();
      setItems([]);
      setCompareList([]);
      setShowClearConfirm(false);
      setMessage('All scan history and cached indicators have been securely deleted.');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to clear history.');
    }
  };

  const toggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareList.includes(id)) {
      setCompareList(compareList.filter((cid) => cid !== id));
    } else {
      if (compareList.length >= 2) {
        setCompareList([compareList[1], id]);
      } else {
        setCompareList([...compareList, id]);
      }
    }
  };

  const executeComparison = async () => {
    if (compareList.length !== 2) return;
    setComparing(true);
    try {
      const data = await api.compareScans(compareList[0], compareList[1]);
      setCompareData(data);
      setCompareModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Comparison failed.');
    } finally {
      setComparing(false);
    }
  };

  const formatDate = (isoString: string) => {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <History className="h-6 w-6 text-cyan-400" />
            <span>Scan Audit History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Searchable historical catalog of threat submissions and cross-channel investigations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {compareList.length === 2 && (
            <button
              onClick={executeComparison}
              disabled={comparing}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all"
            >
              <Scale className="h-4 w-4" />
              <span>Compare Selected (2)</span>
            </button>
          )}

          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 text-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition-all"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-navy-900/60 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, domains, URLs, sender addresses..."
            className="w-full rounded-lg border border-slate-800 bg-navy-950/80 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 font-mono outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Channel Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-800 bg-navy-950 text-xs text-slate-300 py-2 px-3 outline-none focus:border-cyan-500"
          >
            <option value="all">All Channels</option>
            <option value="sms">SMS Scans</option>
            <option value="url">URL Scans</option>
            <option value="qr">QR Code Scans</option>
          </select>

          {/* Risk Level Filter */}
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="rounded-lg border border-slate-800 bg-navy-950 text-xs text-slate-300 py-2 px-3 outline-none focus:border-cyan-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button
            onClick={loadHistory}
            className="p-2 rounded-lg border border-slate-800 bg-navy-950 hover:bg-navy-800 text-slate-300 hover:text-cyan-400"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* History Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-cyan-400 font-mono text-sm animate-pulse">
          LOADING AUDIT LOGS...
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-navy-900/40 text-slate-500 space-y-2">
          <History className="h-10 w-10 mx-auto text-slate-600 stroke-[1.5]" />
          <p className="text-sm font-semibold text-slate-400">No scan records found</p>
          <p className="text-xs">Adjust your search filters or perform a new scan.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-navy-900/60 overflow-hidden">
          <div className="divide-y divide-slate-800/80">
            {items.map((item) => {
              const isSelectedForCompare = compareList.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => onViewReport(item.id)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-navy-800/40 transition-colors cursor-pointer group ${
                    isSelectedForCompare ? 'bg-cyan-950/20 border-l-4 border-l-cyan-400' : ''
                  }`}
                >
                  <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                    {/* Checkbox for Compare */}
                    <button
                      type="button"
                      onClick={(e) => toggleCompare(item.id, e)}
                      className={`p-1 rounded text-xs font-mono transition-colors shrink-0 mt-0.5 sm:mt-0 ${
                        isSelectedForCompare
                          ? 'bg-cyan-500 text-navy-950 font-bold'
                          : 'border border-slate-700 text-slate-500 hover:border-slate-500'
                      }`}
                      title="Select for comparison"
                    >
                      <Scale className="h-3.5 w-3.5" />
                    </button>

                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-cyan-300 border border-slate-700 shrink-0">
                      {item.scan_type}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate font-mono mt-0.5">
                        {item.raw_preview}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                    {item.correlation_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        <GitMerge className="h-3 w-3" />
                        {item.correlation_count} linked
                      </span>
                    )}

                    <div className="text-right">
                      <RiskBadge level={item.risk_level} size="sm" />
                    </div>

                    <span className="text-xs font-mono text-slate-400 hidden lg:block">
                      {formatDate(item.created_at)}
                    </span>

                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side-by-Side Compare Modal */}
      {compareModalOpen && compareData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-950 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Scale className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Side-by-Side Threat Comparison</h3>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Shared Indicators Summary */}
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-2">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-mono uppercase font-bold text-cyan-300">
                  Shared Infrastructure Artifacts:
                </span>
              </div>
              {compareData.shared_indicators.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No overlapping domain, phone, or URL indicators found between these two submissions.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {compareData.shared_indicators.map((ind: any, i: number) => (
                    <span
                      key={i}
                      className="text-xs font-mono px-2.5 py-1 rounded bg-navy-900 border border-cyan-500/40 text-cyan-300 font-semibold"
                    >
                      {ind.value} ({ind.type})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[compareData.scan1, compareData.scan2].map((s: any, idx: number) => (
                <div key={s.id} className="p-4 rounded-xl border border-slate-800 bg-navy-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-cyan-300">
                      Scan #{idx + 1} ({s.scan_type})
                    </span>
                    <RiskBadge level={s.risk_level} size="sm" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                  <div className="text-xs font-mono text-slate-400">
                    Risk Score: <span className="text-white font-bold">{s.risk_score}</span> / 100
                  </div>
                  <div className="p-2.5 rounded bg-navy-950 border border-slate-800 text-xs font-mono text-slate-300 break-all">
                    {s.raw_content}
                  </div>
                  <button
                    onClick={() => {
                      setCompareModalOpen(false);
                      onViewReport(s.id);
                    }}
                    className="w-full text-center text-xs font-semibold py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-cyan-400 border border-cyan-800/40 transition-colors"
                  >
                    Open Full Report
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-950 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Permanently Wipe All Scan History?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently purge all recorded scan reports, extracted indicators, and cross-channel correlations from the local database. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
              >
                Wipe History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
