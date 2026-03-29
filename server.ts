import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { FlowEngine } from "./services/flowEngine";
import { FlowNode, FlowEdge, LogEntry, GeneratedFile, NodeType } from "./types";
import { keyManager } from "./services/keyManager";

const FLOWS_FILE = path.join(process.cwd(), "flows.json");
const HISTORY_FILE = path.join(process.cwd(), "execution_history.json");
const CONFIG_FILE = path.join(process.cwd(), "config.json");

// Helper para carregar configurações
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Erro ao carregar config:", e);
  }
  return {};
}

// Helper para salvar configurações
function saveConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error("Erro ao salvar config:", e);
  }
}

// Inicializa a chave de API no backend se existir
const initialConfig = loadConfig();
if (initialConfig.apiKey) {
  process.env.API_KEY = initialConfig.apiKey;
  // Garante que o keyManager carregue a chave do config.json no startup
  keyManager.setCustomKey(initialConfig.apiKey);
}

// Helper para salvar histórico
const saveToHistory = (entry: any) => {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, "utf-8");
      history = JSON.parse(content);
    }
    history.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 10),
      timestamp: new Date().toISOString(),
      ...entry
    });
    // Mantém apenas as últimas 50 execuções
    if (history.length > 50) history = history.slice(0, 50);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error("Erro ao salvar histórico:", err);
  }
};

// Helper to load flows from server-side storage
function loadFlows(): Record<string, { nodes: FlowNode[], edges: FlowEdge[] }> {
  try {
    if (fs.existsSync(FLOWS_FILE)) {
      const data = fs.readFileSync(FLOWS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Erro ao carregar fluxos do servidor:", e);
  }
  return {};
}

// Helper to save flows to server-side storage
function saveFlows(flows: Record<string, { nodes: FlowNode[], edges: FlowEdge[] }>) {
  try {
    fs.writeFileSync(FLOWS_FILE, JSON.stringify(flows, null, 2));
  } catch (e) {
    console.error("Erro ao salvar fluxos no servidor:", e);
  }
}

// Função comum para execução de fluxos
async function executeFlow(nodes: FlowNode[], edges: FlowEdge[], initialContext: any = {}, flowId?: string) {
  const logs: LogEntry[] = [];
  const files: GeneratedFile[] = [];
  let currentNodes = [...nodes];

  // Callbacks simulados para o FlowEngine no backend
  const setNodes = (updateFn: any) => {
    if (typeof updateFn === 'function') {
      currentNodes = updateFn(currentNodes);
    } else {
      currentNodes = updateFn;
    }
  };

  const addLog = (log: LogEntry) => {
    logs.push(log);
    console.log(`[FlowEngine] [${log.level}] ${log.message}`);
  };

  const onFileGenerated = (file: GeneratedFile) => {
    files.push(file);
    console.log(`[FlowEngine] 💾 Arquivo gerado: ${file.name}`);
  };

  const engine = new FlowEngine(
    currentNodes,
    edges,
    setNodes,
    addLog,
    onFileGenerated
  );

  // Injeta os dados da requisição no contexto inicial
  engine.context['webhook_data'] = initialContext;

  // Executa o fluxo
  await engine.run();

  const result = {
    success: true,
    flowId,
    timestamp: new Date().toISOString(),
    webhook_received: initialContext,
    logs,
    files,
    finalNodesState: currentNodes
  };

  saveToHistory(result);
  return result;
}

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Endpoint para ver o histórico de execuções
  app.get("/api/history", (req, res) => {
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, "utf-8");
      res.json(JSON.parse(content));
    } else {
      res.json([]);
    }
  });

  // Endpoint para salvar um fluxo no servidor e obter um Webhook ID
  app.post("/api/save-flow", (req, res) => {
    try {
      const { id, nodes, edges } = req.body;
      if (!id || !nodes || !edges) {
        return res.status(400).json({ error: "ID, nodes e edges são obrigatórios." });
      }

      const flows = loadFlows();
      flows[id] = { nodes, edges };
      saveFlows(flows);

      res.json({ success: true, message: "Fluxo salvo no servidor.", webhookUrl: `/api/trigger/${id}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint para salvar a API Key no backend
  app.post("/api/settings/api-key", (req, res) => {
    try {
      const { apiKey } = req.body;
      if (typeof apiKey !== 'string') {
        return res.status(400).json({ error: "API Key inválida." });
      }

      const config = loadConfig();
      config.apiKey = apiKey;
      saveConfig(config);

      // Atualiza o ambiente do backend
      process.env.API_KEY = apiKey;
      
      // Notifica o keyManager para recarregar as chaves
      keyManager.setCustomKey(apiKey);

      res.json({ success: true, message: "API Key salva no servidor." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint de Gatilho (Webhook) - Executa um fluxo salvo via GET ou POST
  app.all("/api/trigger/:flowId", async (req, res) => {
    const { flowId } = req.params;
    console.log(`[Webhook] Recebido gatilho para o fluxo: ${flowId}`);
    
    try {
      const flows = loadFlows();
      let flow = flows[flowId];

      // Se o payload contiver nodes e edges, assume que é um fluxo dinâmico/atualizado
      const hasDynamicFlow = req.body && Array.isArray(req.body.nodes) && Array.isArray(req.body.edges);
      
      if (hasDynamicFlow) {
          console.log(`[Webhook] Payload contém nodes e edges. Atualizando e executando fluxo dinâmico.`);
          flow = { nodes: req.body.nodes, edges: req.body.edges };
          // Atualiza o fluxo salvo com a nova estrutura
          flows[flowId] = flow;
          saveFlows(flows);
      }

      if (!flow) {
        console.error(`[Webhook] Fluxo ${flowId} não encontrado.`);
        return res.status(404).json({ error: "Fluxo não encontrado no servidor." });
      }

      const webhookData = { 
          query: req.query, 
          // Se enviou o fluxo no body, os dados reais devem estar em req.body.data
          body: hasDynamicFlow ? (req.body.data || {}) : req.body,
          headers: req.headers,
          method: req.method
      };

      const result = await executeFlow(flow.nodes, flow.edges, webhookData, flowId);
      res.json(result);

    } catch (error: any) {
      console.error("Erro no gatilho do fluxo:", error);
      const errorResult = {
        success: false,
        flowId,
        error: error.message,
        timestamp: new Date().toISOString(),
        logs: [],
        files: []
      };
      saveToHistory(errorResult);
      res.status(500).json(errorResult);
    }
  });

  // API Endpoint para executar o fluxo via POST direto (sem salvar)
  app.post("/api/execute-flow", async (req, res) => {
    try {
      const { nodes, edges, data } = req.body;

      if (!nodes || !Array.isArray(nodes)) {
        return res.status(400).json({ error: "O corpo da requisição deve conter um array 'nodes'." });
      }

      if (!edges || !Array.isArray(edges)) {
        return res.status(400).json({ error: "O corpo da requisição deve conter um array 'edges'." });
      }

      const result = await executeFlow(nodes, edges, data || {});
      res.json(result);

    } catch (error: any) {
      console.error("Erro na execução do fluxo via API:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erro interno na execução do fluxo."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
