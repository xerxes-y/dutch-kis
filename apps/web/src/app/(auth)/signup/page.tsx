"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(
        data.error === "EMAIL_TAKEN"
          ? "This email is already registered"
          : "Something went wrong, please try again"
      );
      setLoading(false);
      return;
    }

    // Auto sign-in after registration
    await signIn("credentials", { email, password, redirect: false });
    router.push("/onboarding");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm p-8 rounded-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <h1 className="font-display text-2xl font-bold mb-1">Start learning Dutch</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Create your account — it takes 30 seconds
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{
                background: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{
                background: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{
                background: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-center mt-4" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }} className="hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
