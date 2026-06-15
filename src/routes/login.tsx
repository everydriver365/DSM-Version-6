import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — DSM by EveryDriver" },
      { name: "description", content: "Sign in to your DSM by EveryDriver account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate({ to: "/home", replace: true });
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0F2044] px-4"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <h1
        className="text-white text-[22px] font-semibold mb-4"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        DSM by EveryDriver
      </h1>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[360px] bg-white rounded-2xl p-6 flex flex-col gap-4"
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        {error && (
          <p className="text-[13px] text-[#CC2229]" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
