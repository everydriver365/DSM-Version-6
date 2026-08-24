import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconScan,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import edpLogoAsset from "../assets/ed-pro-logo-white-2.png.asset.json";

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
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [askEnroll, setAskEnroll] = useState(false);
  const fetchedRefreshToken = useRef<string | null>(null);
  const instructorId = useRef<string | null>(null);

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
    if (typeof window !== "undefined" && window.PublicKeyCredential && navigator.credentials) {
      setWebauthnSupported(true);
    }
    if (!saved) return;
    (async () => {
      const { data: instructor } = await supabase
        .from("instructors")
        .select("id, faceid_enrolled, faceid_refresh_token")
        .eq("remembered_email", saved)
        .maybeSingle();
      instructorId.current = instructor?.id ?? null;
      fetchedRefreshToken.current = instructor?.faceid_refresh_token ?? null;
      if (instructor?.faceid_enrolled) setEnrolled(true);
    })();
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
    instructorId.current = userId;
    // The remembered email powers the Face ID row and prefill on the next
    // visit, so it is always persisted on a successful sign-in.
    persistRemember(email, true);
    if (userId) {
      await supabase
        .from("instructors")
        .update({ remembered_email: email })
        .eq("id", userId);
    }
    if (webauthnSupported && !enrolled) {
      setAskEnroll(true);
      return;
    }
    navigate({ to: "/home", replace: true });
  }

  async function enableFaceId() {
    setAskEnroll(false);
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "DSM by EveryDriver", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(email),
            name: email,
            displayName: email,
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      });
      if (cred) {
        const { data } = await supabase.auth.getSession();
        const refreshToken = data.session?.refresh_token;
        const userId = data.session?.user?.id;
        if (refreshToken && userId) {
          await supabase
            .from("instructors")
            .update({ faceid_enrolled: true, faceid_refresh_token: refreshToken })
            .eq("id", userId);
          instructorId.current = userId;
          fetchedRefreshToken.current = refreshToken;
          setEnrolled(true);
          setNotice("Face ID enabled — you can use it next time you sign in");
          setTimeout(() => navigate({ to: "/home", replace: true }), 900);
          return;
        }
      }
    } catch {
      /* enrollment cancelled or failed */
    }
    navigate({ to: "/home", replace: true });
  }

  function skipEnroll() {
    setAskEnroll(false);
    navigate({ to: "/home", replace: true });
  }

  async function onBiometric() {
    setError(null);
    setNotice(null);
    const refreshToken = fetchedRefreshToken.current;
    if (!enrolled || !refreshToken) {
      setError("Face ID not set up — sign in with your password first");
      return;
    }
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
    } catch {
      setError("Face ID failed — use your password instead");
      return;
    }
    const { error: err } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (err) {
      await supabase
        .from("instructors")
        .update({ faceid_enrolled: false, faceid_refresh_token: null })
        .eq("faceid_refresh_token", refreshToken);
      fetchedRefreshToken.current = null;
      setEnrolled(false);
      setError("Session expired — please sign in with your password");
      return;
    }
    const newSession = await supabase.auth.getSession();
    const newToken = newSession.data.session?.refresh_token;
    const userId = newSession.data.session?.user?.id ?? instructorId.current;
    if (newToken && userId) {
      fetchedRefreshToken.current = newToken;
      await supabase
        .from("instructors")
        .update({ faceid_refresh_token: newToken })
        .eq("id", userId);
    }
    navigate({ to: "/home", replace: true });
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-[#0B1F3A]"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {/* Content */}
      <div
        className="flex-1 w-full max-w-[380px] mx-auto flex flex-col justify-center px-6"
        style={{
          paddingTop: "max(48px, env(safe-area-inset-top))",
          paddingBottom: 24,
        }}
      >
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={edpLogoAsset.url}
            alt="EveryDriver Pro"
            className="h-[72px] w-auto mb-4"
          />
          <span
            className="text-white text-[22px] font-semibold"
            style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.01em" }}
          >
            EveryDriver Pro
          </span>
          <span
            className="text-white/45 text-[12.5px] font-normal mt-1"
            style={{ letterSpacing: "0.04em" }}
          >
            Driving School Management
          </span>
        </div>

        {/* Face ID row */}
        {webauthnSupported && (
          <button
            type="button"
            onClick={
              enrolled
                ? onBiometric
                : () => setError("Sign in with your password first to enable Face ID")
            }
            className="w-full flex items-center gap-3.5 text-left mb-5 transition-colors active:bg-white/[0.09]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 16,
              padding: "13px 16px",
            }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                background: "rgba(24,119,214,0.22)",
              }}
            >
              <IconScan size={19} color="#5EA9EC" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-white text-[15px] font-semibold leading-tight">
                Face ID
              </span>
              <span className="block text-white/45 text-[12px] leading-tight mt-0.5">
                {enrolled ? "Sign in with Face ID" : "Sign in faster next time"}
              </span>
            </span>
            <IconChevronRight size={17} color="rgba(255,255,255,0.35)" className="flex-shrink-0" />
          </button>
        )}

        {/* One-time enrolment prompt */}
        {askEnroll && (
          <div
            className="w-full mb-5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <p className="text-[15px] font-semibold text-white">Enable Face ID for next time?</p>
            <p className="text-[13px] text-white/50 mt-1">
              Sign in faster without typing your password.
            </p>
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                onClick={enableFaceId}
                className="flex-1 h-11 text-[14px] font-semibold text-white"
                style={{ background: tokens.blue, borderRadius: 12 }}
              >
                Enable
              </button>
              <button
                type="button"
                onClick={skipEnroll}
                className="flex-1 h-11 text-[14px] font-medium text-white/80"
                style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: 12 }}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Login card */}
        <form
          onSubmit={onSubmit}
          className="w-full flex flex-col"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 22,
            padding: "24px 22px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            backdropFilter: "blur(20px)",
          }}
        >
          <h2
            className="text-[20px] font-semibold text-white"
            style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.01em" }}
          >
            Welcome back
          </h2>
          <p className="text-[13px] text-white/45 mt-1 mb-6">Sign in to your account</p>

          <div className="flex flex-col gap-4">
            <div className="w-full">
              <label
                htmlFor="login-email"
                className="block mb-1.5 text-[12px] font-medium text-white/55"
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
                className="block mb-1.5 text-[12px] font-medium text-white/55"
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
                className="absolute right-3.5 top-[38px] hover:text-white/70 transition-colors"
                style={{ color: "rgba(255,255,255,0.40)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>

            <div className="flex justify-end -mt-1">
              <Link to="/forgotpassword" className="text-[13px] text-[#6FB2F0] hover:underline">
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

            <p className="text-[12.5px] text-white/45 text-center mt-1 whitespace-nowrap">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-[#6FB2F0] hover:underline font-medium">
                Create account
              </Link>
            </p>

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
                  background: "rgba(204,34,41,0.14)",
                  border: "1px solid rgba(204,34,41,0.38)",
                  borderRadius: 12,
                }}
              >
                <p className="text-[13px] font-medium text-[#FF9B9E] text-center">{error}</p>
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
        <p className="flex items-center gap-1.5 text-white/35 text-[11.5px]">
          <IconShieldCheck size={13} />
          Your data is secure and encrypted
        </p>
        <p className="text-white/20 text-[10.5px]">EveryDriver Pro &copy; 2026</p>
      </div>
    </div>
  );
}
