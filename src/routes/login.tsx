import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import dsmLogoAsset from "../assets/dsm-logo.png.asset.json";

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
  const [showPassword, setShowPassword] = useState(false);
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
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <img
          src={dsmLogoAsset.url}
          alt="DSM logo"
          className="h-[60px] w-auto mb-2"
        />
        <span className="text-[#9CA3AF] text-[14px]" style={{ fontFamily: "Poppins, sans-serif" }}>
          by EveryDriver
        </span>
      </div>

      {/* Card */}
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[360px] bg-white flex flex-col"
        style={{
          borderRadius: "20px",
          padding: "28px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <h2
          className="text-[20px] font-semibold text-[#0F2044] text-center"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Welcome back
        </h2>
        <p
          className="text-[13px] text-[#6B7280] text-center mb-6"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Sign in to your account
        </p>

        <div className="flex flex-col gap-4">
          <div className="w-full">
            <label
              htmlFor="login-email"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0F2044] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A52A0]"
              style={{
                fontFamily: "Poppins, sans-serif",
                border: "1.5px solid #CBD5E1",
              }}
            />
          </div>

          <div className="w-full relative">
            <label
              htmlFor="login-password"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Password
            </label>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              className="h-12 w-full rounded-lg px-3 pr-10 text-[14px] text-[#0F2044] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A52A0]"
              style={{
                fontFamily: "Poppins, sans-serif",
                border: "1.5px solid #CBD5E1",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-9 text-[#6B7280] hover:text-[#1A1A2E]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Button
            type="submit"
            disabled={loading}
            className="h-12 text-[14px]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </div>

        {error && (
          <p
            className="text-[13px] text-[#CC2229] text-center mt-3"
            role="alert"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {error}
          </p>
        )}
      </form>

      {/* Footer */}
      <p
        className="text-[#6B7280] text-[11px] text-center mt-8"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        DSM by EveryDriver &copy; 2026
      </p>
    </div>
  );
}
