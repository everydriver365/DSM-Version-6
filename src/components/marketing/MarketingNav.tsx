import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
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
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-8 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center no-underline">
          <span className="font-black text-[#1B2B4B] text-xl">DSM</span>
          <span className="text-[#718096] text-sm ml-1.5 font-normal">by EveryDriver</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={
                "text-sm font-medium transition-colors no-underline " +
                (isActive(l.to)
                  ? "text-[#1B2B4B] font-semibold"
                  : "text-[#374151] hover:text-[#1B2B4B]")
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center">
          <Link
            to="/login"
            className="text-[#374151] hover:text-[#1B2B4B] text-sm font-medium no-underline mr-6 transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="bg-[#00B5A5] hover:bg-[#009E8F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors no-underline"
          >
            Start free →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="md:hidden text-[#1B2B4B] p-2 -mr-2"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-white border-b border-gray-100 shadow-sm">
          <nav className="flex flex-col">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={
                  "px-6 py-4 text-sm font-medium no-underline border-b border-gray-50 last:border-b-0 " +
                  (isActive(l.to)
                    ? "text-[#1B2B4B] font-semibold"
                    : "text-[#374151] hover:text-[#1B2B4B]")
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="px-6 py-4 flex flex-col gap-3 border-t border-gray-100">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="text-center text-[#374151] hover:text-[#1B2B4B] text-sm font-medium no-underline transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="text-center bg-[#00B5A5] hover:bg-[#009E8F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors no-underline"
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
