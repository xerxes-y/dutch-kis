"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface VocabItem { word: string; translation: string; sentence: string }
interface StoryData {
  id: string; title: string; content: string;
  cefrLevel: string; knownPercent: number; vocabulary: VocabItem[];
}

export default function StoryPage() {
  const router = useRouter();
  const [domain, setDomain] = useState<string>("daily");
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState<VocabItem | null>(null);

  async function generate() {
    setLoading(true);
    setStory(null);
    const res = await fetch("/api/ai/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = (await res.json()) as StoryData;
    setStory(data);
    setLoading(false);
  }

  async function addToSRS(word: VocabItem) {
    await fetch("/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: word.word, lemma: word.word.toLowerCase(), translation: word.translation, domain }),
    });
  }

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-3xl mx-auto">
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">← Dashboard</button>
      <h1 className="font-display text-3xl font-bold mb-2">📖 Story Engine</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        AI generates a Dutch story seeded with your weak vocabulary
      </p>

      <div className="flex gap-3 flex-wrap mb-6">
        {["daily", "work", "family", "travel", "academic"].map((d) => (
          <button key={d} onClick={() => setDomain(d)}
            className="px-4 py-2 rounded-full text-sm border transition-all"
            style={{
              borderColor: domain === d ? "var(--accent)" : "var(--card-border)",
              color: domain === d ? "var(--accent)" : "var(--muted)",
              background: domain === d ? "var(--accent-muted)" : "transparent",
            }}>
            {d}
          </button>
        ))}
        <button onClick={generate} disabled={loading}
          className="px-5 py-2 rounded-full font-semibold text-sm text-white disabled:opacity-40 ml-auto"
          style={{ background: "var(--accent)" }}>
          {loading ? "Generating…" : "Generate Story →"}
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border p-8 text-center animate-pulse"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          Generating your Dutch story…
        </div>
      )}

      {story && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border p-6"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{story.title}</h2>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-full" style={{ background: "var(--card-border)" }}>
                  {story.cefrLevel}
                </span>
                <span className="px-2 py-1 rounded-full" style={{ background: "var(--card-border)" }}>
                  {Math.round(story.knownPercent)}% known
                </span>
              </div>
            </div>
            <p className="text-sm leading-loose">{story.content}</p>
          </div>

          {story.vocabulary.length > 0 && (
            <div className="rounded-2xl border p-6"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <h3 className="font-semibold mb-3">Vocabulary in this story</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {story.vocabulary.map((v) => (
                  <div key={v.word}
                    className="p-3 rounded-xl border cursor-pointer transition-all hover:border-orange-500"
                    style={{ background: "var(--background)", borderColor: selectedWord?.word === v.word ? "var(--accent)" : "var(--card-border)" }}
                    onClick={() => setSelectedWord(selectedWord?.word === v.word ? null : v)}>
                    <div className="font-semibold text-sm">{v.word}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{v.translation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedWord && (
            <div className="rounded-2xl border p-5"
              style={{ background: "var(--card)", borderColor: "var(--accent)", borderWidth: 2 }}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg">{selectedWord.word}</h4>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>{selectedWord.translation}</p>
                  {selectedWord.sentence && (
                    <p className="text-sm mt-2 italic">"{selectedWord.sentence}"</p>
                  )}
                </div>
                <button onClick={() => addToSRS(selectedWord)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: "var(--accent)" }}>
                  + Add to SRS
                </button>
              </div>
            </div>
          )}

          <button onClick={generate}
            className="py-3 rounded-xl border font-semibold text-sm"
            style={{ borderColor: "var(--card-border)" }}>
            Generate Another Story
          </button>
        </div>
      )}
    </main>
  );
}
