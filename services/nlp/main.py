"""
Dutch NLP Service
FastAPI + SpaCy nl_core_news_sm

Provides deterministic Dutch language analysis to the web app before
text is sent to Ollama. Pre-analyzing improves AI correction quality
significantly.

Endpoints:
  POST /analyze      — full Dutch text analysis (tokens, POS, deps, lemmas)
  POST /check-dehet  — predict de/het for a list of nouns
  POST /lemmatize    — lemmatize a list of Dutch words
  GET  /health       — health check
"""

from fastapi import FastAPI
from pydantic import BaseModel
import spacy

app = FastAPI(title="Dutch NLP Service", version="0.1.0")

nlp = spacy.load("nl_core_news_sm")


# ─── Models ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str

class DeHetRequest(BaseModel):
    nouns: list[str]

class LemmatizeRequest(BaseModel):
    words: list[str]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def token_to_dict(token) -> dict:
    return {
        "text": token.text,
        "lemma": token.lemma_,
        "pos": token.pos_,        # NOUN, VERB, ADJ, etc.
        "tag": token.tag_,        # detailed Dutch tag
        "dep": token.dep_,        # dependency relation
        "is_stop": token.is_stop,
        "morph": str(token.morph),
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "nl_core_news_sm"}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """
    Full Dutch text analysis.
    Returns tokens with POS tags, lemmas, dependency relations,
    and morphological features. Used by Free-Write and Roleplay modes
    to pre-analyze user text before sending to Ollama for mistake correction.
    """
    doc = nlp(req.text)
    return {
        "text": req.text,
        "tokens": [token_to_dict(t) for t in doc],
        "sentences": [
            {
                "text": sent.text,
                "start": sent.start,
                "end": sent.end,
            }
            for sent in doc.sents
        ],
        "entities": [
            {"text": ent.text, "label": ent.label_}
            for ent in doc.ents
        ],
    }


@app.post("/check-dehet")
def check_dehet(req: DeHetRequest):
    """
    Apply rule-based de/het prediction for a list of Dutch nouns.
    Rules cover ~50% of cases (diminutives always het, -heid/-ing/-schap always de, etc.).
    Returns: { word: "huis", prediction: "het", confidence: "rule-based" | "unknown" }
    """
    results = []
    for noun in req.nouns:
        doc = nlp(noun.lower())
        token = doc[0] if doc else None
        prediction = None
        confidence = "unknown"

        if token:
            morph = str(token.morph)
            # Diminutives are always het
            if noun.lower().endswith("je") or noun.lower().endswith("tje"):
                prediction = "het"
                confidence = "rule-based"
            # -heid, -schap, -ing, -nis, -iteit are always de
            elif any(noun.lower().endswith(s) for s in ["heid", "schap", "ing", "nis", "iteit", "tie", "sie"]):
                prediction = "de"
                confidence = "rule-based"
            # Infinitives used as nouns are always het
            elif "VerbForm=Inf" in morph:
                prediction = "het"
                confidence = "rule-based"
            else:
                confidence = "unknown"

        results.append({
            "word": noun,
            "prediction": prediction,
            "confidence": confidence,
        })
    return {"results": results}


@app.post("/lemmatize")
def lemmatize(req: LemmatizeRequest):
    """
    Lemmatize a list of Dutch words.
    Used by vocabulary extraction and SRS deck to normalize word forms.
    """
    results = []
    for word in req.words:
        doc = nlp(word)
        lemma = doc[0].lemma_ if doc else word
        pos = doc[0].pos_ if doc else "UNKNOWN"
        results.append({"word": word, "lemma": lemma, "pos": pos})
    return {"results": results}
