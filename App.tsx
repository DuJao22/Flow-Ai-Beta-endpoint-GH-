
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
  MarkerType,
} from 'reactflow';
import type { Connection } from 'reactflow';
import { keyManager } from './services/keyManager';
import { 
  Play, 
  Save, 
  CloudUpload, 
  Settings, 
  Code, 
  Link, 
  ChevronDown, 
  Menu, 
  X, 
  Terminal, 
  MessageSquare, 
  Layers, 
  History,
  Info,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Trash2,
  FileText,
  Activity,
  Cpu,
  Zap,
  Clock,
  Database,
  Send,
  Hash,
  MessageCircle,
  FileCode,
  ArrowRight,
  Globe
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import CustomNode from './components/CustomNode';
import AIChat from './components/AIChat';
import LogPanel from './components/LogPanel';
import FilePanel from './components/FilePanel';
import SettingsModal from './components/SettingsModal';
import ProjectLibraryModal from './components/ProjectLibraryModal'; 
import FlowJsonModal from './components/FlowJsonModal'; 
import WebhookModal from './components/WebhookModal';
import NodeConfigPanel from './components/NodeConfigPanel';
import KeyStatusPanel from './components/KeyStatusPanel';
import ApiTutorialModal from './components/ApiTutorialModal';
import HistoryPanel from './components/HistoryPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { INITIAL_NODES, INITIAL_EDGES, APP_NAME } from './constants';
import { FlowEngine } from './services/flowEngine';
import { storageService } from './services/storageService'; 
import { FlowSchema, LogEntry, NodeStatus, GeneratedFile, FlowNode, SavedProject, NodeType, FlowEdge, NodeData } from './types';

const nodeTypes = {
  custom: CustomNode,
  httpRequest: CustomNode,
  webhook: CustomNode,
  delay: CustomNode,
  ifCondition: CustomNode,
  logger: CustomNode,
  discord: CustomNode,
  telegram: CustomNode,
  gemini: CustomNode,
  fileSave: CustomNode,
  start: CustomNode
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { strokeWidth: 3, stroke: '#3b82f6' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
};

const AUTOSAVE_KEY = 'flow_architect_autosave_v2';

const App = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(INITIAL_NODES as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes.find(n => n.id === selectedNodeId)]);

  const [currentProject, setCurrentProject] = useState<{id: string, name: string} | null>(null);

  // MOBILE STATE
  const [activeTab, setActiveTab] = useState<'flow' | 'chat' | 'terminal'>('flow');
  
  // DESKTOP STATE (Toggles)
  const [showDesktopChat, setShowDesktopChat] = useState(true);
  const [showDesktopLogs, setShowDesktopLogs] = useState(false);

  const [terminalSubTab, setTerminalSubTab] = useState<'logs' | 'files' | 'history'>('logs');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false); 
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false); 
  const [isApiTutorialOpen, setIsApiTutorialOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  
  const [keyStatus, setKeyStatus] = useState(JSON.parse(keyManager.getStatus()));

  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return keyManager.subscribe((newStatusStr) => {
      setKeyStatus(JSON.parse(newStatusStr));
    });
  }, []);

  useEffect(() => {
    // Sincroniza a chave de API local com o backend para que webhooks funcionem
    const syncApiKey = async () => {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        try {
          await fetch('/api/settings/api-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: storedKey })
          });
        } catch (e) {
          console.error('Erro ao sincronizar chave com o servidor no carregamento:', e);
        }
      }
    };
    syncApiKey();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMainMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nodes) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges || []);
          setFiles(parsed.files || []);
          if (parsed.currentProject) setCurrentProject(parsed.currentProject);
          if (parsed.webhookUrl) setWebhookUrl(parsed.webhookUrl);
        }
      } catch (e) {}
    }
    setIsLoaded(true);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!isLoaded) return;
    
    // Debounce autosave more aggressively and avoid saving on every tiny change
    const timeoutId = setTimeout(() => {
      // Only save if there are nodes (avoid clearing on accidental empty state)
      if (nodes.length > 0) {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ nodes, edges, files, currentProject, webhookUrl }));
      }
    }, 3000); // Increased to 3s to reduce frequency
    
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, files, isLoaded, currentProject, webhookUrl]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges]
  );

  const handlePublish = async () => {
    console.log("handlePublish: Iniciando publicação...");
    let project = currentProject;
    
    try {
        if (!project) {
            console.log("handlePublish: Nenhum projeto selecionado, criando um padrão...");
            // Se não houver projeto, salva com um nome padrão sem interromper com prompt
            const defaultName = `Fluxo Automático ${new Date().toLocaleDateString()}`;
            const newProj = storageService.saveProject(defaultName, nodes, edges, files);
            project = { id: newProj.id, name: newProj.name };
            setCurrentProject(project);
            console.log("handlePublish: Projeto criado:", project.id);
        }
        
        setSaveStatus('saving');
        
        // Feedback imediato: define a URL do webhook de forma otimista
        const optimisticUrl = `${window.location.origin}/api/trigger/${project.id}`;
        setWebhookUrl(optimisticUrl);
        
        console.log("handlePublish: Enviando para o servidor...");
        
        const response = await fetch('/api/save-flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: project.id,
                nodes,
                edges
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido no servidor' }));
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("handlePublish: Resposta do servidor:", data);

        if (data.success) {
            const fullUrl = `${window.location.origin}${data.webhookUrl}`;
            setWebhookUrl(fullUrl);
            setSaveStatus('saved');
            console.log("handlePublish: Sucesso! Abrindo modal...");
            setIsWebhookModalOpen(true); // ABRE O MODAL AO PUBLICAR
            setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
            throw new Error(data.error || "Falha ao salvar fluxo no servidor.");
        }
    } catch (e: any) {
        console.error("handlePublish: Erro ao publicar:", e);
        alert("Erro ao publicar: " + e.message);
        setSaveStatus('idle');
    } finally {
        setTimeout(() => {
            setSaveStatus(prev => prev === 'saving' ? 'idle' : prev);
        }, 500);
    }
  };

  const handleAddNode = useCallback((type: NodeType, label: string) => {
    const id = `${type}-${Date.now()}`;
    const newNode: FlowNode = {
      id,
      type: 'custom',
      position: { x: 50, y: 150 },
      data: { label, type, status: NodeStatus.IDLE, config: {} }
    };
    setNodes((nds) => nds.concat(newNode));
    setIsAddMenuOpen(false);
    setSelectedNodeId(id);
  }, [setNodes]);

  const handleUpdateNodeConfig = useCallback((id: string, config: Record<string, any>) => {
    setNodes(nds => nds.map(n => n.id === id ? {
      ...n, 
      data: { ...n.data, config }
    } : n));
  }, [setNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [setNodes, selectedNodeId]);

  const handleRunFlow = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setLogs([]); 
    
    // Auto-open logs on execution
    if (window.innerWidth >= 768) {
        setShowDesktopLogs(true);
    } else {
        setActiveTab('terminal');
    }
    setTerminalSubTab('logs');
    setNodes((nds) => nds.map(n => ({ ...n, data: { ...n.data, status: NodeStatus.IDLE } })));

    const engine = new FlowEngine(
      nodes, edges, setNodes, 
      (log: LogEntry) => setLogs(prev => [...prev, log]),
      (file: GeneratedFile) => setFiles(prev => [file, ...prev])
    );

    try {
        await engine.run();
    } catch (e: any) {
        console.error("Erro na execução do fluxo:", e);
        setLogs(prev => [...prev, {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            nodeId: 'system',
            nodeLabel: 'Engine',
            level: 'ERROR',
            message: `Erro crítico: ${e.message}`
        }]);
    } finally {
        setIsExecuting(false);
    }
  }, [nodes, edges, isExecuting, setNodes]);

  const handleSaveProject = () => {
    setSaveStatus('saving');
    
    if (currentProject) {
        storageService.updateProject(currentProject.id, nodes, edges, files);
        setTimeout(() => setSaveStatus('saved'), 500);
        setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
        const name = window.prompt("Nome do Projeto:", "Meu Fluxo Automático");
        if (name) {
            const newProj = storageService.saveProject(name, nodes, edges, files);
            setCurrentProject({ id: newProj.id, name: newProj.name });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
            setSaveStatus('idle');
        }
    }
  };

  const handleLoadProject = (project: SavedProject) => {
    setNodes(project.nodes.map(n => ({ ...n, type: 'custom' })));
    setEdges(project.edges.map(e => ({ ...e, ...defaultEdgeOptions })));
    setFiles(project.files || []);
    setCurrentProject({ id: project.id, name: project.name });
    setActiveTab('flow');
  };

  const handleImportFlow = (flowData: FlowSchema) => {
      setNodes(flowData.nodes.map(n => ({ ...n, type: 'custom' })));
      setEdges(flowData.edges.map(e => ({ ...e, ...defaultEdgeOptions })));
      setActiveTab('flow');
  };

  const handleImportJson = (newNodes: FlowNode[], newEdges: FlowEdge[]) => {
      setNodes(newNodes.map(n => ({ ...n, type: 'custom' })));
      setEdges(newEdges.map(e => ({ ...e, ...defaultEdgeOptions })));
      setActiveTab('flow');
  };

  const handleDeleteFile = (id: string) => {
    if (window.confirm('Excluir este arquivo permanentemente?')) {
        setFiles(prev => prev.filter(f => f.id !== id));
    }
  };

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="flex h-[100dvh] w-screen overflow-hidden flex-col bg-gray-950 text-white selection:bg-blue-500/30">
        
        {/* HEADER */}
        <header className="h-14 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-4 shrink-0 z-[150] shadow-2xl relative">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 group cursor-pointer overflow-hidden relative">
                    <Zap className="w-5 h-5 text-white relative z-10" />
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex flex-col hidden xs:flex">
                    <h1 className="font-black text-xs tracking-widest uppercase leading-none text-white flex items-center gap-2">
                      {APP_NAME} 
                      <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold tracking-[0.2em]">- BETA</span>
                    </h1>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] text-gray-500 font-mono truncate max-w-[120px] uppercase tracking-tighter">{currentProject?.name || 'Projeto Local'}</span>
                    </div>
                </div>
            </div>

            {/* STATUS TICKER & WEBHOOK (DESKTOP/TABLET) */}
            <div className="hidden md:flex flex-1 items-center gap-6 px-4 overflow-hidden">
                {webhookUrl && (
                    <div 
                        onClick={() => setIsWebhookModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-indigo-500/20 transition-all group max-w-[240px] shrink-0 animate-in fade-in slide-in-from-left-2"
                    >
                        <Link className="w-3 h-3 text-indigo-400" />
                        <code className="text-[9px] font-mono text-indigo-200 truncate">{webhookUrl}</code>
                        <ExternalLink className="w-2.5 h-2.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}

                {logs.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-400 overflow-hidden animate-in fade-in slide-in-from-left-4">
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            logs[logs.length-1].level === 'ERROR' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                            logs[logs.length-1].level === 'SUCCESS' ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                        )} />
                        <span className="text-[10px] font-bold truncate uppercase tracking-tight text-gray-300">
                            <span className="text-blue-400 mr-1">{logs[logs.length-1].nodeLabel}:</span>
                            {logs[logs.length-1].message}
                        </span>
                    </div>
                )}
            </div>

            {/* DESKTOP VIEW TOGGLES */}
            <div className="hidden lg:flex items-center gap-1 ml-auto border-l border-gray-800 pl-4 h-8 shrink-0">
                <button 
                    onClick={() => setShowDesktopLogs(!showDesktopLogs)}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                        showDesktopLogs ? "bg-gray-800 text-white shadow-inner" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                    )}
                >
                    <Terminal className="w-3.5 h-3.5" />
                    Logs
                </button>
                <button 
                    onClick={() => setShowDesktopChat(!showDesktopChat)}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                        showDesktopChat ? "bg-gray-800 text-white shadow-inner" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                    )}
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    IA Chat
                </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="hidden sm:block">
                 <KeyStatusPanel />
             </div>
             
             {/* MAIN MENU DROPDOWN */}
             <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsMainMenuOpen(!isMainMenuOpen)}
                    className={cn(
                        "flex items-center gap-2 px-3 h-10 rounded-xl transition-all border shadow-md active:scale-95 z-[160]",
                        isMainMenuOpen ? "bg-gray-800 border-gray-600 text-white" : "bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                >
                    <Menu className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Menu</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isMainMenuOpen && "rotate-180")} />
                </button>

                {isMainMenuOpen && (
                    <div className="absolute top-12 right-0 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[200] p-2">
                        <div className="px-3 py-2 border-b border-gray-800 mb-1">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Ferramentas & Config</span>
                        </div>
                        
                        <button 
                            onClick={() => { setIsMainMenuOpen(false); setIsJsonModalOpen(true); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors">
                                <Code className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold">Editor JSON</span>
                                <span className="text-[9px] text-gray-500 uppercase tracking-tighter">Importar/Exportar Código</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => { setIsMainMenuOpen(false); webhookUrl ? setIsWebhookModalOpen(true) : setIsApiTutorialOpen(true); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-emerald-600/20 group-hover:text-emerald-400 transition-colors">
                                <Link className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold">API / Webhook</span>
                                <span className="text-[9px] text-gray-500 uppercase tracking-tighter">Integração Externa</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => { setIsMainMenuOpen(false); setIsLibraryOpen(true); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-purple-600/20 group-hover:text-purple-400 transition-colors">
                                <Layers className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold">Biblioteca</span>
                                <span className="text-[9px] text-gray-500 uppercase tracking-tighter">Projetos Salvos</span>
                            </div>
                        </button>

                        <div className="h-px bg-gray-800 my-1 mx-2" />

                        <button 
                            onClick={() => { setIsMainMenuOpen(false); setIsSettingsOpen(true); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-orange-600/20 group-hover:text-orange-400 transition-colors">
                                <Settings className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold">Configurações</span>
                                <span className="text-[9px] text-gray-500 uppercase tracking-tighter">API Keys & Preferências</span>
                            </div>
                        </button>
                    </div>
                )}
             </div>

             <div className="h-8 w-px bg-gray-800 mx-1 hidden md:block" />

             {/* ACTION BUTTONS */}
             <div className="flex items-center gap-2">
                 {/* BOTÃO SAVE */}
                 <button 
                    onClick={handleSaveProject}
                    className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-xl transition-all border shadow-md active:scale-95",
                        saveStatus === 'saved' ? 'bg-green-600 text-white border-green-500' :
                        saveStatus === 'saving' ? 'bg-blue-800 text-blue-300 border-blue-700' :
                        'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border-gray-700'
                    )}
                    title="Salvar Projeto"
                 >
                    {saveStatus === 'saved' ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                 </button>

                 {/* BOTÃO PUBLICAR */}
                 <button 
                    onClick={handlePublish}
                    disabled={saveStatus === 'saving'}
                    className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-xl transition-all border shadow-md active:scale-90",
                        webhookUrl ? 'bg-indigo-900/40 border-indigo-700/50 text-indigo-400 hover:bg-indigo-800/60' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    )}
                    title={webhookUrl ? "Atualizar Webhook" : "Publicar Webhook"}
                 >
                    {saveStatus === 'saving' ? (
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <CloudUpload className="w-5 h-5" />
                    )}
                 </button>

                 {/* BOTÃO RUN */}
                 <button 
                    onClick={handleRunFlow} 
                    disabled={isExecuting}
                    className={cn(
                        "flex items-center gap-2 px-4 h-10 rounded-xl transition-all shadow-lg active:scale-90 font-black text-[10px] uppercase tracking-[0.2em]",
                        isExecuting ? 'bg-blue-900/50 text-blue-300 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
                    )}
                 >
                    {isExecuting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white animate-spin rounded-full" />
                    ) : (
                        <Play className="w-4 h-4 fill-current" />
                    )}
                    <span className="hidden md:inline">Executar</span>
                 </button>
             </div>
          </div>
        </header>

        {/* TOP NAV - MOBILE ONLY */}
        <nav className="h-[55px] bg-gray-900/95 backdrop-blur-md border-b border-gray-800 flex items-center justify-around px-2 shrink-0 z-[140] md:hidden shadow-lg relative">
          <button 
            onClick={() => setActiveTab('flow')} 
            className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-all py-1 relative",
                activeTab === 'flow' ? "text-blue-500" : "text-gray-500"
            )}
          >
             <Layers className="w-5 h-5" />
             <span className="text-[8px] font-black uppercase tracking-widest">Fluxo</span>
             {activeTab === 'flow' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('chat')} 
            className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-all py-1 relative",
                activeTab === 'chat' ? "text-blue-500" : "text-gray-500"
            )}
          >
             <MessageSquare className="w-5 h-5" />
             <span className="text-[8px] font-black uppercase tracking-widest">AI Chat</span>
             {activeTab === 'chat' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('terminal')} 
            className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-all py-1 relative",
                activeTab === 'terminal' ? "text-blue-500" : "text-gray-500"
            )}
          >
             <div className="relative">
                <Terminal className="w-5 h-5" />
                {logs.some(l => l.level === 'ERROR') && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-900"></span>}
             </div>
             <span className="text-[8px] font-black uppercase tracking-widest">Logs</span>
             {activeTab === 'terminal' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => { setIsMainMenuOpen(true); }} 
            className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-500 py-1"
          >
             <Menu className="w-5 h-5" />
             <span className="text-[8px] font-black uppercase tracking-widest">Menu</span>
          </button>
        </nav>

        {/* API KEY WARNING BANNER */}
        {keyStatus.total === 0 && (
            <div className="bg-orange-500/20 border-b border-orange-500/30 px-4 py-2 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-500 z-[130] shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                        <Info className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[11px] font-black text-orange-200 uppercase tracking-wider truncate">Atenção: Nenhuma Chave API</span>
                        <p className="text-[10px] text-orange-400/80 leading-tight truncate">Adicione uma chave Gemini para habilitar a IA e o processamento de fluxos.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95 shrink-0"
                >
                    Configurar
                </button>
            </div>
        )}

        {/* MOBILE STATUS BAR (Optional, only if webhook exists) */}
        {webhookUrl && activeTab === 'flow' && (
            <div 
                onClick={() => setIsWebhookModalOpen(true)}
                className="md:hidden bg-indigo-900/20 border-b border-indigo-500/20 px-4 py-1.5 flex items-center justify-between gap-2 animate-in slide-in-from-top duration-300"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Link className="w-3 h-3 text-indigo-400 shrink-0" />
                    <code className="text-[9px] font-mono text-indigo-200 truncate">{webhookUrl}</code>
                </div>
                <Copy className="w-3 h-3 text-indigo-400 shrink-0" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(webhookUrl); }} />
            </div>
        )}

        {/* ÁREA PRINCIPAL */}
        <main className="flex-1 relative overflow-hidden bg-gray-950 flex flex-col md:flex-row">
          
          {/* ÁREA DE FLUXO & LOGS DESKTOP */}
          <div className={cn(
              "flex-1 flex flex-col relative min-w-0 transition-opacity duration-200",
              (activeTab === 'flow' || window.innerWidth >= 768) ? "opacity-100" : "hidden md:flex"
          )}>
            
            {/* PAINEL SUPERIOR DE LOGS (DESKTOP) - MOVED FROM BOTTOM */}
            {showDesktopLogs && (
                <div className="hidden md:flex flex-col h-[30%] min-h-[200px] border-b border-gray-800 bg-gray-950 z-[100] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                     <div className="flex bg-gray-900/80 backdrop-blur p-1.5 border-b border-gray-800 items-center">
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setTerminalSubTab('logs')} 
                                className={cn(
                                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                                    terminalSubTab === 'logs' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                                )}
                            >
                                <Terminal className="w-3.5 h-3.5" />
                                Logs
                            </button>
                            <button 
                                onClick={() => setTerminalSubTab('files')} 
                                className={cn(
                                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                                    terminalSubTab === 'files' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                                )}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Arquivos ({files.length})
                            </button>
                            <button 
                                onClick={() => setTerminalSubTab('history')} 
                                className={cn(
                                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                                    terminalSubTab === 'history' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                                )}
                            >
                                <History className="w-3.5 h-3.5" />
                                Histórico
                            </button>
                        </div>
                        <div className="flex-1"></div>
                        <button 
                            onClick={() => setShowDesktopLogs(false)} 
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                         {terminalSubTab === 'logs' ? <LogPanel logs={logs} isOpen={true} onSelectNode={(id) => setSelectedNodeId(id)} /> : 
                          terminalSubTab === 'files' ? <FilePanel files={files} projectName={currentProject?.name} onDeleteFile={handleDeleteFile} /> :
                          <HistoryPanel />}
                    </div>
                </div>
            )}

            {/* CANVAS */}
            <div className="flex-1 relative">
                <ReactFlow 
                    nodes={nodes} edges={edges} 
                    onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} 
                    onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                    onPaneClick={() => {}} 
                    nodeTypes={nodeTypes} defaultEdgeOptions={defaultEdgeOptions}
                    fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.1} maxZoom={2} proOptions={{ hideAttribution: true }}
                >
                  <Background color="#1e293b" gap={25} size={1} />
                  
                  <Panel position="top-right" className="mt-4 mr-4">
                     <div className="relative">
                         <button 
                          onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} 
                          className={cn(
                              "bg-blue-600 text-white w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all border-4 border-gray-950 hover:bg-blue-500 group",
                              isAddMenuOpen && "rotate-45 bg-red-600 hover:bg-red-500"
                          )}
                         >
                            <Plus className="w-7 h-7" />
                         </button>
                         
                         {isAddMenuOpen && (
                            <div className="absolute top-16 right-0 w-56 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200 z-[200] p-1.5">
                                <div className="px-3 py-2 border-b border-gray-800 mb-1">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Adicionar Nó</span>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {[
                                      {type: NodeType.START, label: 'Gatilho Manual', color: 'bg-green-500', icon: Play},
                                      {type: NodeType.WEBHOOK, label: 'Webhook Entry', color: 'bg-emerald-500', icon: Link},
                                      {type: NodeType.HTTP_REQUEST, label: 'HTTP / API', color: 'bg-blue-500', icon: Globe},
                                      {type: NodeType.GEMINI, label: 'IA Gemini', color: 'bg-purple-500', icon: Cpu},
                                      {type: NodeType.IF_CONDITION, label: 'Lógica IF', color: 'bg-yellow-500', icon: Hash},
                                      {type: NodeType.DELAY, label: 'Delay', color: 'bg-orange-500', icon: Clock},
                                      {type: NodeType.FILE_SAVE, label: 'Salvar Arquivo', color: 'bg-indigo-500', icon: FileCode},
                                      {type: NodeType.DISCORD, label: 'Discord', color: 'bg-indigo-400', icon: MessageCircle},
                                      {type: NodeType.TELEGRAM, label: 'Telegram', color: 'bg-sky-500', icon: Send},
                                      {type: NodeType.LOGGER, label: 'Log Console', color: 'bg-gray-500', icon: Terminal},
                                    ].map(item => (
                                        <button 
                                            key={item.type} 
                                            onClick={() => handleAddNode(item.type, item.label)} 
                                            className="w-full px-3 py-2.5 text-left hover:bg-gray-800 flex items-center gap-3 rounded-xl transition-colors group"
                                        >
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm", item.color)}>
                                                {item.icon ? <item.icon className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                            <span className="text-xs font-bold text-gray-300 group-hover:text-white">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                         )}
                     </div>
                  </Panel>

                  <Controls position="bottom-left" className="!bg-gray-900 !border-gray-800 !fill-white hidden md:flex rounded-xl overflow-hidden shadow-xl mb-4 ml-4" />
                </ReactFlow>
            </div>
          </div>

          {/* SIDEBAR CHAT (DESKTOP) */}
          {showDesktopChat && (
              <div className="hidden md:flex flex-none w-[400px] bg-gray-950 border-l border-gray-800 z-[110] flex-col shadow-2xl relative">
                   <AIChat onImportFlow={handleImportFlow} logs={logs} nodes={nodes} edges={edges} />
              </div>
          )}

          {/* VIEWS MOBILE (Chat & Terminal) */}
          <div className={cn("md:hidden flex-1 overflow-y-auto overscroll-contain", activeTab === 'chat' ? "block" : "hidden")}>
             <AIChat onImportFlow={handleImportFlow} logs={logs} nodes={nodes} edges={edges} />
          </div>
          <div className={cn("md:hidden flex-1 overflow-hidden", activeTab === 'terminal' ? "block" : "hidden")}>
             <div className="flex flex-col h-full bg-gray-950">
                <div className="flex bg-gray-900 p-2 border-b border-gray-800 gap-2">
                    <button 
                        onClick={() => setTerminalSubTab('logs')} 
                        className={cn(
                            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                            terminalSubTab === 'logs' ? "bg-blue-600 text-white shadow-lg" : "bg-gray-800 text-gray-500"
                        )}
                    >
                        <Terminal className="w-4 h-4" />
                        Logs
                    </button>
                    <button 
                        onClick={() => setTerminalSubTab('files')} 
                        className={cn(
                            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                            terminalSubTab === 'files' ? "bg-blue-600 text-white shadow-lg" : "bg-gray-800 text-gray-500"
                        )}
                    >
                        <FileText className="w-4 h-4" />
                        Arquivos
                    </button>
                    <button 
                        onClick={() => setTerminalSubTab('history')} 
                        className={cn(
                            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                            terminalSubTab === 'history' ? "bg-blue-600 text-white shadow-lg" : "bg-gray-800 text-gray-500"
                        )}
                    >
                        <History className="w-4 h-4" />
                        Histórico
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    {terminalSubTab === 'logs' ? <LogPanel logs={logs} isOpen={true} onSelectNode={(id) => setSelectedNodeId(id)} /> : 
                     terminalSubTab === 'files' ? <FilePanel files={files} projectName={currentProject?.name} onDeleteFile={handleDeleteFile} /> :
                     <HistoryPanel />}
                </div>
             </div>
          </div>

        </main>

        {/* REMOVED BOTTOM NAV - MOVED TO TOP */}

        <NodeConfigPanel 
          node={selectedNode} 
          isOpen={!!selectedNode} 
          onClose={() => setSelectedNodeId(null)} 
          onUpdate={handleUpdateNodeConfig} 
          onDelete={handleDeleteNode} 
          onDuplicate={() => {}} 
        />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <ProjectLibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onLoadProject={handleLoadProject} currentNodesCount={nodes.length} activeProjectId={currentProject?.id} />
        <FlowJsonModal isOpen={isJsonModalOpen} onClose={() => setIsJsonModalOpen(false)} nodes={nodes} edges={edges} onImport={handleImportJson} />
        <ApiTutorialModal isOpen={isApiTutorialOpen} onClose={() => setIsApiTutorialOpen(false)} />
        <WebhookModal isOpen={isWebhookModalOpen} onClose={() => setIsWebhookModalOpen(false)} webhookUrl={webhookUrl || ''} />
      </div>
    </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default App;
