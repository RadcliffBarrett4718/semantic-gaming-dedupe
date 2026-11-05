import { createServer } from "node:http";
import { AssetRequest, findDuplicate } from "./semantic_dedupe.js";

const apiKey = process.env.INFRAI_API_KEY;
const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/dedupe") { res.writeHead(404).end(); return; }
  if (!apiKey) { res.writeHead(500).end(JSON.stringify({ error: "INFRAI_API_KEY is required" })); return; }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const parsed = AssetRequest.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await findDuplicate(parsed, apiKey);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid request";
    res.writeHead(message.includes("required") ? 500 : 400, { "content-type": "application/json" }).end(JSON.stringify({ error: message }));
  }
});
server.listen(Number(process.env.PORT ?? 3000));
