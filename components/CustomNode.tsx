
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { 
  Play, 
  Globe, 
  Cpu, 
  GitBranch, 
  Clock, 
  FileCode, 
  MessageCircle, 
  Send, 
  Terminal, 
  Link,
  Settings,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { NodeStatus, NodeType } from '../types';

const getNodeIcon = (type: NodeType) => {
  const className = "w-4 h-4";
  switch (type) {
    case NodeType.START: return <Play className={className} />;
    case NodeType.WEBHOOK: return <Link className={className} />;
    case NodeType.HTTP_REQUEST: return <Globe className={className} />;
    case NodeType.GEMINI: return <Cpu className={className} />;
    case NodeType.IF_CONDITION: return <GitBranch className={className} />;
    case NodeType.DELAY: return <Clock className={className} />;
    case NodeType.FILE_SAVE: return <FileCode className={className} />;
    case NodeType.DISCORD: return <MessageCircle className={className} />;
    case NodeType.TELEGRAM: return <Send className={className} />;
    case NodeType.LOGGER: return <Terminal className={className} />;
    case NodeType.INDICATOR: return <Activity className={className} />;
    default: return <Settings className={className} />;
  }
};

const CustomNode = ({ data, isConnectable, selected }: NodeProps) => {
  // Configuração visual baseada no status
  let statusStyles = 'border-gray-700 bg-gray-900/90'; 
  let statusLabel = null;
  let statusIcon = null;

  const nodeIcon = getNodeIcon(data.type as NodeType);

  switch (data.status as NodeStatus) {
    case NodeStatus.RUNNING:
      statusStyles = 'border-blue-500 bg-blue-900/20 shadow-[0_0_20px_rgba(59,130,246,0.4)] ring-1 ring-blue-500/50 animate-pulse z-50';
      statusLabel = (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50">
             <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                <Zap className="w-2.5 h-2.5 animate-bounce" />
                PROCESSANDO
             </span>
        </div>
      );
      statusIcon = <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>;
      break;

    case NodeStatus.SUCCESS:
      statusStyles = 'border-emerald-500/50 bg-emerald-900/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
      statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-2" />;
      break;

    case NodeStatus.ERROR:
      statusStyles = 'border-red-500/50 bg-red-900/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
      statusIcon = <AlertCircle className="w-3.5 h-3.5 text-red-400 mr-2" />;
      statusLabel = (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
             <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                FALHOU
             </span>
        </div>
      );
      break;
      
    case NodeStatus.IDLE:
    default:
      if (selected) {
          statusStyles = 'border-blue-500 bg-gray-800/90 ring-2 ring-blue-500/50 shadow-2xl scale-[1.02]';
      } else {
          statusStyles = 'border-gray-700 bg-gray-900/80 hover:border-gray-600 hover:bg-gray-800/90';
      }
      statusIcon = <div className={`rounded-full w-2 h-2 mr-2 ${selected ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-gray-700'}`}></div>;
      break;
  }

  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200 relative group bg-gray-900/90 ${statusStyles}`}>
      
      {statusLabel}

      <div className="flex items-center">
        <div className="p-2 rounded-lg bg-gray-800/50 mr-3 border border-gray-700/50 group-hover:bg-gray-700/50 transition-colors">
            {nodeIcon}
        </div>
        <div className="flex flex-col overflow-hidden">
          <div className="text-[13px] font-black text-gray-100 truncate max-w-[140px] uppercase tracking-tight" title={data.label}>
            {data.label}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {statusIcon}
            <div className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black">
                {data.type}
            </div>
          </div>
        </div>
      </div>

      {/* Inputs (Top) */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-gray-700 !border-2 !border-gray-950 hover:!bg-blue-500 transition-colors !top-[-7px]"
      />

      {/* Outputs (Bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-gray-700 !border-2 !border-gray-950 hover:!bg-blue-500 transition-colors !bottom-[-7px]"
      />
    </div>
  );
};

export default memo(CustomNode);
