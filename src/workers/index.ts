import express from "express";
import cors from "cors";
import { json } from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { schema } from "./schema";
import { createContext } from "./context";

const PORT = 4000;

async function main() {
  const app = express();
  app.use(cors());
  app.use(json());

  const server = new ApolloServer({ schema });
  await server.start();

  app.use("/graphql", expressMiddleware(server, { context: createContext }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.listen(PORT, () => {
    console.log(`🚀 GraphQL ready at http://localhost:${PORT}/graphql`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
