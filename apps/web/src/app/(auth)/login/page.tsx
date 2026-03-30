"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm p-8 rounded-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <h1 className="font-display text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Sign in to continue your Dutch journey
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
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
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
              style={{
                background: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder="••••••••"
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
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-sm text-center mt-4" style={{ color: "var(--muted)" }}>
          No account?{" "}
          <Link href="/signup" style={{ color: "var(--accent)" }} className="hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
