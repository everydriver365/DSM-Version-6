import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
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
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
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
      setRemember(true);
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
      setError(err.message);
      return;
    }
    const userId = data.session?.user?.id ?? null;
    instructorId.current = userId;
    persistRemember(email, remember);
    if (userId) {
      await supabase
        .from("instructors")
        .update({ remembered_email: remember ? email : null })
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
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B1F3A] px-4"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-4">
        <img
          src={dsmLogoAsset.url}
          alt="DSM logo"
          className="h-[60px] w-auto mb-2"
        />
        <span className="text-[#9CA3AF] text-[14px]" style={{ fontFamily: "Inter, sans-serif" }}>
          by EveryDriver
        </span>
      </div>

      {/* Face ID sign-in */}
      {webauthnSupported && (
        <button
          type="button"
          onClick={
            enrolled
              ? onBiometric
              : () => setError("Sign in with your password first to enable Face ID")
          }
          className="w-full max-w-[360px] h-12 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 mt-8"
          style={{
            fontFamily: "Inter, sans-serif",
            background: enrolled ? "#1877D6" : "#1B2C4A",
            color: enrolled ? "#FFFFFF" : "#8CA1C2",
            border: enrolled ? "1.5px solid #1877D6" : "1.5px solid #22375A",
          }}
        >
          <ScanFace size={20} />
          {enrolled ? "Sign in with Face ID" : "Set up Face ID"}
        </button>
      )}

      {/* One-time enrolment prompt */}
      {askEnroll && (
        <div
          className="w-full max-w-[360px] bg-white mt-4"
          style={{ borderRadius: 14, padding: 16, border: "1px solid #E2E8F0" }}
        >
          <p className="text-[14px] font-semibold text-[#0B1F3A]" style={{ fontFamily: "Inter, sans-serif" }}>
            Enable Face ID for next time?
          </p>
          <p className="text-[13px] text-[#6B7280] mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
            Sign in faster without typing your password.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={enableFaceId}
              className="flex-1 h-10 rounded-lg text-[14px] font-medium text-white"
              style={{ background: "#1877D6", fontFamily: "Inter, sans-serif" }}
            >
              Enable
            </button>
            <button
              type="button"
              onClick={skipEnroll}
              className="flex-1 h-10 rounded-lg text-[14px] font-medium text-[#0B1F3A]"
              style={{ border: "1.5px solid #E2E8F0", fontFamily: "Inter, sans-serif" }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

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
          className="text-[20px] font-semibold text-[#0B1F3A] text-center"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Welcome back
        </h2>
        <p
          className="text-[13px] text-[#6B7280] text-center"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Sign in to your account
        </p>

        <div className="flex flex-col gap-4">
          <div className="w-full">
            <label
              htmlFor="login-email"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Inter, sans-serif" }}
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
              className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1877D6]"
              style={{
                fontFamily: "Inter, sans-serif",
                border: "1.5px solid #CBD5E1",
              }}
            />
          </div>

          <div className="w-full relative">
            <label
              htmlFor="login-password"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Inter, sans-serif" }}
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
              className="h-12 w-full rounded-lg px-3 pr-10 text-[14px] text-[#0B1F3A] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1877D6]"
              style={{
                fontFamily: "Inter, sans-serif",
                border: "1.5px solid #CBD5E1",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-9 text-[#6B7280] hover:text-[#0B1F3A]"
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
                className="h-4 w-4 rounded border-[#CBD5E1] accent-[#1877D6]"
              />
              Remember me
            </label>
            <Link
              to="/forgotpassword"
              className="text-[13px] text-[#1877D6] hover:underline"
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

          <p className="text-[13px] text-[#6B7280] text-center" style={{ fontFamily: "Inter, sans-serif" }}>
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-[#1877D6] hover:underline font-medium">
              Create account
            </Link>
          </p>

          {notice && (
            <p
              className="text-[13px] text-[#15803D] text-center"
              role="status"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {notice}
            </p>
          )}


          {error && (
            <p
              className="text-[13px] text-[#1877D6] text-center"
              role="alert"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {error}
            </p>
          )}
        </div>
      </form>

      {/* Footer */}
      <p
        className="text-[#6B7280] text-[11px] text-center mt-8"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        DSM by EveryDriver &copy; 2026
      </p>
    </div>
  );
}
