import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import dsmLogoAsset from "../assets/dsm-logo.png.asset.json";

export const Route = createFileRoute("/forgotpassword")({
  head: () => ({
    meta: [
      { title: "Reset password — DSM by EveryDriver" },
      { name: "description", content: "Reset your DSM by EveryDriver password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/resetpassword",
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

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
        {sent ? (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 size={48} className="text-[#16A34A] mb-3" />
            <h2 className="text-[20px] font-semibold text-[#0A2540]">Check your email</h2>
            <p className="text-[13px] text-[#6B7280] mt-2">
              We've sent a password reset link to <span className="text-[#0A2540]">{email}</span>.
            </p>
            <p className="text-[12px] text-[#6B7280] mt-3">
              Check your spam folder too. The link will take you to the reset password page.
            </p>

            <Link to="/login" className="text-[13px] text-[#00A3B4] hover:underline mt-6">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col">
            <h2 className="text-[20px] font-semibold text-[#0A2540] text-center">Reset password</h2>
            <p className="text-[13px] text-[#6B7280] text-center mb-6">
              Enter your email and we'll send a reset link
            </p>

            <label htmlFor="fp-email" className="block mb-1 text-[12px] font-medium text-[#6B7280]">
              Email
            </label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0A2540] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#00A3B4]"
              style={{ fontFamily: "Inter, sans-serif", border: "1.5px solid #CBD5E1" }}
            />

            <div className="mt-6">
              <Button type="submit" disabled={loading} className="h-12 text-[14px]">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </div>

            {error && (
              <p className="text-[13px] text-[#CC2229] text-center mt-3" role="alert">
                {error}
              </p>
            )}

            <Link to="/login" className="text-[13px] text-[#00A3B4] hover:underline text-center mt-4">
              Back to sign in
            </Link>
          </form>
        )}
      </div>

      <p className="text-[#6B7280] text-[11px] text-center mt-8">DSM by EveryDriver &copy; 2026</p>
    </div>
  );
}
