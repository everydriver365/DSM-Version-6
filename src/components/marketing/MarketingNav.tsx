import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

const navLinks = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0F2044]" style={{ fontFamily: "Poppins, system-ui, sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 flex h-16 items-center justify-between relative">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-white text-xl font-bold">DSM</span>
          <span className="text-white/60 text-sm">by EveryDriver</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors no-underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="border border-white/30 text-white hover:bg-white/10 rounded-lg px-4 py-2 text-sm no-underline transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="bg-white text-[#0F2044] hover:bg-white/90 rounded-lg px-4 py-2 text-sm font-semibold no-underline transition-colors"
          >
            Get started free
          </Link>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-white p-2 -mr-2"
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-[#0F2044] border-t border-white/10 px-4 py-4 flex flex-col gap-2">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white text-sm py-2 no-underline"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/login"
            onClick={() => setOpen(false)}
            className="mt-2 w-full text-center border border-white/30 text-white hover:bg-white/10 rounded-lg px-4 py-2 text-sm no-underline"
          >
            Log in
          </Link>
          <Link
            to="/register"
            onClick={() => setOpen(false)}
            className="w-full text-center bg-white text-[#0F2044] hover:bg-white/90 rounded-lg px-4 py-2 text-sm font-semibold no-underline"
          >
            Get started free
          </Link>
        </div>
      )}
    </header>
  );
}

export default MarketingNav;
