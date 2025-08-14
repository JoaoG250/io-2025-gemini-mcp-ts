import express, { Request, Response } from "express";
import cors from "cors";
import { json } from "body-parser";
import path from "path";
import dotenv from "dotenv";
import { MCPClient } from "./client";

const PORT = 8080;

async function main() {
  dotenv.config();

  const mcpClient = new MCPClient();
  await mcpClient.connect("http://localhost:8000/mcp");

  const app = express();
  app.use(cors());
  app.use(json());

  app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });

  app.post("/chat", async (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ detail: "Nenhum prompt recebido" });
    }

    try {
      const responseText = await mcpClient.processQuery(query);
      res.json({ response: responseText });
    } catch (err) {
      console.error(`Erro ao processar a consulta: ${err}`);
      res.status(500).json({ detail: "Erro ao processar a consulta." });
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });

  process.on("SIGINT", async () => {
    await mcpClient.disconnect();
    server.close(() => process.exit(0));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
