import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import dsmLogo from "@/assets/dsm-logo.png.asset.json";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/features", label: "Websites & Domains" },
  { to: "/features", label: "Telematics" },
  { to: "/features", label: "Dashcam" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A1024] border-b border-white/5">
      <div className="h-16 flex items-center justify-between px-5 md:px-10 max-w-[1280px] mx-auto">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <img src={dsmLogo.url} alt="DSM" className="h-9 w-auto object-contain" />
          <span className="hidden sm:block text-white font-bold text-[15px] tracking-tight">
            Driving School Manager
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-white/75 hover:text-white text-[14px] font-medium no-underline transition-colors"
              activeProps={{ className: "text-white" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/login"
            className="text-white/85 hover:text-white text-sm font-medium no-underline px-2"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="bg-[#1A73E8] hover:bg-[#1565C7] text-white font-semibold px-5 py-2.5 rounded-full text-sm no-underline transition-colors shadow-[0_4px_14px_rgba(26,115,232,0.4)]"
          >
            Get Started Free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="lg:hidden text-white p-2 -mr-2"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#0A1024] flex flex-col px-6 py-6 lg:hidden">
          <div className="flex items-center justify-between mb-10">
            <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 no-underline">
              <img src={dsmLogo.url} alt="DSM" className="h-9 w-auto object-contain" />
              <span className="text-white font-bold text-[15px]">Driving School Manager</span>
            </Link>
            <button type="button" onClick={() => setOpen(false)} className="text-white p-2 -mr-2" aria-label="Close menu">
              <X size={28} />
            </button>
          </div>
          <nav className="flex flex-col gap-5">
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
              className="w-full text-center border border-white/30 text-white px-4 py-3 rounded-full text-base hover:bg-white/10 no-underline"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="w-full text-center bg-[#1A73E8] text-white font-bold px-5 py-3 rounded-full text-base no-underline"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default MarketingNav;
