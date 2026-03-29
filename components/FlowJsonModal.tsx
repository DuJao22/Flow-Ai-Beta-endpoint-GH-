
import React, { useState, useEffect, useRef } from 'react';
import { FlowNode, FlowEdge } from '../types';

interface FlowJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onImport: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}

const FlowJsonModal: React.FC<FlowJsonModalProps> = ({ isOpen, onClose, nodes, edges, onImport }) => {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Limpa dados internos do ReactFlow para exportação limpa
      const cleanNodes = nodes.map(({ ...n }) => n);
      const cleanEdges = edges.map(({ ...e }) => e);
      setJsonContent(JSON.stringify({ nodes: cleanNodes, edges: cleanEdges }, null, 2));
      setError(null);
      setCopySuccess(false);
    }
  }, [isOpen, nodes, edges]);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!Array.isArray(parsed.nodes)) throw new Error("Formato inválido: 'nodes' deve ser um array.");
      
      onImport(parsed.nodes, parsed.edges || []);
      onClose();
    } catch (e: any) {
      setError(e.message || "Erro de sintaxe JSON");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            // Valida JSON básico
            JSON.parse(content);
            setJsonContent(content);
            setError(null);
        } catch (err) {
            setError("Arquivo inválido: Não é um JSON válido.");
        }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
             </div>
             <div>
                 <h2 className="text-sm md:text-lg font-bold text-white">Editor de Fluxo JSON</h2>
                 <p className="text-[10px] text-gray-400 font-mono uppercase">Edite a estrutura ou baixe o arquivo</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={handleDownload} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded border border-gray-600 flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Baixar JSON
              </button>
              <button onClick={handleCopy} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded border border-gray-600 flex items-center gap-2 transition-colors">
                {copySuccess ? (
                  <><svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copiado!</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copiar</>
                )}
              </button>
              <label className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded border border-gray-600 flex items-center gap-2 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Importar Arquivo
                <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} ref={fileInputRef} />
              </label>
            </div>
            {error && <span className="text-red-400 text-xs font-medium">{error}</span>}
          </div>
          
          <textarea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            className="flex-1 w-full bg-gray-950 text-green-400 font-mono text-xs p-4 rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleApply} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Aplicar Alterações
          </button>
        </div>

      </div>
    </div>
  );
};

export default FlowJsonModal;