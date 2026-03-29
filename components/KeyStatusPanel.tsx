
import React, { useState, useEffect } from 'react';
import { keyManager } from '../services/keyManager';

const KeyStatusPanel: React.FC = () => {
  const [status, setStatus] = useState(JSON.parse(keyManager.getStatus()));
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    return keyManager.subscribe((newStatusStr) => {
      setStatus(JSON.parse(newStatusStr));
    });
  }, []);

  const keyDetails = keyManager.getAllKeysStatus();

  return (
    <div className="relative flex items-center">
      <div 
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 cursor-pointer transition-all"
      >
        <div className="flex -space-x-1">
            {(keyDetails || []).slice(0, 5).map((k) => (
                <div 
                    key={k.index} 
                    className={`w-2 h-2 rounded-full border border-gray-900 ${k.isFailed ? 'bg-red-500' : k.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}
                />
            ))}
            {(keyDetails || []).length > 5 && <div className="text-[8px] text-gray-500 pl-2">+{keyDetails.length - 5}</div>}
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 leading-none">KEY STATUS</span>
            <span className={`text-[10px] font-mono leading-tight ${status.total === 0 ? 'text-orange-400' : status.healthy > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {status.total === 0 ? 'SEM CHAVES' : `#${status.current + 1} (${status.healthy}/${status.total})`}
            </span>
        </div>
      </div>

      {showDetails && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-[100] p-4 animate-fade-in-up">
          <div className="flex justify-between items-center mb-3">
             <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pool de Chaves</h4>
             <button 
                onClick={() => keyManager.reset()}
                className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors"
             >
                Resetar Falhas
             </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {(keyDetails || []).map((k) => (
              <div key={k.index} className={`flex items-center justify-between p-2 rounded-lg border ${k.isActive ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-850 border-gray-800'}`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${k.isFailed ? 'bg-red-500' : k.isActive ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                    <span className="text-[10px] font-mono text-gray-300">Chave #{k.index + 1}</span>
                </div>
                <span className={`text-[9px] font-bold ${k.isFailed ? 'text-red-500' : k.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                    {k.isFailed ? 'ESGOTADA' : k.isActive ? 'ATIVA' : 'STANDBY'}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-800 text-[9px] text-gray-500 italic">
            O sistema troca automaticamente quando uma chave atinge o limite de créditos.
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyStatusPanel;
