"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const SOUNDS = [
  { sound: "g", words: ["gaan", "goed", "groot", "groen", "geld"], ipa: "/ɣ/", tip: "Produced at the back of the throat — like clearing your throat gently. Unique to Dutch!" },
  { sound: "ui", words: ["huis", "buiten", "ruit", "lui", "duim"], ipa: "/œy/", tip: "Start with rounded lips like 'oo', then move your tongue to 'ee' position. Unrounded at the end." },
  { sound: "ij/ei", words: ["zijn", "rijden", "tijd", "bij", "klein"], ipa: "/ɛi/", tip: "Similar to English 'day' but slightly higher. Lips relaxed, not rounded." },
  { sound: "sch", words: ["school", "schrijven", "schip", "schoon", "beschrijven"], ipa: "/sx/", tip: "The Dutch 'sch' = s + the Dutch g sound. Start with 's', then add the back-throat g." },
  { sound: "aa", words: ["naam", "staat", "praten", "haar", "kaas"], ipa: "/aː/", tip: "Long open 'ah' sound — mouth wide open, held longer than English 'a'." },
];

interface SoundGroup { sound: string; words: string[]; ipa: string; tip: string }

export default function PhoneticPage() {
  const router = useRouter();
  const [soundIdx, setSoundIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const group = SOUNDS[soundIdx] as SoundGroup;
  const word = group.words[wordIdx] as string;

  async function playReference() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_TTS_URL ?? "http://localhost:5002"}/api/tts?text=${encodeURIComponent(word)}&speaker_id=&style_wav=`,
      { method: "GET" }
    ).catch(() => null);

    if (res?.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) audioRef.current.src = url;
      await audioRef.current?.play().catch(() => {});
    } else {
      // Fallback: use browser speech synthesis
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = "nl-NL";
      window.speechSynthesis.speak(utter);
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) audioRef.current.src = url;
      setRecorded(true);
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-2xl mx-auto">
      <audio ref={audioRef} className="hidden" />
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">← Dashboard</button>
      <h1 className="font-display text-3xl font-bold mb-1">🔊 Phonetic Studio</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Master the sounds that make Dutch unique</p>

      {/* Sound selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {SOUNDS.map((s, i) => (
          <button key={s.sound} onClick={() => { setSoundIdx(i); setWordIdx(0); setRecorded(false); }}
            className="px-4 py-2 rounded-full border font-mono font-bold transition-all"
            style={{
              borderColor: soundIdx === i ? "var(--accent)" : "var(--card-border)",
              color: soundIdx === i ? "var(--accent)" : "var(--foreground)",
              background: soundIdx === i ? "var(--accent-muted)" : "transparent",
            }}>
            {s.sound}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border p-6 mb-4"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-3xl font-bold" style={{ color: "var(--accent)" }}>
            {group.ipa}
          </span>
          <div>
            <div className="font-semibold">The &quot;{group.sound}&quot; sound</div>
          </div>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{group.tip}</p>

        {/* Word */}
        <div className="text-center py-6">
          <p className="font-display text-5xl font-bold mb-2">{word}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {wordIdx + 1} / {group.words.length}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button onClick={playReference}
            className="flex-1 py-3 rounded-xl border font-semibold text-sm"
            style={{ borderColor: "var(--card-border)" }}>
            🔊 Hear It
          </button>
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ background: recording ? "var(--error)" : "var(--accent)" }}>
            {recording ? "🔴 Recording…" : "🎤 Hold to Record"}
          </button>
        </div>

        {recorded && (
          <div className="mt-4 flex gap-3">
            <button onClick={() => audioRef.current?.play()}
              className="flex-1 py-2 rounded-xl border text-sm"
              style={{ borderColor: "var(--card-border)" }}>
              ▶ Play My Recording
            </button>
            <button onClick={playReference}
              className="flex-1 py-2 rounded-xl border text-sm"
              style={{ borderColor: "var(--card-border)" }}>
              🔊 Play Reference
            </button>
          </div>
        )}
      </div>

      {/* Word navigation */}
      <div className="flex gap-3">
        <button onClick={() => { setWordIdx((i) => Math.max(0, i - 1)); setRecorded(false); }}
          disabled={wordIdx === 0}
          className="flex-1 py-2.5 rounded-xl border text-sm disabled:opacity-40"
          style={{ borderColor: "var(--card-border)" }}>
          ← Previous Word
        </button>
        <button onClick={() => { setWordIdx((i) => Math.min(group.words.length - 1, i + 1)); setRecorded(false); }}
          disabled={wordIdx >= group.words.length - 1}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}>
          Next Word →
        </button>
      </div>
    </main>
  );
}
