---
name: add-nlp-endpoint
description: Add a new endpoint to the Dutch SpaCy NLP service and wire it into the Next.js lib client. Use when the NLP service needs new Dutch language analysis capability (e.g. separable verb detection, verb conjugation check, sentence complexity scoring).
---

# Add an NLP Service Endpoint

## Step 1 — Add to `services/nlp/main.py`

```python
class MyRequest(BaseModel):
    text: str

class MyResponse(BaseModel):
    result: list[dict]

@app.post("/my-endpoint", response_model=MyResponse)
def my_endpoint(req: MyRequest):
    doc = nlp(req.text)
    result = []
    for token in doc:
        # your analysis here
        result.append({ "text": token.text, "feature": ... })
    return { "result": result }
```

## Step 2 — Test the endpoint locally

```bash
docker compose up nlp -d
curl -X POST http://localhost:8001/my-endpoint \
  -H "Content-Type: application/json" \
  -d '{"text": "Ik bel je morgen op"}'
```

## Step 3 — Add to the Next.js NLP client

File: `apps/web/src/lib/nlp.ts`

```ts
export async function myEndpoint(text: string): Promise<MyResult[]> {
  const res = await fetch(`${process.env.NLP_BASE_URL}/my-endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new AppError('NLP_SERVICE_ERROR', { status: res.status })
  const data = await res.json()
  return data.result
}
```

## Step 4 — Export the type

In `packages/types/src/index.ts`:
```ts
export type MyResult = { text: string; feature: string }
```

## Useful SpaCy Dutch patterns

```python
# Detect separable verb + prefix split
for token in doc:
    if token.dep_ == "svp":   # separable verb prefix
        verb = token.head
        print(f"Separable verb: {verb.lemma_}, prefix: {token.text}")

# Get sentence-level verb position (for V2 check)
for sent in doc.sents:
    verbs = [t for t in sent if t.pos_ in ("VERB", "AUX")]
    # V2: finite verb should be at position index 1 in main clause
```
