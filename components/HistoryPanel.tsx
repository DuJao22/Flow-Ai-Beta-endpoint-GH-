import React, { useEffect, useState } from 'react';
import { Clock, ChevronRight, ChevronDown, CheckCircle2, XCircle, Activity, FileText, Terminal as TerminalIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  flowId: string;
  webhook_received?: any;
  logs: any[];
  files: any[];
  finalNodesState: any;
}

const HistoryPanel: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-widest">Carregando Histórico...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2 opacity-50">
        <Clock className="w-8 h-8" />
        <span className="text-[10px] font-black uppercase tracking-widest">Nenhuma execução registrada</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#0d1117] p-4 space-y-3">
      {history.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const date = new Date(entry.timestamp);
        const logs = entry.logs || [];
        const files = entry.files || [];
        const hasError = logs.some(l => l.level === 'ERROR');

        return (
          <div key={entry.id} className={cn(
            "border rounded-xl transition-all overflow-hidden",
            isExpanded ? "border-gray-600 bg-gray-900/50 shadow-xl" : "border-gray-800 bg-gray-900/20 hover:border-gray-700"
          )}>
            <div 
              className="px-4 py-3 flex items-center justify-between cursor-pointer group"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shadow-inner",
                    hasError ? "bg-red-900/20 text-red-400" : "bg-emerald-900/20 text-emerald-400"
                )}>
                    {hasError ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="flex flex-col">
                    <span className="text-[11px] font-black text-gray-200 uppercase tracking-tight">
                        Execução {String(entry.id || '').slice(0, 8) || 'Desconhecida'}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                    </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[9px] text-gray-500 font-bold uppercase">
                          <TerminalIcon className="w-3 h-3" />
                          {logs.length}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-500 font-bold uppercase">
                          <FileText className="w-3 h-3" />
                          {files.length}
                      </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-gray-600 transition-transform", isExpanded && "rotate-180")} />
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-800 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Webhook Data */}
                <div className="flex items-center justify-between gap-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Endpoint de Gatilho</span>
                            <code className="text-[10px] font-mono text-indigo-200 truncate">/api/trigger/{entry.flowId}</code>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const url = `${window.location.origin}/api/trigger/${entry.flowId}`;
                            navigator.clipboard.writeText(url);
                        }}
                        className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20 transition-all active:scale-95"
                    >
                        Copiar URL
                    </button>
                </div>

                {entry.webhook_received && (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                            <Activity className="w-3 h-3" />
                            Dados Recebidos (Webhook)
                        </div>
                        <pre className="p-3 bg-black/40 rounded-lg border border-indigo-500/10 text-[10px] font-mono text-indigo-200 overflow-x-auto">
                            {JSON.stringify(entry.webhook_received, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Summary of Logs */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                        <TerminalIcon className="w-3 h-3" />
                        Logs de Execução
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {logs.length > 0 ? logs.map((log, i) => {
                            if (!log) return null;
                            const message = log.message || '';
                            return (
                                <div key={i} className="flex items-start gap-2 text-[10px] font-mono py-1 border-b border-gray-800/50 last:border-0">
                                    <span className={cn(
                                        "shrink-0 w-1.5 h-1.5 rounded-full mt-1",
                                        log.level === 'ERROR' ? "bg-red-500" : log.level === 'SUCCESS' ? "bg-emerald-500" : "bg-blue-500"
                                    )} />
                                    <span className="text-gray-500 shrink-0">[{log.nodeLabel || 'Log'}]</span>
                                    <span className="text-gray-300 break-all">
                                        {String(message).slice(0, 100)}
                                        {String(message).length > 100 ? '...' : ''}
                                    </span>
                                </div>
                            );
                        }) : (
                            <div className="text-[10px] text-gray-600 italic py-2">Nenhum log registrado.</div>
                        )}
                    </div>
                </div>

                {/* Files Generated */}
                {files.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                            <FileText className="w-3 h-3" />
                            Arquivos Gerados
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {files.map((file, i) => (
                                <div key={i} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-300 font-mono">
                                    {file.name}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HistoryPanel;
