
import React, { useEffect, useState } from 'react';
import { CREATOR_CREDIT } from '../constants';
import { keyManager } from '../services/keyManager';
import { validateGeminiKey } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(storedKey);
      setValidationStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      localStorage.removeItem('gemini_api_key');
      keyManager.setCustomKey('');
      
      // Remove do backend também
      try {
        await fetch('/api/settings/api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: '' })
        });
      } catch (e) {
        console.error('Erro ao limpar chave no servidor:', e);
      }

      onClose();
      return;
    }

    setIsValidating(true);
    setValidationStatus('idle');
    setErrorMessage('');

    const result = await validateGeminiKey(apiKey.trim());
    setIsValidating(false);

    if (result.valid) {
        setValidationStatus('success');
        localStorage.setItem('gemini_api_key', apiKey.trim());
        keyManager.setCustomKey(apiKey.trim());
        
        // Envia a chave para o backend para que webhooks/endpoints possam usá-la
        try {
          await fetch('/api/settings/api-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: apiKey.trim() })
          });
        } catch (e) {
          console.error('Erro ao sincronizar chave com o servidor:', e);
        }

        setTimeout(() => onClose(), 800);
    } else {
        setValidationStatus('error');
        setErrorMessage(result.error || 'Chave inválida');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-gray-900 border-t md:border border-gray-700 rounded-t-2xl md:rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-slide-up md:animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle de arrastar para mobile */}
        <div className="w-full flex justify-center pt-3 pb-1 md:hidden" onClick={onClose}>
            <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
        </div>

        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Configurações API
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Chave Gemini (Google AI)</label>
            <p className="text-[11px] text-gray-500 mb-2 leading-tight">
              A chave é necessária para corrigir o erro 403 e usar o Chat. Obtenha grátis no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-bold">Google AI Studio</a>.
            </p>
            <div className="relative">
                <input 
                  type="text" 
                  value={apiKey}
                  onChange={(e) => {
                      setApiKey(e.target.value);
                      setValidationStatus('idle');
                      setErrorMessage('');
                  }}
                  disabled={isValidating}
                  placeholder="Cole sua chave AIza..."
                  className={`w-full bg-gray-950 border rounded-xl p-4 text-base text-white focus:outline-none transition-all font-mono shadow-inner
                    ${validationStatus === 'error' ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 
                      validationStatus === 'success' ? 'border-green-500 focus:ring-1 focus:ring-green-500' : 
                      'border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}
                  `}
                />
                
                <div className="absolute right-3 top-3.5">
                  {isValidating ? (
                     <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : validationStatus === 'success' ? (
                     <svg className="w-6 h-6 text-green-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : validationStatus === 'error' ? (
                     <svg className="w-6 h-6 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ) : null}
                </div>
            </div>

            <div className="min-h-[20px]">
                {validationStatus === 'error' && (
                    <p className="text-xs text-red-400 font-bold flex items-center gap-1 animate-fade-in mt-1">
                        ❌ {errorMessage}
                    </p>
                )}
                {validationStatus === 'success' && (
                    <p className="text-xs text-green-400 font-bold flex items-center gap-1 animate-fade-in mt-1">
                        ✅ Chave salva e pronta para uso!
                    </p>
                )}
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4 text-xs text-gray-400 space-y-2 border border-gray-700/50">
             <div className="flex justify-between">
                <span>Versão</span>
                <span className="text-gray-200">1.5.0 Mobile-First</span>
              </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-800 flex gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Cancelar
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isValidating}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all shadow-lg flex items-center justify-center gap-2
                ${isValidating 
                    ? 'bg-blue-800 text-blue-200 cursor-wait' 
                    : validationStatus === 'success'
                        ? 'bg-green-600 text-white shadow-green-900/30'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 active:scale-95'
                }
            `}
          >
            {isValidating ? 'Validando...' : validationStatus === 'success' ? 'SALVO' : 'SALVAR CHAVE'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
