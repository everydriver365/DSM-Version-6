import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import dsmLogoAsset from "../assets/dsm-logo.png.asset.json";

export const Route = createFileRoute("/resetpassword")({
  head: () => ({
    meta: [
      { title: "New password — DSM by EveryDriver" },
      { name: "description", content: "Set a new DSM by EveryDriver password." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/login", replace: true }), 2000);
  }

  const inputStyle = { fontFamily: "Inter, sans-serif", border: "1.5px solid #CBD5E1" } as const;
  const inputCls =
    "h-12 w-full rounded-lg px-3 pr-10 text-[14px] text-[#0A2540] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#00A3B4]";

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0A2540] px-4"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="flex flex-col items-center mb-8">
        <img src={dsmLogoAsset.url} alt="DSM logo" className="h-[60px] w-auto mb-2" />
        <span className="text-[#9CA3AF] text-[14px]">by EveryDriver</span>
      </div>

      <div
        className="w-full max-w-[360px] bg-white flex flex-col"
        style={{ borderRadius: "20px", padding: "28px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
      >
        {done ? (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 size={48} className="text-[#16A34A] mb-3" />
            <h2 className="text-[20px] font-semibold text-[#0A2540]">Password updated!</h2>
            <p className="text-[13px] text-[#6B7280] mt-2">Redirecting to sign in…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col">
            <h2 className="text-[20px] font-semibold text-[#0A2540] text-center mb-6">New password</h2>

            <div className="flex flex-col gap-4">
              <div className="relative w-full">
                <label htmlFor="rp-pw" className="block mb-1 text-[12px] font-medium text-[#6B7280]">
                  New password
                </label>
                <input
                  id="rp-pw"
                  type={showPw ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className={inputCls}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-9 text-[#6B7280] hover:text-[#1A1A2E]"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative w-full">
                <label htmlFor="rp-confirm" className="block mb-1 text-[12px] font-medium text-[#6B7280]">
                  Confirm password
                </label>
                <input
                  id="rp-confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className={inputCls}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-9 text-[#6B7280] hover:text-[#1A1A2E]"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <Button type="submit" disabled={loading} className="h-12 text-[14px]">
                {loading ? "Updating…" : "Update password"}
              </Button>
            </div>

            {error && (
              <p className="text-[13px] text-[#CC2229] text-center mt-3" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>

      <p className="text-[#6B7280] text-[11px] text-center mt-8">DSM by EveryDriver &copy; 2026</p>
    </div>
  );
}
