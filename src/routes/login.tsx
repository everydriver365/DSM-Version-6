import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { IconEye, IconEyeOff, IconShieldCheck } from "@tabler/icons-react";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import edpLogoAsset from "../assets/edp-signin-logo.png.asset.json";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — EveryDriver Pro" },
      { name: "description", content: "Sign in to your EveryDriver Pro account." },
    ],
  }),
  component: LoginPage,
});

const REMEMBER_KEY = "dsm:rememberedEmail";

const inputClass = "edp-input";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Face ID sign-in is disabled: it relied on reading a stored refresh token
  // from the browser. Password sign-in is unchanged.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
    if (saved) {
      setEmail(saved);
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
    setNotice(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      const msg = err.message?.toLowerCase() ?? "";
      if (msg.includes("invalid login credentials")) {
        setError("Incorrect email or password. Please try again.");
      } else if (msg.includes("email not confirmed")) {
        setError("Please confirm your email address before signing in.");
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(err.message);
      }
      return;
    }
    const userId = data.session?.user?.id ?? null;
    // The remembered email powers the prefill on the next visit, so it is
    // always persisted on a successful sign-in.
    persistRemember(email, true);
    if (userId) {
      await supabase
        .from("instructors")
        .update({ remembered_email: email })
        .eq("id", userId);
    }
    let pending: string | null = null;
    try {
      pending = localStorage.getItem("pending_calendar_connected");
    } catch {
      /* ignore */
    }
    if (pending === "true") {
      try {
        localStorage.removeItem("pending_calendar_connected");
      } catch {
        /* ignore */
      }
      navigate({ to: "/calendarsync", search: { connected: "true" }, replace: true });
      return;
    }
    navigate({ to: "/home", replace: true });
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col relative overflow-hidden"
      style={{
        fontFamily: "Poppins, sans-serif",
        background: "#e7f1f8",
      }}
    >
      {/* Decorative glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 85% -5%, rgba(24,119,214,0.08) 0%, transparent 60%), radial-gradient(ellipse 80% 50% at 10% 105%, rgba(62,143,224,0.06) 0%, transparent 60%)",
        }}
      />
      {/* Content */}
      <div
        className="relative z-10 flex-1 w-full max-w-[380px] mx-auto flex flex-col justify-center px-6"
        style={{
          paddingTop: "max(48px, env(safe-area-inset-top))",
          paddingBottom: 24,
        }}
      >
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <img
              src={edpLogoAsset.url}
              alt="EveryDriver Pro"
              className="h-[72px] w-auto"
            />
            <span
              className="absolute -top-1 -right-3.5 text-[11px] font-bold"
              style={{ color: "#0B1F3A", whiteSpace: "nowrap" }}
            >
              TM
            </span>
          </div>
          <span
            className="text-[22px] font-semibold"
            style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.01em", color: "#0B1F3A" }}
          >
            EveryDriver Pro
          </span>
          <span
            className="text-[12.5px] font-normal mt-1"
            style={{ letterSpacing: "0.04em", color: "#64748B" }}
          >
            Driving School Management
          </span>
        </div>

        {/* Login card */}
        <form
          onSubmit={onSubmit}
          className="w-full flex flex-col"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 22,
            padding: "24px 22px",
            boxShadow: "0 16px 40px rgba(11,31,58,0.08)",
          }}
        >
          <h2
            className="text-[20px] font-semibold"
            style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.01em", color: "#0B1F3A" }}
          >
            Welcome back
          </h2>
          <p className="text-[13px] mt-1 mb-6" style={{ color: "#64748B" }}>Sign in to your account</p>

          <div className="flex flex-col gap-4">
            <div className="w-full">
              <label
                htmlFor="login-email"
                className="block mb-1.5 text-[12px] font-medium"
                style={{ color: "#475569" }}
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="w-full relative">
              <label
                htmlFor="login-password"
                className="block mb-1.5 text-[12px] font-medium"
                style={{ color: "#475569" }}
              >
                Password
              </label>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-[38px] hover:text-[#64748B] transition-colors"
                style={{ color: "#94A3B8" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>

            <div className="flex justify-end -mt-1">
              <Link to="/forgotpassword" className="text-[13px] text-[#1877D6] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="text-[15px]"
              style={{
                height: 50,
                borderRadius: 14,
                boxShadow: "0 8px 20px rgba(24,119,214,0.35)",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-[12.5px] text-center mt-1 whitespace-nowrap" style={{ color: "#64748B" }}>
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-[#1877D6] hover:underline font-medium">
                Create account
              </Link>
            </p>

            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: "#94A3B8",
                marginTop: 16,
                padding: "0 16px",
              }}
            >
              By signing in you agree to our{" "}
              <Link to="/terms" style={{ color: "#64748B", textDecoration: "underline" }}>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" style={{ color: "#64748B", textDecoration: "underline" }}>
                Privacy Policy
              </Link>
            </div>

            {notice && (
              <p className="text-[13px] text-[#4ADE80] text-center" role="status">
                {notice}
              </p>
            )}

            {error && (
              <div
                className="px-3.5 py-3"
                role="alert"
                aria-live="assertive"
                style={{
                  background: "rgba(204,34,41,0.06)",
                  border: "1px solid rgba(204,34,41,0.25)",
                  borderRadius: 12,
                }}
              >
                <p className="text-[13px] font-medium text-[#CC2229] text-center">{error}</p>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Footer */}
      <div
        className="flex flex-col items-center gap-1.5"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <p className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "#94A3B8" }}>
          <IconShieldCheck size={13} />
          Your data is secure and encrypted
        </p>
        <p className="text-[10.5px]" style={{ color: "#CBD5E1" }}>EveryDriver Pro &copy; 2026</p>
      </div>
    </div>
  );
}
