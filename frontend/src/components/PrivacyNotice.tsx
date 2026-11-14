import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Lock, EyeOff, Server, AlertCircle } from 'lucide-react';

export const PrivacyNotice: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-6 rounded-xl border border-cyan-500/20 bg-navy-900/80 backdrop-blur-md p-4 transition-all">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              Privacy & Zero-Execution Security Notice
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Guaranteed Sandbox
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Submitted URLs and payloads are analyzed in isolated memory. Untrusted content is never rendered or executed.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-slate-400 hover:text-cyan-300 transition-colors p-1"
          aria-label="Toggle notice details"
        >
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 animate-fadeIn">
          <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-navy-950/60 border border-slate-800">
            <Lock className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block mb-0.5">Zero Code Execution</span>
              No scripts, redirects, or malicious payloads are ever executed. URLs are parsed purely via AST and lexical tokenizers.
            </div>
          </div>

          <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-navy-950/60 border border-slate-800">
            <Server className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block mb-0.5">SSRF Protection Enforced</span>
              Server requests to loopback (127.0.0.1), private RFC1918 subnets, and cloud metadata (169.254.169.254) are rejected.
            </div>
          </div>

          <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-navy-950/60 border border-slate-800">
            <EyeOff className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block mb-0.5">Privacy First</span>
              Never submit real banking credentials, passwords, or personal identity numbers. You can clear history anytime from Settings.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
