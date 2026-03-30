"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface DocItem { id: string; filename: string; status: string; wordCount: number | null; chunkCount: number; createdAt: string }

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const loadDocs = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = (await res.json()) as { documents: DocItem[] };
    setDocs(data.documents ?? []);
  }, []);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  async function handleUpload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    await fetch("/api/documents", { method: "POST", body: form });
    setUploading(false);
    void loadDocs();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleUpload(file);
  }

  const statusColor: Record<string, string> = {
    pending: "var(--warning)",
    indexing: "var(--accent)",
    ready: "var(--success)",
    error: "var(--error)",
  };

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-3xl mx-auto">
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">← Dashboard</button>
      <h1 className="font-display text-3xl font-bold mb-1">📄 Document Library</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Upload Dutch texts, grammar guides, or work emails — the AI teaches from your content
      </p>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="rounded-2xl border-2 border-dashed p-8 text-center mb-6 transition-all"
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--card-border)",
          background: dragOver ? "var(--accent-muted)" : "var(--card)",
        }}
      >
        {uploading ? (
          <div className="animate-pulse">Uploading…</div>
        ) : (
          <>
            <div className="text-3xl mb-3">📎</div>
            <p className="font-semibold mb-1">Drop files here or browse</p>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              PDF, DOCX, TXT, MD, PNG, JPG — max 50MB
            </p>
            <label className="cursor-pointer px-5 py-2.5 rounded-lg font-semibold text-white text-sm"
              style={{ background: "var(--accent)" }}>
              Choose File
              <input type="file" className="hidden"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }} />
            </label>
          </>
        )}
      </div>

      {/* Document list */}
      {docs.length > 0 && (
        <div className="flex flex-col gap-3">
          {docs.map((doc) => (
            <div key={doc.id}
              className="p-4 rounded-xl border flex items-center gap-4"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <div className="text-2xl">📄</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{doc.filename}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {doc.wordCount ? `${doc.wordCount} words` : ""}{" "}
                  {doc.chunkCount > 0 ? `• ${doc.chunkCount} chunks indexed` : ""}
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ color: statusColor[doc.status], background: "var(--card-border)" }}>
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {docs.length === 0 && !uploading && (
        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          No documents yet. Upload one to get started.
        </p>
      )}
    </main>
  );
}
