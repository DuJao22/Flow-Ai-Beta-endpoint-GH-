import React, { useState } from 'react';
import { 
  Globe, 
  Zap, 
  Copy, 
  Check, 
  X, 
  Link as LinkIcon, 
  Code, 
  Info, 
  Terminal,
  Activity,
  ArrowRight,
  MousePointer2
} from 'lucide-react';

interface ApiTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiTutorialModal: React.FC<ApiTutorialModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const executeUrl = `${window.location.origin}/api/execute-flow`;
  const triggerUrl = `${window.location.origin}/api/trigger/{FLOW_ID}`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const payloadExample = `{
  "nodes": [...],
  "edges": [...]
}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">Automação & API</h2>
              <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest">Integre o Flow Architect com qualquer sistema externo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-all p-2 rounded-xl hover:bg-gray-800 active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar space-y-10">
          
          {/* Webhook Trigger Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <LinkIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">1. Gatilho via Webhook (Recomendado)</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
                A maneira mais simples de automatizar. Publique seu fluxo e use a URL gerada para disparar a execução de qualquer lugar. Os dados enviados no POST estarão disponíveis no nó <span className="text-emerald-400 font-mono">Webhook Entry</span>.
            </p>
            <div className="flex flex-col gap-2 bg-gray-950 border border-gray-800 rounded-2xl p-4 group">
              <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">URL de Gatilho</span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-500/20 uppercase">POST</span>
              </div>
              <div className="flex items-center gap-3">
                  <code className="text-[11px] font-mono text-emerald-200 flex-1 truncate">
                    {triggerUrl}
                  </code>
                  <button 
                    onClick={() => handleCopy(triggerUrl, 'trigger')}
                    className="shrink-0 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                  >
                    {copied === 'trigger' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'trigger' ? 'Copiado' : 'Copiar'}
                  </button>
              </div>
            </div>
          </section>

          {/* Direct Execution Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <Code className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">2. Execução Direta via API</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
                Envie a estrutura completa do JSON do fluxo para execução imediata no servidor. Ideal para sistemas que geram fluxos dinamicamente.
            </p>
            <div className="flex flex-col gap-2 bg-gray-950 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Endpoint de Execução</span>
                  <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded border border-blue-500/20 uppercase">POST</span>
              </div>
              <div className="flex items-center gap-3">
                  <code className="text-[11px] font-mono text-blue-200 flex-1 truncate">
                    {executeUrl}
                  </code>
                  <button 
                    onClick={() => handleCopy(executeUrl, 'execute')}
                    className="shrink-0 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                  >
                    {copied === 'execute' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'execute' ? 'Copiado' : 'Copiar'}
                  </button>
              </div>
            </div>
          </section>

          {/* Info Section */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 flex gap-4">
              <Info className="w-6 h-6 text-blue-400 shrink-0" />
              <div className="space-y-2">
                  <h4 className="text-xs font-black text-blue-300 uppercase tracking-widest">Dica de Automação Total</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                      Você pode configurar um fluxo que recebe um link via Webhook, usa o nó <span className="text-blue-400 font-bold">HTTP Request</span> para buscar os dados desse link, processa com <span className="text-purple-400 font-bold">IA Gemini</span> e envia o resultado final para outro sistema. Tudo isso acontece automaticamente assim que o endpoint é chamado.
                  </p>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ApiTutorialModal;
