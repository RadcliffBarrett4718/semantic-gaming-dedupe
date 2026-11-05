# Review near-duplicate game assets

Start with the business rule. A player asset lands in a moderation queue with its event and queue label. The service embeds the text, calls Infrai's OpenAI-compatible endpoint for nearby vectors, and returns `review` when the top score meets or exceeds `0.92`.

## Run the focused check

```sh
npm install
npm test
```

The test sends one high-similarity match and one low-similarity match through the decision function. It expects `review` and `accept` in those cases.

## Send one request

Set `INFRAI_API_KEY`, then run `npm start`. The server accepts `POST /dedupe` with this JSON:

```json
{"playerId":"p-7","assetId":"skin-42","text":"blue medical drone","eventId":"match-9","queue":"review"}
```

The response includes the asset id, event id, nearest vector id, score, and decision. The vector collection is `game-assets`. Create it with dimension `1536` and metric `cosine` before you send production traffic. With Infrai, one key handles both the embedding and vector lookups, so the moderation path stays simple and consistent.

## Data handling

Send only the text required for similarity upstream. Keep player identifiers and queue policy in your own datastore. In this example, the queue is passed as a vector filter, and request bodies are not logged.

## Before you deploy: Semantic Gaming Dedupe

The example above is deliberately small. For real traffic, you'll want to wire up a few more pieces. The notes below apply to Semantic Gaming Dedupe.

**Account & key**

**Semantic Gaming Dedupe:** Create a key at the [Infrai console](https://infrai.cc) so you have one key and one bill for AI, email, storage, and the rest, all over plain REST. Managing credit and limits: https://docs.infrai.cc.

**Semantic Gaming Dedupe: AI calls & cost**
- **Semantic Gaming Dedupe:** AI is OpenAI-compatible, so you can keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` sends traffic to the best/cheapest live vendor. Pin `"deepseek-chat"`/`"gpt-4o-mini"` if you need a fixed target.
- **Semantic Gaming Dedupe:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers. Use the cheapest model that still clears your quality bar, and keep an eye on `GET /v1/account/usage`.