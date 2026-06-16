import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff, ScanFace } from "lucide-react";
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

const REMEMBER_KEY = "dsm:rememberedEmail";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined" && window.PublicKeyCredential && navigator.credentials) {
      setWebauthnSupported(true);
    }
  }, []);

  function persistRemember(value: string, on: boolean) {
    try {
      if (on && value) localStorage.setItem(REMEMBER_KEY, value);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  }

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
    persistRemember(email, remember);
    navigate({ to: "/home", replace: true });
  }

  async function onBiometric() {
    setError(null);
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
        },
      });
      // Biometric is gesture-only here; surface a hint until a credential is enrolled.
      setError("No biometric credential enrolled yet. Sign in with your password first.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Biometric sign-in failed";
      setError(msg);
    }
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
        className="w-full max-w-[360px] bg-white flex flex-col mt-12"
        style={{
          borderRadius: "20px",
          padding: "32px",
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
          className="text-[13px] text-[#6B7280] text-center"
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

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px] text-[#6B7280] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => {
                  const on = e.target.checked;
                  setRemember(on);
                  persistRemember(email, on);
                }}
                className="h-4 w-4 rounded border-[#CBD5E1] accent-[#1A52A0]"
              />
              Remember me
            </label>
            <Link
              to="/forgotpassword"
              className="text-[13px] text-[#1A52A0] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 text-[14px]"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </div>

          {webauthnSupported && (
            <button
              type="button"
              onClick={onBiometric}
              className="h-12 w-full rounded-lg bg-white text-[#0F2044] text-[14px] flex items-center justify-center gap-2 hover:bg-[#F8FAFC]"
              style={{ border: "1.5px solid #E2E6ED", fontFamily: "Poppins, sans-serif" }}
            >
              <ScanFace size={20} />
              Sign in with Face ID / Touch ID
            </button>
          )}

          {webauthnSupported && (
            <Link
              to="/forgotpassword"
              className="text-[13px] text-[#1A52A0] hover:underline text-center"
            >
              Forgot password?
            </Link>
          )}

          {error && (
            <p
              className="text-[13px] text-[#CC2229] text-center"
              role="alert"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {error}
            </p>
          )}
        </div>
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
