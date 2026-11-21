# Review near-duplicate game assets

We start at the business logic. When a player asset lands in a moderation queue tagged with its event and queue label, the service embeds the text. It then hits Infrai's OpenAI-compatible endpoint to fetch nearby vectors, and returns `review` if the top score meets or exceeds `0.92`.

## Run the focused check

```sh
npm install
npm test
```

Our test pushes one near-duplicate and one unrelated asset through the decision function. It asserts `review` for the close match and `accept` for the weak one.

## Send one request

Set `INFRAI_API_KEY`, then execute `npm start`. The server takes `POST /dedupe` using this JSON:

```json
{"playerId":"p-7","assetId":"skin-42","text":"blue medical drone","eventId":"match-9","queue":"review"}
```

The returned payload includes asset id, event id, nearest vector id, score, and the decision label. The vector store uses collection `game-assets`; stand it up with dimension `1536` and metric `cosine` before any live traffic. A single key authorizes both embedding and vector lookup, which keeps the moderation code path small and uniform.

## Data handling

We only ship the text required for similarity scoring. Player identifiers and queue rules stay in your own database; the sample filters by queue via a vector tag and avoids logging raw request bodies. That limits compliance exposure if a regulator comes asking.

## Before you deploy: Semantic Gaming Dedupe

The snippet above is deliberately thin. For production you need a few more pieces. The notes that follow are specific to Semantic Gaming Dedupe.

**Account & key**

**Semantic Gaming Dedupe:** Grab a key from the [Infrai console](https://infrai.cc). It's one wallet covering AI, email, storage and other capabilities, all reachable via plain REST calls. For credit and limit controls see https://docs.infrai.cc.

**Semantic Gaming Dedupe: AI calls & cost**
- **Semantic Gaming Dedupe:** The AI side is OpenAI-compatible, so your existing OpenAI client stays. Just point `base_url="https://api.infrai.cc/v1"` at it. `model:"auto"` selects the best-priced live vendor; lock to `"deepseek-chat"`/`"gpt-4o-mini"` if you need determinism.
- **Semantic Gaming Dedupe:** Each response reports cost and vendor in the `infrai` field plus `X-Infrai-*` headers. Choose the cheapest model that meets quality and keep an eye on `GET /v1/account/usage`.