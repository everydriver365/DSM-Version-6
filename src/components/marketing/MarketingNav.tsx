import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

const navLinks = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0F2044]">
      <div className="h-16 flex items-center justify-between px-6 md:px-12 relative">
        <Link to="/" className="flex items-baseline no-underline">
          <span className="text-white font-black text-xl">DSM</span>
          <span className="text-white/50 text-sm ml-2">by EveryDriver</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-white/80 hover:text-white text-sm font-medium no-underline transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="border border-white/30 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/10 no-underline transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="bg-white text-[#0F2044] font-bold px-5 py-2 rounded-lg text-sm hover:bg-white/90 no-underline transition-colors"
          >
            Start free →
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="md:hidden text-white p-2 -mr-2"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#0F2044] flex flex-col px-6 py-6 md:hidden">
          <div className="flex items-center justify-between mb-10">
            <Link to="/" onClick={() => setOpen(false)} className="flex items-baseline no-underline">
              <span className="text-white font-black text-xl">DSM</span>
              <span className="text-white/50 text-sm ml-2">by EveryDriver</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white p-2 -mr-2"
              aria-label="Close menu"
            >
              <X size={28} />
            </button>
          </div>
          <nav className="flex flex-col gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-white text-2xl font-bold no-underline"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="w-full text-center border border-white/30 text-white px-4 py-3 rounded-lg text-base hover:bg-white/10 no-underline"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="w-full text-center bg-white text-[#0F2044] font-bold px-5 py-3 rounded-lg text-base hover:bg-white/90 no-underline"
            >
              Start free →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default MarketingNav;
