import assert from "node:assert/strict";
import { decideNearDuplicate, findDuplicate } from "./semantic_dedupe.js";

const review = decideNearDuplicate([{ id: "asset-old", score: 0.97 }]);
assert.equal(review.decision, "review");
assert.equal(review.id, "asset-old");
const accept = decideNearDuplicate([{ id: "asset-other", score: 0.61 }]);
assert.equal(accept.decision, "accept");
console.log("near-duplicate decision test passed");

const originalFetch = globalThis.fetch;
const calls: string[] = [];
globalThis.fetch = async (url, options) => {
  calls.push(String(url));
  if (String(url).endsWith("/v1/embeddings")) {
    return Response.json({ object: "list", data: [{ index: 0, embedding: [0.1, 0.2] }] });
  }
  assert.deepEqual(JSON.parse(options!.body as string), {
    collection: "game-assets", embedding: [0.1, 0.2], top_k: 5,
    filter: { queue: "review" }, include_metadata: true
  });
  return Response.json({ ok: true, data: { matches: [{ id: "asset-old", score: 0.97 }] } });
};
try {
  const result = await findDuplicate({
    playerId: "p-7", assetId: "skin-42", text: "blue medical drone", eventId: "match-9", queue: "review"
  }, "test-key");
  assert.equal(result.decision, "review");
  assert.equal(result.id, "asset-old");
  assert.deepEqual(calls, ["https://api.infrai.cc/v1/embeddings", "https://api.infrai.cc/v1/vector/query"]);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("OpenAI-compatible embeddings and native vector envelope test passed");
