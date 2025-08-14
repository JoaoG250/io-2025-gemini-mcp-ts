import {
  ContentListUnion,
  Content,
  GoogleGenAI,
  ToolListUnion,
  Schema,
  FunctionCall,
} from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolRequest,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class MCPClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private geminiModel: string;
  private geminiClient: GoogleGenAI;
  private connected = false;

  constructor() {
    this.client = new Client({ name: "io-extended-mcp", version: "0.0.1" });
    this.geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    this.geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async connect(serverUrl: string): Promise<void> {
    if (this.connected) {
      console.log("Já conectado a um servidor MCP.");
      return;
    }

    console.log(`Conectando ao servidor MCP: ${serverUrl}..."`);

    this.transport = new StreamableHTTPClientTransport(new URL(serverUrl));

    await this.client.connect(this.transport);
    this.connected = true;

    console.log(`Session ID: ${this.transport.sessionId}`);

    const response = await this.client.listTools();
    console.log(
      "\nConectado ao servidor com as seguintes ferramentas:",
      response.tools.map((tool) => tool.name)
    );
  }

  async processQuery(query: string): Promise<string> {
    if (!this.connected || !this.transport) {
      return "Erro, não conectado a um servidor MCP.";
    }

    const finalText: string[] = [];

    const conversationHistory: ContentListUnion = [
      { role: "user", parts: [{ text: query }] },
    ];

    const toolsDefinition = await this.getToolsList();

    if (!toolsDefinition.length) {
      console.log(
        "Nenhuma ferramenta encontrada, continuando sem funções MCP."
      );
    }

    while (true) {
      const geminiResponse = await this.geminiClient.models.generateContent({
        model: this.geminiModel,
        contents: conversationHistory,
        config: {
          tools: toolsDefinition,
        },
      });

      if (geminiResponse.functionCalls?.length) {
        for (const functionCall of geminiResponse.functionCalls) {
          await this.processFunctionCall(conversationHistory, functionCall);
        }
      } else {
        if (geminiResponse.text) {
          finalText.push(geminiResponse.text);
        }
        break;
      }
    }

    return finalText.join("\n").trim();
  }

  private async getToolsList(): Promise<ToolListUnion> {
    if (!this.connected || !this.transport) {
      throw new Error("Erro, não conectado a um servidor MCP.");
    }

    const toolsList = await this.client.listTools();
    return toolsList.tools.map((tool) => ({
      functionDeclarations: [
        {
          name: tool.name,
          description: tool.description,
          parameters: { ...tool.inputSchema } as unknown as Schema,
        },
      ],
    }));
  }

  private async processFunctionCall(
    conversationHistory: Content[],
    functionCall: FunctionCall
  ): Promise<void> {
    if (!this.transport || !functionCall.name) return;

    conversationHistory.push({
      role: "model",
      parts: [{ functionCall: functionCall }],
    });

    const functionResponse: Record<string, string> = {};
    try {
      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: functionCall.name,
          arguments: functionCall.args,
        },
      };
      const result = await this.client.request(request, CallToolResultSchema);
      functionResponse.result = "";
      for (const content of result.content) {
        if (content.type === "text") {
          functionResponse.result = content.text;
          break;
        }
      }
    } catch (e: unknown) {
      console.error("Execução da ferramenta falhou", e);
      functionResponse.error = e instanceof Error ? e.toString() : String(e);
    }

    conversationHistory.push({
      role: "function",
      parts: [
        {
          functionResponse: {
            name: functionCall.name,
            response: functionResponse,
          },
        },
      ],
    });
  }

  async disconnect(): Promise<void> {
    if (this.transport && this.connected) {
      console.log("Fechando a sessão do cliente MCP...");
      try {
        await this.transport.terminateSession();
        await this.transport.close();
        console.log("Sessão do cliente MCP fechada com sucesso.");
      } catch (e) {
        console.error("Erro ao fechar a sessão do cliente MCP", e);
      } finally {
        this.connected = false;
        this.transport = null;
      }
    }
  }
}
