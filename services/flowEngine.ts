import { FlowNode, FlowEdge, NodeType, NodeStatus, LogEntry, ExecutionContext, GeneratedFile } from '../types';
import { keyManager } from './keyManager';
import { GoogleGenAI } from "@google/genai";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createLog = (nodeId: string, label: string, level: LogEntry['level'], message: string): LogEntry => ({
  id: Math.random().toString(36).substr(2, 9),
  timestamp: new Date().toISOString(),
  nodeId,
  nodeLabel: label,
  level,
  message
});

export class FlowEngine {
  private nodes: FlowNode[];
  private edges: FlowEdge[];
  private setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
  private addLog: (log: LogEntry) => void;
  private onFileGenerated?: (file: GeneratedFile) => void;
  public context: ExecutionContext = {};

  constructor(
    nodes: FlowNode[], 
    edges: FlowEdge[], 
    setNodes: any, 
    addLog: any,
    onFileGenerated?: (file: GeneratedFile) => void
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.setNodes = setNodes;
    this.addLog = addLog;
    this.onFileGenerated = onFileGenerated;
  }

  private updateNodeStatus(nodeId: string, status: NodeStatus) {
    this.setNodes((nds: FlowNode[]) => 
      nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status } } : n)
    );
  }

  private async fetchWithRetry(url: string, options: any, nodeId: string, label: string): Promise<any> {
    let attempts = 0;
    const totalKeys = JSON.parse(keyManager.getStatus()).total;
    const maxRetries = totalKeys > 0 ? totalKeys + 1 : 3;

    while (attempts < maxRetries) {
        const activeKey = keyManager.getActiveKey();
        let finalUrl = url;

        if (url.includes('googleapis.com')) {
            if (!activeKey) {
                throw new Error("❌ Erro: Nenhuma Chave API configurada para acessar o Google Gemini. Por favor, adicione uma chave válida nas configurações (ícone de engrenagem).");
            }
            try {
                const urlObj = new URL(url);
                urlObj.searchParams.set('key', activeKey);
                finalUrl = urlObj.toString();
            } catch (e) {
                // Se não for uma URL válida (ex: mock), ignora
            }
        }

        try {
            const response = await fetch(finalUrl, options);
            const status = response.status;
            const contentType = response.headers.get('content-type') || '';

            let responseData;
            if (contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            if (response.ok) {
                return responseData;
            }

            // TRATAMENTO DE ERROS DE CHAVE (Google APIs)
            if (url.includes('googleapis.com') && (status === 403 || status === 400 || status === 429)) {
                const errorText = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
                const isInvalidKey = errorText.toLowerCase().includes('key not valid') || errorText.toLowerCase().includes('invalid api key');
                const isLeaked = errorText.toLowerCase().includes('leaked');
                
                let logMsg = `🔄 Chave #${keyManager.getCurrentIndex() + 1} falhou (${status}). Rotacionando...`;
                
                if (isLeaked) {
                    logMsg = `🚫 Chave #${keyManager.getCurrentIndex() + 1} identificada como VAZADA. Removendo do pool...`;
                } else if (isInvalidKey) {
                    logMsg = `🚫 Chave #${keyManager.getCurrentIndex() + 1} identificada como INVÁLIDA. Removendo do pool...`;
                }

                console.warn(`[FlowEngine] ${logMsg}`, errorText.substring(0, 100));
                
                if (keyManager.markCurrentKeyAsFailed()) {
                    this.addLog(createLog(nodeId, label, 'WARN', logMsg));
                    attempts++;
                    await wait(200);
                    continue; 
                }
            }

            const errorDetail = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
            throw new Error(`Erro API (${status}): ${errorDetail.substring(0, 300)}`);

        } catch (err: any) {
            if (attempts >= maxRetries - 1) throw err;
            attempts++;
            await wait(500);
        }
    }
  }

  private getValueFromPath(path: string): any {
      const parts = path.split('.');
      let current: any = this.context;
      
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else if (typeof current === 'string' && part === 'text') {
          current = current;
        } else {
          if (parts[0] !== 'input' && parts[0] !== 'webhook_data' && this.context['input']) {
              let fallback = this.context['input'];
              for (const p of parts) {
                  if (fallback && typeof fallback === 'object' && p in fallback) {
                      fallback = fallback[p];
                  } else if (typeof fallback === 'string' && p === 'text') {
                      fallback = fallback;
                  } else {
                      fallback = undefined;
                      break;
                  }
              }
              if (fallback !== undefined) return fallback;
          }
          return undefined; 
        }
      }
      return current;
  }

  private resolveVariables(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    // Suporta {{input.path.to.key}}, {{webhook_data.path}}, etc. com espaços e hífens
    return text.replace(/{{[\s]*([\w\.\-]+)[\s]*}}/g, (match, path) => {
      const val = this.getValueFromPath(path);
      if (val === undefined) return match;
      
      if (typeof val === 'object') {
          return JSON.stringify(val);
      }
      
      const strVal = String(val);
      
      // Verifica se a string original tem aspas antes ou depois do match
      // Se tiver, significa que estamos substituindo dentro de uma string JSON
      // e precisamos escapar as aspas e quebras de linha.
      const index = text.indexOf(match);
      if (index > 0 && text[index - 1] === '"') {
          // Usa JSON.stringify para escapar corretamente e depois remove as aspas do início e fim
          const escaped = JSON.stringify(strVal);
          return escaped.substring(1, escaped.length - 1);
      }
      
      return strVal;
    });
  }

  private resolveVariablesInObject(obj: any): any {
    if (typeof obj === 'string') {
      // Se for EXATAMENTE uma variável, retorna o valor original (mantém tipos e evita quebrar JSON com quebras de linha)
      const exactMatch = obj.match(/^{{[\s]*([\w\.\-]+)[\s]*}}$/);
      if (exactMatch) {
        const path = exactMatch[1];
        const val = this.getValueFromPath(path);
        return val !== undefined ? val : obj;
      }
      
      // Se não for um match exato, pode ter múltiplas variáveis ou texto misturado
      // Não usamos this.resolveVariables aqui porque ele tenta escapar aspas duplas
      // o que não é necessário quando estamos construindo um objeto que será stringificado depois.
      return obj.replace(/{{[\s]*([\w\.\-]+)[\s]*}}/g, (match, path) => {
        const val = this.getValueFromPath(path);
        if (val === undefined) return match;
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      });
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.resolveVariablesInObject(item));
    } else if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      for (const key in obj) {
        newObj[key] = this.resolveVariablesInObject(obj[key]);
      }
      return newObj;
    }
    return obj;
  }

  private async executeNode(node: FlowNode): Promise<boolean> {
    let { type, config, label } = node.data;
    if (!type && node.type) type = node.type as NodeType;
    if (!label) label = type || 'Node';

    this.updateNodeStatus(node.id, NodeStatus.RUNNING);

    try {
        await wait(100);

        switch (type) {
          case NodeType.START:
              this.addLog(createLog(node.id, label, 'SUCCESS', `🟢 Execução iniciada.`));
              break;

          case NodeType.HTTP_REQUEST:
            let url = config?.url;
            if (!url) throw new Error("URL não definida no nó.");

            // Resolve variáveis na URL
            url = this.resolveVariables(url);

            const method = (config?.method || 'GET').toUpperCase();
            let body = config?.body;

            // Resolve variáveis no corpo (seja string ou objeto)
            if (body) {
                if (typeof body === 'string') {
                    // Se o body é uma string (ex: JSON digitado manualmente), precisamos resolver as variáveis
                    // Mas se tivermos HTML ou aspas duplas dentro das variáveis, um simples replace quebra o JSON.
                    // A melhor forma é tentar fazer o parse primeiro, resolver como objeto e depois voltar para string.
                    try {
                        const parsedBody = JSON.parse(body);
                        body = JSON.stringify(this.resolveVariablesInObject(parsedBody));
                    } catch (e) {
                        // Se não for um JSON válido, resolve como string normal
                        body = this.resolveVariables(body);
                    }
                } else if (typeof body === 'object') {
                    body = this.resolveVariablesInObject(body);
                }
            }

            // Intercept direct HTTP requests to Gemini API and route through SDK
            if (url.includes('generativelanguage.googleapis.com')) {
                this.addLog(createLog(node.id, label, 'WARN', `⚠️ Requisição HTTP direta para Gemini detectada. Redirecionando para o motor nativo de IA para evitar erros 400.`));
                
                let prompt = "Olá";
                if (typeof body === 'object' && body?.contents?.[0]?.parts?.[0]?.text) {
                    prompt = body.contents[0].parts[0].text;
                } else if (typeof body === 'string') {
                    try {
                        const parsed = JSON.parse(body);
                        if (parsed?.contents?.[0]?.parts?.[0]?.text) {
                            prompt = parsed.contents[0].parts[0].text;
                        }
                    } catch (e) {}
                }

                const maxTokens = (typeof body === 'object' && body?.generationConfig?.maxOutputTokens) || 8192;
                const temperature = (typeof body === 'object' && body?.generationConfig?.temperature) || 0.7;

                let aiText = "Sem resposta.";
                let geminiSuccess = false;
                let geminiAttempts = 0;
                const totalGeminiKeys = JSON.parse(keyManager.getStatus()).total;
                const maxGeminiRetries = totalGeminiKeys > 0 ? totalGeminiKeys + 1 : 3;

                while (geminiAttempts < maxGeminiRetries && !geminiSuccess) {
                    const activeKey = keyManager.getActiveKey();
                    if (!activeKey) {
                        throw new Error("Nenhuma chave Gemini API encontrada. Configure nas opções.");
                    }

                    try {
                        const ai = new GoogleGenAI({ apiKey: activeKey });
                        const response = await ai.models.generateContent({
                            model: "gemini-3-flash-preview",
                            contents: [{ parts: [{ text: prompt }] }],
                            config: {
                                maxOutputTokens: maxTokens,
                                temperature: temperature
                            }
                        });

                        aiText = response.text || "Sem resposta.";
                        geminiSuccess = true;
                    } catch (err: any) {
                        const errorText = err.message || String(err);
                        
                        if (errorText.includes('not found') || errorText.includes('503') || errorText.includes('404')) {
                            try {
                                this.addLog(createLog(node.id, label, 'WARN', `⚠️ gemini-3 falhou. Tentando gemini-2.0-flash como fallback...`));
                                const ai = new GoogleGenAI({ apiKey: activeKey });
                                const response = await ai.models.generateContent({
                                    model: "gemini-2.0-flash",
                                    contents: [{ parts: [{ text: prompt }] }],
                                    config: {
                                        maxOutputTokens: maxTokens,
                                        temperature: temperature
                                    }
                                });
                                aiText = response.text || "Sem resposta.";
                                geminiSuccess = true;
                                break;
                            } catch (fallbackErr: any) {}
                        }

                        if (errorText.includes('key not valid') || errorText.includes('403') || errorText.includes('429')) {
                            let logMsg = `🔄 Chave #${keyManager.getCurrentIndex() + 1} falhou. Rotacionando...`;
                            if (keyManager.markCurrentKeyAsFailed()) {
                                this.addLog(createLog(node.id, label, 'WARN', logMsg));
                                geminiAttempts++;
                                await wait(200);
                                continue;
                            }
                        }
                        throw err;
                    }
                }

                this.context[node.id] = aiText;
                this.context['input'] = aiText;
                
                const aiPreview = aiText.substring(0, 100);
                this.addLog(createLog(node.id, label, 'SUCCESS', `✅ IA respondeu (via interceptação): ${aiPreview}${aiPreview.length >= 100 ? '...' : ''}`));
                break;
            }
            
            const headers: Record<string, string> = { 
                'Content-Type': 'application/json'
            };
            
            if (config?.headers) {
                Object.entries(config.headers).forEach(([key, value]) => {
                    headers[key] = this.resolveVariables(String(value));
                });
            }

            const logBody = method !== 'GET' && body ? (typeof body === 'object' ? JSON.stringify(body).substring(0, 200) : String(body).substring(0, 200)) : 'N/A';
            this.addLog(createLog(node.id, label, 'INFO', `🚀 Enviando ${method} para: ${url.substring(0, 60)}...`));
            if (method !== 'GET') {
                this.addLog(createLog(node.id, label, 'DEBUG', `Payload enviado: ${logBody}${logBody.length >= 200 ? '...' : ''}`));
            }

            const responseData = await this.fetchWithRetry(url, { 
                method, 
                headers, 
                body: method !== 'GET' ? (typeof body === 'object' ? JSON.stringify(body) : body) : undefined 
            }, node.id, label);
            
            this.context[node.id] = responseData;
            
            // Auto-extrai o texto da resposta do Gemini se for uma requisição HTTP direta para a API
            if (url.includes('generativelanguage.googleapis.com') && responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                this.context['input'] = responseData.candidates[0].content.parts[0].text;
            } else {
                this.context['input'] = responseData; 
            }
            
            const logPreview = typeof responseData === 'object' ? 'JSON Data' : String(responseData).substring(0, 100);
            this.addLog(createLog(node.id, label, 'SUCCESS', `📦 Resposta recebida (${method}): ${logPreview}${logPreview.length >= 100 ? '...' : ''}`));
            break;

          case NodeType.GEMINI:
            let prompt = config?.prompt || 'Olá, como posso ajudar?';
            prompt = this.resolveVariables(prompt);
            const maxTokens = config?.maxOutputTokens || 2048;
            const temperature = config?.temperature || 0.7;

            let aiText = "Sem resposta.";
            let geminiSuccess = false;
            let geminiAttempts = 0;
            const totalGeminiKeys = JSON.parse(keyManager.getStatus()).total;
            const maxGeminiRetries = totalGeminiKeys > 0 ? totalGeminiKeys + 1 : 3;

            this.addLog(createLog(node.id, label, 'INFO', `🤖 IA processando prompt (${prompt.substring(0, 40)}...)...`));

            while (geminiAttempts < maxGeminiRetries && !geminiSuccess) {
                const activeKey = keyManager.getActiveKey();
                if (!activeKey) {
                    throw new Error("Nenhuma chave Gemini API encontrada. Configure nas opções.");
                }

                try {
                    const ai = new GoogleGenAI({ apiKey: activeKey });
                    const response = await ai.models.generateContent({
                        model: "gemini-3-flash-preview",
                        contents: [{ parts: [{ text: prompt }] }],
                        config: {
                            maxOutputTokens: maxTokens,
                            temperature: temperature
                        }
                    });

                    aiText = response.text || "Sem resposta.";
                    geminiSuccess = true;
                } catch (err: any) {
                    const errorText = err.message || String(err);
                    
                    // Se o erro for de modelo não encontrado ou indisponível, tenta o 2.0-flash como fallback
                    if (errorText.includes('not found') || errorText.includes('503') || errorText.includes('404')) {
                        try {
                            this.addLog(createLog(node.id, label, 'WARN', `⚠️ gemini-3 falhou. Tentando gemini-2.0-flash como fallback...`));
                            const ai = new GoogleGenAI({ apiKey: activeKey });
                            const response = await ai.models.generateContent({
                                model: "gemini-2.0-flash",
                                contents: [{ parts: [{ text: prompt }] }],
                                config: {
                                    maxOutputTokens: maxTokens,
                                    temperature: temperature
                                }
                            });
                            aiText = response.text || "Sem resposta.";
                            geminiSuccess = true;
                            break;
                        } catch (fallbackErr: any) {
                            // Se o fallback também falhar, continua para a rotação de chaves
                        }
                    }

                    if (errorText.includes('key not valid') || errorText.includes('403') || errorText.includes('429')) {
                        let logMsg = `🔄 Chave #${keyManager.getCurrentIndex() + 1} falhou. Rotacionando...`;
                        if (keyManager.markCurrentKeyAsFailed()) {
                            this.addLog(createLog(node.id, label, 'WARN', logMsg));
                            geminiAttempts++;
                            await wait(200);
                            continue;
                        }
                    }
                    throw err;
                }
            }

            this.context[node.id] = aiText;
            this.context['input'] = aiText;
            
            const aiPreview = aiText.substring(0, 100);
            this.addLog(createLog(node.id, label, 'SUCCESS', `✅ IA respondeu: ${aiPreview}${aiPreview.length >= 100 ? '...' : ''}`));
            break;

          case NodeType.DELAY:
            const ms = config?.ms || 1000;
            this.addLog(createLog(node.id, label, 'INFO', `⏳ Aguardando ${ms}ms...`));
            await wait(ms);
            break;

          case NodeType.LOGGER:
            const logMsg = this.resolveVariables(config?.message || 'Log manual executado.');
            this.addLog(createLog(node.id, label, 'INFO', `📝 ${logMsg}`));
            break;

          case NodeType.DISCORD:
            const discordWebhook = this.resolveVariables(config?.webhookUrl || '');
            if (!discordWebhook) throw new Error("Webhook do Discord não configurado.");
            const discordContent = this.resolveVariables(config?.content || 'Mensagem do Flow Architect AI');
            
            await fetch(discordWebhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: discordContent })
            });
            this.addLog(createLog(node.id, label, 'SUCCESS', `💬 Mensagem enviada ao Discord.`));
            break;

          case NodeType.TELEGRAM:
            const botToken = this.resolveVariables(config?.botToken || '');
            const chatId = this.resolveVariables(config?.chatId || '');
            if (!botToken || !chatId) throw new Error("Token ou Chat ID do Telegram não configurado.");
            const telegramText = this.resolveVariables(config?.text || 'Mensagem do Flow Architect AI');
            
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: telegramText })
            });
            this.addLog(createLog(node.id, label, 'SUCCESS', `📱 Mensagem enviada ao Telegram.`));
            break;

          case NodeType.WEBHOOK:
            this.addLog(createLog(node.id, label, 'INFO', `🔗 Webhook recebido.`));
            // Injeta os dados do webhook no input para o próximo nó
            if (this.context['webhook_data']) {
                // Prioriza o body se existir e não for vazio, facilitando o acesso via {{input.campo}}
                const webhookData = this.context['webhook_data'];
                const dataToInject = (webhookData.body && typeof webhookData.body === 'object' && Object.keys(webhookData.body).length > 0)
                    ? webhookData.body
                    : webhookData;
                
                this.context['input'] = dataToInject;
                this.addLog(createLog(node.id, label, 'SUCCESS', `📥 Dados do webhook injetados no fluxo.`));
            }
            break;

          case NodeType.IF_CONDITION:
            const condition = config?.condition || 'true';
            const input = this.context['input'] || {};
            // Cria um sandbox simples para a condição
            const check = new Function('input', `try { return ${condition}; } catch(e) { return false; }`);
            const result = !!check(input);
            this.addLog(createLog(node.id, label, result ? 'SUCCESS' : 'WARN', `⚖️ Condição resultou em: ${result.toString().toUpperCase()}`));
            this.context[node.id] = result;
            break;

          case NodeType.FILE_SAVE:
            const fileName = config?.fileName || `output-${Date.now()}.txt`;
            let content = this.context['input'];
            
            // Se vier do Gemini, extrai o texto principal
            if (content?.candidates?.[0]?.content?.parts?.[0]?.text) {
                content = content.candidates[0].content.parts[0].text;
            }

            if (this.onFileGenerated && content) {
              this.onFileGenerated({
                  id: Math.random().toString(36).substring(2),
                  name: fileName,
                  content: typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content),
                  extension: config?.fileFormat || 'txt',
                  timestamp: Date.now(),
                  nodeId: node.id
              });
              this.addLog(createLog(node.id, label, 'SUCCESS', `💾 Arquivo gerado: ${fileName}`));
            }
            break;

          case NodeType.INDICATOR:
            const indicatorName = config?.name || 'Indicador Geral';
            const inputData = this.context['input'] || {};
            
            this.addLog(createLog(node.id, label, 'INFO', `📊 Processando indicador: ${indicatorName}...`));
            
            // Simula a geração de lotes baseados nos dados
            const batchId = `BATCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const batchData = {
                id: batchId,
                indicator: indicatorName,
                timestamp: new Date().toISOString(),
                summary: typeof inputData === 'string' ? inputData.substring(0, 50) : 'Dados estruturados processados',
                status: 'COMPLETED'
            };

            this.context[node.id] = batchData;
            this.context['input'] = batchData;
            this.addLog(createLog(node.id, label, 'SUCCESS', `✅ Lote gerado: ${batchId}`));
            break;
        }

        this.updateNodeStatus(node.id, NodeStatus.SUCCESS);
        return true;

    } catch (error: any) {
        this.updateNodeStatus(node.id, NodeStatus.ERROR);
        this.addLog(createLog(node.id, label, 'ERROR', `❌ Falha: ${error.message}`));
        return false;
    }
  }

  public async run() {
    // Não limpa o contexto se ele já tiver dados (ex: webhook_data injetado pelo servidor)
    if (!this.context || Object.keys(this.context).length === 0) {
        this.context = {}; 
    }
    const startNodes = this.nodes.filter(n => n.data.type === NodeType.START || n.data.type === NodeType.WEBHOOK);
    const queue: FlowNode[] = startNodes.length > 0 ? startNodes : [this.nodes[0]];

    while (queue.length > 0) {
      const currentNode = queue.shift();
      if (!currentNode) continue;

      const success = await this.executeNode(currentNode);
      if (success) {
        const nextNodes = this.edges
          .filter(e => e.source === currentNode.id)
          .map(e => this.nodes.find(n => n.id === e.target))
          .filter(Boolean) as FlowNode[];
        queue.push(...nextNodes);
      }
    }
    this.addLog(createLog('system', 'Engine', 'INFO', `🏁 Fluxo finalizado.`));
  }
}