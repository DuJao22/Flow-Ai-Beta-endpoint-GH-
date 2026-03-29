import React, { useState } from 'react';

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
}

const WebhookModal: React.FC<WebhookModalProps> = ({ isOpen, onClose, webhookUrl }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'trigger' | 'execute' | 'save'>('trigger');

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseUrl = webhookUrl.split('/api/trigger/')[0];
  const flowId = webhookUrl.split('/api/trigger/')[1];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="p-6 text-center border-b border-gray-800 bg-indigo-950/20 shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30 shadow-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">API & Webhooks</h2>
          <p className="text-sm text-indigo-300/70 mt-1 font-medium">Integre seu sistema externo com o Flow Architect.</p>
        </div>

        <div className="flex border-b border-gray-800 bg-gray-900/50 shrink-0">
          <button
            onClick={() => setActiveTab('trigger')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === 'trigger' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-950/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
          >
            1. Gatilho (Executar Salvo)
          </button>
          <button
            onClick={() => setActiveTab('execute')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === 'execute' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-950/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
          >
            2. Executar Dinâmico
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === 'save' ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-950/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
          >
            3. Salvar / Atualizar
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'trigger' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Para que serve?
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Inicia a execução deste fluxo específico que já está salvo no servidor. Os dados enviados no corpo da requisição (body) serão injetados como variáveis de entrada (<code className="text-indigo-300 bg-indigo-950 px-1 rounded">{'{{input.campo}}'}</code>).
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Endpoint (POST / GET)</label>
                <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl p-3 group hover:border-indigo-500/50 transition-colors">
                  <code className="text-xs text-indigo-300 font-mono flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {webhookUrl}
                  </code>
                  <button 
                    onClick={() => handleCopy(webhookUrl)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 active:scale-95'}`}
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Payload Esperado (Exemplo)</label>
                <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-x-auto">
{`{
  "qualquer_dado": "valor",
  "mensagem": "Olá mundo!"
}`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'execute' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Para que serve?
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Executa um fluxo dinamicamente <strong>sem precisar salvá-lo</strong>. Ideal se o seu sistema externo gera a estrutura do fluxo (<code className="text-emerald-300 bg-emerald-950 px-1 rounded">nodes</code> e <code className="text-emerald-300 bg-emerald-950 px-1 rounded">edges</code>) e quer apenas o resultado da execução.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Endpoint (POST)</label>
                <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl p-3 group hover:border-emerald-500/50 transition-colors">
                  <code className="text-xs text-emerald-300 font-mono flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {baseUrl}/api/execute-flow
                  </code>
                  <button 
                    onClick={() => handleCopy(`${baseUrl}/api/execute-flow`)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95'}`}
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Payload Esperado (Obrigatório)</label>
                <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-x-auto">
{`{
  "nodes": [
    { "id": "node-1", "type": "custom", "data": { ... } }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2" }
  ],
  "data": {
    "opcional": "dados de entrada para o fluxo"
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'save' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Para que serve?
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Salva ou atualiza a estrutura de um fluxo no servidor. Assim, ele aparecerá na interface visual e poderá ser acionado posteriormente pelo Gatilho (Trigger).
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Endpoint (POST)</label>
                <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl p-3 group hover:border-amber-500/50 transition-colors">
                  <code className="text-xs text-amber-300 font-mono flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {baseUrl}/api/save-flow
                  </code>
                  <button 
                    onClick={() => handleCopy(`${baseUrl}/api/save-flow`)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 active:scale-95'}`}
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Payload Esperado (Obrigatório)</label>
                <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-x-auto">
{`{
  "id": "${flowId || 'id-do-fluxo'}",
  "nodes": [ ... ],
  "edges": [ ... ]
}`}
                </pre>
              </div>
            </div>
          )}

        </div>

        <div className="p-4 bg-gray-900/50 border-t border-gray-800 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebhookModal;
