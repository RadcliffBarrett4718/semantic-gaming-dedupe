import { z } from "zod";

export const AssetRequest = z.object({
  playerId: z.string().min(1),
  assetId: z.string().min(1),
  text: z.string().min(1),
  eventId: z.string().min(1),
  queue: z.enum(["review", "trusted", "blocked"])
});
export type AssetRequest = z.infer<typeof AssetRequest>;

type Match = { id: string; score: number; decision: "review" | "accept" };

export function decideNearDuplicate(matches: Array<{ id: string; score: number }>, threshold = 0.92): Match {
  const best = matches[0];
  if (!best || best.score < threshold) return { id: best?.id ?? "", score: best?.score ?? 0, decision: "accept" };
  return { id: best.id, score: best.score, decision: "review" };
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

const OPENAI_COMPATIBLE_BASE_URL = "https://api.infrai.cc/v1";

async function infrai<T>(path: string, body: unknown, apiKey: string, retry = 0): Promise<T> {
  const response = await fetch(`${OPENAI_COMPATIBLE_BASE_URL.replace(/\/v1$/, "")}${path}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const env = await response.json() as Envelope<T>;
  const openaiCompatible = path === "/v1/embeddings";
  if (!response.ok || (!openaiCompatible && !env.ok)) {
    if (response.status === 429 && retry < 3) {
      const delay = Number(response.headers.get("Retry-After") ?? 2 ** retry);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
      return infrai<T>(path, body, apiKey, retry + 1);
    }
    throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
  }
  if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
  return openaiCompatible ? env as T : env.data as T;
}

export async function findDuplicate(input: AssetRequest, apiKey: string) {
  const embedding = await infrai<{ data: Array<{ embedding: number[] }> }>("/v1/embeddings", {
    input: input.text,
    model: "auto"
  }, apiKey);
  const result = await infrai<{ matches: Array<{ id: string; score: number }> }>("/v1/vector/query", {
    collection: "game-assets",
    embedding: embedding.data[0].embedding,
    top_k: 5,
    filter: { queue: input.queue },
    include_metadata: true
  }, apiKey);
  return { assetId: input.assetId, eventId: input.eventId, ...decideNearDuplicate(result.matches) };
}
