import { MY_API_KEYS } from '../api_keys_list';

/**
 * Gerenciador de Chaves de API (Load Balancer / Rotation)
 */

type KeyListener = (status: string) => void;

class KeyManager {
  private keys: string[] = [];
  private currentIndex: number = 0;
  private failedKeys: Set<string> = new Set();
  private listeners: KeyListener[] = [];

  constructor() {
    this.loadKeys();
  }

  private loadKeys() {
    this.keys = []; // Reset

    // 1. Chave do Usuário (LocalStorage) - PRIORIDADE MÁXIMA
    // Permite que o usuário insira sua própria chave nas configurações
    let customKey: string | null = null;
    if (typeof window !== 'undefined') {
        customKey = localStorage.getItem('gemini_api_key');
    }

    if (customKey && customKey.trim().length > 20 && customKey.startsWith('AIza')) {
        this.keys.push(customKey.trim());
    }

    // 2. Chaves do ambiente (Vercel / AI Studio)
    // Só carrega se não tiver chave customizada ou para fallback
    let envKeys: string[] = [];
    try {
      const rawEnv = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
      if (rawEnv && rawEnv !== "undefined" && rawEnv !== "null") {
        envKeys = rawEnv.split(/[\s,]+/).map(k => k.trim()).filter(k => k.length > 20 && k.startsWith('AIza'));
      }
    } catch (e) {}

    // 3. Chaves do arquivo físico
    const fileKeys = Array.isArray(MY_API_KEYS) 
      ? (MY_API_KEYS as string[]).map(k => k.trim()).filter(k => k && k.length > 20 && k.startsWith('AIza')) 
      : [];
    
    // Mescla chaves de ambiente e arquivo, mas a customKey fica sempre em primeiro se existir
    const systemKeys = Array.from(new Set([...envKeys, ...fileKeys]));
    this.keys = [...this.keys, ...systemKeys];
    
    // Fallback log
    if (this.keys.length === 0) {
      console.warn("[KeyManager] ⚠️ Nenhuma chave API detectada! O fluxo de IA e requisições Google falharão. Configure em 'Settings' ou no arquivo 'api_keys_list.ts'.");
    } else {
      console.log(`[KeyManager] ✅ Pool carregado com ${this.keys.length} chaves.`);
    }
    this.notify();
  }

  public setCustomKey(key: string) {
      // Método chamado quando o usuário salva no SettingsModal ou via API no backend
      if (typeof window !== 'undefined') {
          if (key && key.trim()) {
            localStorage.setItem('gemini_api_key', key.trim());
          } else {
            localStorage.removeItem('gemini_api_key');
          }
      } else {
          // No backend, podemos injetar a chave no process.env para que o loadKeys a pegue
          if (key && key.trim()) {
              process.env.API_KEY = key.trim();
          }
      }
      // Recarrega e reseta estado
      this.reset(); 
      this.loadKeys();
  }

  public subscribe(listener: KeyListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.getStatus()));
  }

  public getActiveKey(): string {
    if (this.keys.length === 0) return '';
    
    let attempts = 0;
    // Pula chaves que já falharam
    while (this.failedKeys.has(this.keys[this.currentIndex]) && attempts < this.keys.length) {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;
    }
    
    return this.keys[this.currentIndex] || '';
  }

  public markCurrentKeyAsFailed(): boolean {
    if (this.keys.length === 0) return false;
    
    const keyToMark = this.keys[this.currentIndex];
    this.failedKeys.add(keyToMark);
    
    console.error(`[KeyManager] Chave #${this.currentIndex + 1} falhou.`);
    
    // Avança para a próxima
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    this.notify();
    
    // Retorna true se ainda houver chaves não testadas ou que não falharam
    return this.failedKeys.size < this.keys.length;
  }

  public getStatus() {
    return JSON.stringify({
        total: this.keys.length,
        failed: this.failedKeys.size,
        current: this.currentIndex,
        healthy: Math.max(0, this.keys.length - this.failedKeys.size)
    });
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public reset() {
    this.failedKeys.clear();
    this.currentIndex = 0;
    this.notify();
  }

  public getAllKeysStatus() {
      return this.keys.map((key, index) => ({
          index,
          id: key.substring(0, 8) + "...",
          isFailed: this.failedKeys.has(key),
          isActive: index === this.currentIndex
      }));
  }
}

export const keyManager = new KeyManager();