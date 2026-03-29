import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
  isOpen?: boolean;
  onToggle?: () => void;
  onSelectNode?: (id: string) => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ logs, isOpen = true, onToggle, onSelectNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-400 border-red-900/50 bg-red-900/20';
      case 'SUCCESS': return 'text-green-400 border-green-900/50 bg-green-900/20';
      case 'WARN': return 'text-yellow-400 border-yellow-900/50 bg-yellow-900/20';
      default: return 'text-blue-300 border-blue-900/50 bg-blue-900/20';
    }
  };

  const getLevelIcon = (level: string) => {
      switch (level) {
          case 'ERROR': return '❌';
          case 'SUCCESS': return '✅';
          case 'WARN': return '⚠️';
          default: return 'ℹ️';
      }
  };

  return (
    <div className="h-full bg-[#0a0c10] border-t border-gray-700 flex flex-col font-mono text-xs w-full shadow-inner">
      <div 
        className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
            <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </span>
            <h3 className="font-bold text-gray-200 tracking-wide uppercase text-[11px]">Terminal de Execução</h3>
        </div>
        <div className="flex items-center gap-2">
             <span className="text-[10px] text-gray-500 hidden sm:inline">Modo Detalhado</span>
             <span className="text-gray-400 bg-gray-800 px-2 py-0.5 rounded text-[10px] border border-gray-700 font-bold">{logs.length} Linhas</span>
        </div>
      </div>
      
      {isOpen && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0d1117]">
            {logs.length === 0 && (
                <div className="text-gray-600 italic flex flex-col items-center justify-center h-24 opacity-50 gap-2 border border-dashed border-gray-800 rounded">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>Aguardando execução do fluxo...</span>
                </div>
            )}
            {logs.map((log) => (
            <div key={log.id} className="relative flex flex-col gap-1 group">
                <div className="flex items-center gap-2 w-full select-none">
                    <span className="text-gray-600 text-[10px] w-16 font-mono shrink-0 text-right">
                        {(log.timestamp || '').includes('T') ? log.timestamp.split('T')[1].split('.')[0] : '--:--:--'}
                    </span>
                    
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] border shrink-0 flex items-center gap-1 ${getLevelColor(log.level)}`}>
                        {getLevelIcon(log.level)} {log.level}
                    </span>
                    
                    <button 
                        onClick={() => log.nodeId && onSelectNode?.(log.nodeId)}
                        className="text-purple-300 font-bold text-[10px] uppercase tracking-wider bg-purple-900/30 px-2 py-0.5 rounded shrink-0 border border-purple-900/50 hover:bg-purple-900/50 transition-colors"
                    >
                        {log.nodeLabel}
                    </button>
                    
                    <div className="h-px bg-gray-800 flex-1 ml-2 opacity-50"></div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); handleCopy(log.message, log.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                        title="Copiar Conteúdo Completo"
                    >
                        {copiedId === log.id ? (
                            <span className="text-[9px] text-green-400 font-bold px-1">COPIADO!</span>
                        ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        )}
                    </button>
                </div>
                
                {/* Message Content with Precise Formatting */}
                <div className="pl-[4.5rem] pr-2 mt-1">
                    <div className={`p-2 rounded border border-l-4 ${
                        log.level === 'ERROR' ? 'border-red-900/50 border-l-red-500 bg-red-950/10' :
                        log.level === 'SUCCESS' ? 'border-green-900/50 border-l-green-500 bg-green-950/10' :
                        'border-gray-800 border-l-gray-600 bg-gray-900/50'
                    }`}>
                        <pre className="text-gray-300 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed selection:bg-blue-500/30 font-medium">
                            {log.message}
                        </pre>
                    </div>
                </div>
            </div>
            ))}
            
            {/* Anchor to scroll to bottom */}
            <div className="h-4" />
        </div>
      )}
    </div>
  );
};

export default LogPanel;