import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import dsmLogoAsset from "../assets/dsm-logo.png.asset.json";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — DSM by EveryDriver" },
      { name: "description", content: "Create your DSM by EveryDriver account." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setError("Could not create account. Please try again.");
      return;
    }

    const { error: insertError } = await supabase.from("instructors").insert({
      id: userId,
      name: `${firstName} ${lastName}`.trim(),
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    navigate({ to: "/onboarding", replace: true });
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
          Create your account
        </h2>
        <p
          className="text-[13px] text-[#6B7280] text-center mb-6"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Join DSM by EveryDriver
        </p>

        <div className="flex flex-col gap-4">
          <div className="w-full">
            <label
              htmlFor="reg-firstname"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              First name
            </label>
            <input
              id="reg-firstname"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0F2044] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A52A0]"
              style={{
                fontFamily: "Poppins, sans-serif",
                border: "1.5px solid #CBD5E1",
              }}
            />
          </div>

          <div className="w-full">
            <label
              htmlFor="reg-lastname"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Last name
            </label>
            <input
              id="reg-lastname"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0F2044] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A52A0]"
              style={{
                fontFamily: "Poppins, sans-serif",
                border: "1.5px solid #CBD5E1",
              }}
            />
          </div>

          <div className="w-full">
            <label
              htmlFor="reg-email"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              htmlFor="reg-password"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Password
            </label>
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
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

          <div className="w-full relative">
            <label
              htmlFor="reg-confirm"
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-12 w-full rounded-lg px-3 pr-10 text-[14px] text-[#0F2044] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A52A0]"
              style={{
                fontFamily: "Poppins, sans-serif",
                border: "1.5px solid #CBD5E1",
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-9 text-[#6B7280] hover:text-[#1A1A2E]"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 text-[14px] w-full"
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </div>

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
        className="text-[#6B7280] text-[13px] text-center mt-8"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        Already have an account?{" "}
        <Link to="/login" className="text-[#1A52A0] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
