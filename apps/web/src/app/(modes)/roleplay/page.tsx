"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SCENARIOS } from "@/app/api/ai/roleplay/route";

type ScenarioKey = keyof typeof SCENARIOS;
type Message = { role: "user" | "assistant"; content: string };

export default function RoleplayPage() {
  const router = useRouter();
  const [scenario, setScenario] = useState<ScenarioKey | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function startScenario(key: ScenarioKey) {
    setScenario(key);
    const sr = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "roleplay" }),
    });
    const sd = (await sd_json(sr)) as { sessionId: string };
    setSessionId(sd.sessionId);

    // First AI greeting
    await sendMessage([], key, sd.sessionId);
  }

  async function sd_json(r: Response) { return r.json(); }

  async function sendMessage(
    currentMessages: Message[],
    currentScenario: ScenarioKey,
    currentSessionId: string
  ) {
    setStreaming(true);
    const res = await fetch("/api/ai/roleplay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: currentScenario,
        messages: currentMessages,
        sessionId: currentSessionId,
      }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let assistantMsg = "";

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      assistantMsg += chunk;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
        return updated;
      });
    }
    setStreaming(false);
  }

  async function handleSend() {
    if (!input.trim() || !scenario || !sessionId || streaming) return;
    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await sendMessage(newMessages, scenario, sessionId);
  }

  async function handleFinish() {
    if (sessionId) {
      await fetch("/api/ai/roleplay", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    }
    setFinished(true);
  }

  if (finished) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🎭</div>
          <h2 className="font-display text-2xl font-bold mb-2">Conversation complete!</h2>
          <p className="mb-6" style={{ color: "var(--muted)" }}>Weakness map updated.</p>
          <button onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-lg font-semibold text-white" style={{ background: "var(--accent)" }}>
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!scenario) {
    return (
      <main className="min-h-dvh p-4 md:p-8 max-w-2xl mx-auto">
        <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">← Dashboard</button>
        <h1 className="font-display text-3xl font-bold mb-2">🎭 Roleplay</h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>Choose a scenario to practice</p>
        <div className="flex flex-col gap-3">
          {(Object.entries(SCENARIOS) as [ScenarioKey, typeof SCENARIOS[ScenarioKey]][]).map(([key, s]) => (
            <button key={key} onClick={() => startScenario(key)}
              className="p-5 rounded-xl border text-left transition-all hover:scale-[1.01] hover:border-orange-500"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <div className="font-bold">{s.label}</div>
              <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{s.description}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {s.vocabulary.slice(0, 4).map((v) => (
                  <span key={v} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--card-border)", color: "var(--muted)" }}>
                    {v}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  const s = SCENARIOS[scenario];
  return (
    <main className="min-h-dvh flex flex-col max-w-2xl mx-auto">
      <header className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
        <div>
          <h1 className="font-semibold">{s.label}</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Speak only Dutch</p>
        </div>
        <button onClick={handleFinish}
          className="px-4 py-2 rounded-lg border text-sm"
          style={{ borderColor: "var(--card-border)" }}>
          Finish
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: m.role === "user" ? "var(--accent)" : "var(--card)",
                color: m.role === "user" ? "white" : "var(--foreground)",
                borderBottomRightRadius: m.role === "user" ? 4 : undefined,
                borderBottomLeftRadius: m.role === "assistant" ? 4 : undefined,
              }}
            >
              {m.content}
              {i === messages.length - 1 && streaming && (
                <span className="animate-pulse">▋</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t flex gap-3"
        style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          placeholder="Typ hier in het Nederlands…"
          className="flex-1 px-4 py-2.5 rounded-xl border bg-transparent outline-none text-sm"
          style={{ borderColor: "var(--card-border)" }}
          disabled={streaming}
        />
        <button onClick={handleSend} disabled={streaming || !input.trim()}
          className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-40"
          style={{ background: "var(--accent)" }}>
          {streaming ? "…" : "Send"}
        </button>
      </div>
    </main>
  );
}
