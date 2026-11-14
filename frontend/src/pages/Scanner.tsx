import React, { useState, useRef, useEffect } from 'react';
import { ScanType, ScanReportResponse } from '../services/types';
import { api } from '../services/api';
import { decodeQRFromFile, decodeQRFromVideoFrame } from '../utils/qrScanner';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { 
  MessageSquare, 
  Globe, 
  QrCode, 
  Upload, 
  Camera, 
  Play, 
  AlertCircle, 
  Loader2, 
  FileText, 
  StopCircle, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface ScannerProps {
  onScanComplete: (report: ScanReportResponse) => void;
  initialType?: ScanType;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, initialType = 'sms' }) => {
  const [activeTab, setActiveTab] = useState<ScanType>(initialType);
  
  // SMS form state
  const [smsText, setSmsText] = useState('');
  const [smsSender, setSmsSender] = useState('');

  // URL form state
  const [urlInput, setUrlInput] = useState('');

  // QR form state
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // General processing state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>('Initializing');
  const [error, setError] = useState<string | null>(null);

  // Camera video / canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        requestAnimationFrame(tickCamera);
      }
    } catch (err: any) {
      console.error(err);
      setCameraError('Camera access denied or device not found. Please upload a QR code image instead.');
      setCameraActive(false);
    }
  };

  const tickCamera = () => {
    if (videoRef.current && canvasRef.current && cameraActive) {
      const decoded = decodeQRFromVideoFrame(videoRef.current, canvasRef.current);
      if (decoded) {
        stopCamera();
        handleQRDetected(decoded, 'Live Camera Scan');
        return;
      }
    }
    if (cameraActive) {
      animFrameRef.current = requestAnimationFrame(tickCamera);
    }
  };

  const handleQRDetected = async (decodedContent: string, sourceLabel: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      simulateStages();
      const report = await api.scanQRText(decodedContent, sourceLabel);
      onScanComplete(report);
    } catch (err: any) {
      setError(err.message || 'QR analysis failed.');
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setQrPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const simulateStages = () => {
    setAnalysisStage('Extracting structured indicators & regex tokens...');
    setTimeout(() => {
      setAnalysisStage('Evaluating weighted heuristics & lexical patterns...');
    }, 400);
    setTimeout(() => {
      setAnalysisStage('Querying threat intelligence & safe browsing index...');
    }, 800);
    setTimeout(() => {
      setAnalysisStage('Correlating against cross-channel historical database...');
    }, 1200);
  };

  // Submit Handlers
  const handleSMSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsText.trim()) {
      setError('Please paste or type an SMS message to analyze.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    simulateStages();

    try {
      const report = await api.scanSMS(smsText, smsSender);
      onScanComplete(report);
    } catch (err: any) {
      setError(err.message || 'SMS analysis failed.');
      setAnalyzing(false);
    }
  };

  const handleURLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setError('Please enter a website URL or domain.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    simulateStages();

    try {
      const report = await api.scanURL(urlInput);
      onScanComplete(report);
    } catch (err: any) {
      setError(err.message || 'URL analysis failed.');
      setAnalyzing(false);
    }
  };

  const handleQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrFile) {
      setError('Please select or drag a QR code image, or use camera capture.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    simulateStages();

    try {
      // First attempt client-side fast decode with jsQR
      try {
        const decoded = await decodeQRFromFile(qrFile);
        const report = await api.scanQRText(decoded, qrFile.name);
        onScanComplete(report);
        return;
      } catch {
        // If client decode fails, send directly to backend cv2 pipeline
        const report = await api.scanQRUpload(qrFile);
        onScanComplete(report);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to decode QR code. Ensure the QR code is clearly visible.');
      setAnalyzing(false);
    }
  };

  // Quick Preset Handlers
  const loadPreset = (type: 'sms' | 'url' | 'qr', sampleIdx: number) => {
    setError(null);
    if (type === 'sms') {
      setActiveTab('sms');
      if (sampleIdx === 1) {
        setSmsSender('+1-800-555-0199');
        setSmsText('URGENT from USPS: Your package US-8921-99 is suspended due to unpaid customs fee. Update your card at https://usps-parcel-tracking.vip/pay to avoid return.');
      } else if (sampleIdx === 2) {
        setSmsSender('security-alerts@bankofamerica-auth.com');
        setSmsText('BANK OF AMERICA: Suspicious withdrawal of $1,420.00 flagged on your checking account. If not you, sign in immediately at https://bankofamerica-fraud-verification.com/login?otp=request to lock debit card.');
      } else {
        setSmsSender('+1-555-0144');
        setSmsText('Hi John, your dentist appointment is confirmed for tomorrow at 2:30 PM. Reply 1 to confirm or 2 to reschedule.');
      }
    } else if (type === 'url') {
      setActiveTab('url');
      if (sampleIdx === 1) {
        setUrlInput('http://appleid.apple.com-account-verification-service.xyz/login.php?token=sec99');
      } else if (sampleIdx === 2) {
        setUrlInput('http://192.88.99.12/chase-online/auth/login.html');
      } else {
        setUrlInput('https://en.wikipedia.org/wiki/Phishing');
      }
    } else if (type === 'qr') {
      setActiveTab('qr');
      // Test sample QR destination directly
      handleQRDetected('https://usps-parcel-tracking.vip/auth/login', 'Sample QR Quishing Sticker');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Privacy Notice Banner */}
      <PrivacyNotice />

      {/* Main Scanner Card */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 pb-4 mb-6 gap-2">
          {[
            { id: 'sms', label: 'SMS Analysis', icon: MessageSquare },
            { id: 'url', label: 'URL Analysis', icon: Globe },
            { id: 'qr', label: 'QR Code Analysis', icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  stopCamera();
                  setActiveTab(tab.id as ScanType);
                  setError(null);
                }}
                disabled={analyzing}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs sm:text-sm flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Submission Error</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {analyzing && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-2 border-blue-500/20 border-b-blue-400 animate-spin"></div>
            </div>
            <div className="text-center space-y-1">
              <span className="font-mono text-sm font-bold text-white block">
                ANALYZING THREAT SIGNALS...
              </span>
              <span className="font-mono text-xs text-cyan-400 animate-pulse">
                {analysisStage}
              </span>
            </div>
          </div>
        )}

        {!analyzing && (
          <>
            {/* MODE 1: SMS Scanner */}
            {activeTab === 'sms' && (
              <form onSubmit={handleSMSSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Suspicious SMS Message Content <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="Paste the suspicious text message here (e.g., 'URGENT: Your parcel delivery is pending payment...')"
                    className="w-full rounded-xl border border-slate-800 bg-navy-950/80 p-3.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Sender Phone Number or Caller ID <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={smsSender}
                    onChange={(e) => setSmsSender(e.target.value)}
                    placeholder="+1 (800) 555-0199 or shortcode / email"
                    className="w-full rounded-xl border border-slate-800 bg-navy-950/80 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono outline-none"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-xs text-slate-500 font-mono whitespace-nowrap">Presets:</span>
                    <button
                      type="button"
                      onClick={() => loadPreset('sms', 1)}
                      className="text-xs px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      USPS Lure
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset('sms', 2)}
                      className="text-xs px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      Bank Smish
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset('sms', 3)}
                      className="text-xs px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      Benign SMS
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-navy-950 font-bold px-6 py-3 rounded-xl shadow-glow-cyan transition-all"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Analyze SMS Message</span>
                  </button>
                </div>
              </form>
            )}

            {/* MODE 2: URL Scanner */}
            {activeTab === 'url' && (
              <form onSubmit={handleURLSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Website URL or Naked Domain <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example-security-update.com/login"
                    className="w-full rounded-xl border border-slate-800 bg-navy-950/80 p-3.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Normalized automatically. Server never visits or renders untrusted executable scripts.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-xs text-slate-500 font-mono whitespace-nowrap">Presets:</span>
                    <button
                      type="button"
                      onClick={() => loadPreset('url', 1)}
                      className="text-xs px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      Apple Mimicry
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset('url', 2)}
                      className="text-xs px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      Direct IP Host
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset('url', 3)}
                      className="text-xs px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      Wikipedia Benign
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-navy-950 font-bold px-6 py-3 rounded-xl shadow-glow-cyan transition-all"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Scan URL Destination</span>
                  </button>
                </div>
              </form>
            )}

            {/* MODE 3: QR Code Scanner */}
            {activeTab === 'qr' && (
              <form onSubmit={handleQRSubmit} className="space-y-4">
                {cameraActive ? (
                  <div className="relative rounded-xl border border-cyan-500/40 bg-navy-950 p-4 text-center overflow-hidden">
                    <video
                      ref={videoRef}
                      playsInline
                      className="w-full max-h-72 object-contain mx-auto rounded-lg"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="h-48 w-48 border-2 border-dashed border-cyan-400 rounded-lg animate-pulse"></div>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold hover:bg-rose-500/30 transition-colors"
                      >
                        <StopCircle className="h-4 w-4" />
                        <span>Stop Camera</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                      Upload QR Code Image or Capture via Camera
                    </label>

                    <div className="flex flex-col sm:flex-row items-center justify-center border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-6 bg-navy-950/60 text-center transition-colors">
                      <div className="space-y-3">
                        {qrPreview ? (
                          <div className="flex flex-col items-center">
                            <img
                              src={qrPreview}
                              alt="QR Preview"
                              className="h-32 w-32 object-contain rounded-lg border border-slate-700 mb-2"
                            />
                            <span className="text-xs font-mono text-cyan-400">{qrFile?.name}</span>
                          </div>
                        ) : (
                          <div className="flex justify-center text-slate-500">
                            <QrCode className="h-12 w-12 stroke-[1.5]" />
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <label className="cursor-pointer inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors">
                            <Upload className="h-4 w-4" />
                            <span>Select Image File</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={startCamera}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-cyan-400 text-xs font-semibold border border-cyan-800/60 transition-colors"
                          >
                            <Camera className="h-4 w-4" />
                            <span>Use Camera</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {cameraError && (
                      <p className="text-xs text-amber-400 mt-2">{cameraError}</p>
                    )}
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">Preset:</span>
                    <button
                      type="button"
                      onClick={() => loadPreset('qr', 1)}
                      className="text-xs px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
                    >
                      Simulate USPS Quishing QR
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!qrFile}
                    className={`flex items-center justify-center space-x-2 font-bold px-6 py-3 rounded-xl transition-all ${
                      qrFile
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-navy-950 shadow-glow-cyan'
                        : 'bg-navy-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Decode & Analyze QR Destination</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
