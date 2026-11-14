import React, { useState } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Scanner } from './pages/Scanner';
import { ScanReport } from './pages/ScanReport';
import { CorrelationExplorer } from './pages/CorrelationExplorer';
import { ScanHistory } from './pages/ScanHistory';
import { Settings } from './pages/Settings';
import { ScanReportResponse, ScanType } from './services/types';
import { api } from './services/api';
import { Shield, GitMerge, Radio, Terminal } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeReport, setActiveReport] = useState<ScanReportResponse | null>(null);
  const [scannerInitialType, setScannerInitialType] = useState<ScanType>('sms');
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  const handleStartNewScan = (type: ScanType = 'sms') => {
    setScannerInitialType(type);
    setCurrentTab('scanner');
  };

  const handleScanComplete = (report: ScanReportResponse) => {
    setActiveReport(report);
    setCurrentTab('report');
  };

  const handleViewReport = async (scanId: string) => {
    setLoadingReport(true);
    try {
      const report = await api.getScanReport(scanId);
      setActiveReport(report);
      setCurrentTab('report');
    } catch (err) {
      console.error('Failed to load report:', err);
      alert('Could not retrieve the requested scan report.');
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col cyber-grid selection:bg-cyan-500 selection:text-navy-950">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onStartNewScan={() => handleStartNewScan('sms')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {loadingReport && (
          <div className="p-16 text-center space-y-3">
            <div className="h-10 w-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-mono text-xs text-cyan-400 tracking-wider">RETRIEVING AUDIT DOSSIER...</p>
          </div>
        )}

        {!loadingReport && (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                onNavigateToScan={() => handleStartNewScan('sms')}
                onViewReport={handleViewReport}
                onExploreCorrelations={() => setCurrentTab('correlations')}
              />
            )}

            {currentTab === 'scanner' && (
              <Scanner
                initialType={scannerInitialType}
                onScanComplete={handleScanComplete}
              />
            )}

            {currentTab === 'report' && activeReport && (
              <ScanReport
                report={activeReport}
                onBackToScanner={() => setCurrentTab('scanner')}
                onViewScan={handleViewReport}
                onExploreCorrelations={() => setCurrentTab('correlations')}
              />
            )}

            {currentTab === 'correlations' && (
              <CorrelationExplorer onViewScan={handleViewReport} />
            )}

            {currentTab === 'history' && (
              <ScanHistory onViewReport={handleViewReport} />
            )}

            {currentTab === 'settings' && (
              <Settings />
            )}
          </>
        )}
      </main>

      {/* Cyber Footer */}
      <footer className="border-t border-slate-800/80 bg-navy-950/80 backdrop-blur-md py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono font-bold text-white tracking-wider">CLAVIS</span>
              <span className="text-[11px] text-slate-400 ml-2">
                Cross-Channel Link Analysis & Verification Intelligence System
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              SSRF Safeguards Enforced
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
              Zero-Execution Sandbox
            </span>
            <span className="text-slate-400">
              v1.0 MVP
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
