import { NodeType, NodeStatus } from './types';

export const APP_NAME = "Flow Architect AI";
export const CREATOR_CREDIT = "Criado por João Layon";

// --- FLUXO INICIAL (DEMO REAL) ---
export const INITIAL_NODES = [
  {
    id: 'start-1',
    type: 'custom',
    position: { x: 50, y: 50 },
    data: { 
      label: 'Início Manual', 
      type: NodeType.START, 
      status: NodeStatus.IDLE,
      config: {} 
    },
  },
  {
    id: 'req-1',
    type: 'custom',
    position: { x: 50, y: 200 },
    data: { 
      label: 'Buscar Cotação USD', 
      type: NodeType.HTTP_REQUEST, 
      status: NodeStatus.IDLE,
      config: {
        method: 'GET',
        url: 'https://economia.awesomeapi.com.br/last/USD-BRL'
      } 
    },
  },
  {
    id: 'if-1',
    type: 'custom',
    position: { x: 50, y: 400 },
    data: { 
      label: 'Checar: Dólar > 1?', 
      type: NodeType.IF_CONDITION, 
      status: NodeStatus.IDLE,
      config: {
        // A engine agora suporta 'input' ou 'data'
        condition: 'parseFloat(input.USDBRL.bid) > 1.0'
      } 
    },
  },
  {
    id: 'save-1',
    type: 'custom',
    position: { x: 50, y: 550 },
    data: { 
      label: 'Salvar Resultado', 
      type: NodeType.FILE_SAVE, 
      status: NodeStatus.IDLE,
      config: {
        fileName: 'cotacao_dolar.json',
        fileFormat: 'json'
      } 
    },
  }
];

export const INITIAL_EDGES = [
  { id: 'e1-2', source: 'start-1', target: 'req-1', animated: true, style: { stroke: '#63b3ed' } },
  { id: 'e2-3', source: 'req-1', target: 'if-1', animated: true, style: { stroke: '#63b3ed' } },
  { id: 'e3-4', source: 'if-1', target: 'save-1', animated: true, style: { stroke: '#63b3ed' } }
];

export const SYSTEM_PROMPT = `
Você é o **Flow Architect AI**, um arquiteto de software sênior especializado em n8n e React Flow.

### OBJETIVO
Converter a solicitação do usuário em um JSON de fluxo de automação funcional.
Você DEVE retornar APENAS O JSON. Não explique nada.

### SCHEMA OBRIGATÓRIO
Use exatamente esta estrutura:
{
  "nodes": [
    { 
      "id": "node-unique-id", 
      "type": "httpRequest" | "ifCondition" | "fileSave" | "delay" | "start" | "gemini" | "discord" | "telegram" | "logger", 
      "position": { "x": 0, "y": 0 },
      "data": { 
         "label": "Nome Descritivo", 
         "type": "httpRequest" | "gemini" | "ifCondition" | "fileSave" | "delay" | "start" | "discord" | "telegram" | "logger", 
         "status": "IDLE",
         "config": {} 
      } 
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2" }
  ]
}

### CONFIGURAÇÕES DOS NODES (Config Object)

1. **httpRequest**:
   - url: string (Ex: "https://api.coincap.io/v2/assets/bitcoin")
   - method: "GET" | "POST"
   - body: object (se POST)
   - headers: object (se necessário)
   - **DICA**: Para cotações de moedas (BRL), use "https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL"

2. **gemini**:
   - prompt: string (O comando para a IA. Ex: "Resuma este texto: {{input}}")
   - Use {{input}} para injetar dados do node anterior no prompt.

3. **ifCondition**:
   - condition: string (Javascript Puro). 
     - Use 'input' para acessar os dados do node anterior.
     - Ex: "input.data.price > 50000" ou "input.USDBRL.bid > 5"

4. **fileSave**:
   - fileName: string (Ex: "index.html")
   - fileFormat: "txt" | "json" | "csv" | "html"
   - **DICA**: Se o usuário pedir um arquivo HTML (Landing Page), use um node 'gemini' ANTES para gerar o código HTML completo e responsivo.

5. **indicator**:
   - name: string (Nome do indicador/lote. Ex: "Relatório de Vendas")
   - **DICA**: Use para organizar dados em lotes processáveis.

6. **delay**:
   - ms: number (Tempo em milissegundos. Ex: 2000)

7. **discord**:
   - webhookUrl: string
   - content: string

8. **telegram**:
   - botToken: string
   - chatId: string
   - text: string

9. **logger**:
   - message: string

### REGRAS IMPORTANTES
1. Sempre comece com um node 'start'.
2. Conecte todos os nodes logicamente (edges).
3. Posicione os nodes verticalmente (y + 150px a cada passo).
4. Para usar IA/Gemini no fluxo, NUNCA use o node 'httpRequest' para chamar a API do Gemini diretamente. Use SEMPRE o node 'gemini'.
5. Se o usuário pedir para "Gerar Landing Page", crie um fluxo: Start -> Gemini (Gera HTML) -> FileSave (Salva index.html).
`;