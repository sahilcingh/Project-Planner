"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuroraHero } from "@/components/ui/aurora-hero";
import AnimatedButton from "@/components/ui/animated-button";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col">
      <AuroraHero title="Project Planner" className="h-[280px] min-h-[280px] sm:h-[320px]" />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-12">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {mode === "sign-in" ? "Sign in" : "Create an account"}
          </h1>
          <p className="text-sm text-gray-500">
            {mode === "sign-in"
              ? "Welcome back."
              : "Takes about 30 seconds, no card required."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              required
              className="rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              required
              minLength={6}
              className="rounded border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <AnimatedButton type="submit" disabled={loading} className="w-full">
            {loading
              ? "Working..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </AnimatedButton>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
          }}
          className="text-sm text-gray-500 underline"
        >
          {mode === "sign-in"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
