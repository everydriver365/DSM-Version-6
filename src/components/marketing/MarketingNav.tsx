import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import logoAsset from "../../assets/dsm-logo.png.asset.json";

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
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="h-14 flex items-center justify-between px-5 md:px-10 max-w-[1280px] mx-auto">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <img
            src={logoAsset.url}
            alt="Driving School Manager"
            className="h-10 sm:h-9 w-auto"
          />
          <span
            className="hidden sm:flex flex-col leading-none text-[#1B2B4B] font-bold tracking-tight whitespace-nowrap"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <span className="text-[15px]">Driving School</span>
            <span className="text-[15px]">Manager</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((l, idx) => (
            <Link
              key={`${l.to}-${idx}`}
              to={l.to}
              className="text-gray-600 hover:text-[#1B2B4B] text-[14px] font-medium no-underline transition-colors"
              activeProps={{ className: "text-[#1B2B4B]" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-lg border border-[#0E7CCE] text-[#0E7CCE] bg-white hover:bg-[#EAF4FC] text-sm font-semibold no-underline transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-lg bg-[#0E7CCE] hover:bg-[#0B69AD] text-white text-sm font-semibold no-underline transition-colors"
          >
            Start free →
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="lg:hidden text-[#1B2B4B] p-2 -mr-2"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col px-6 py-6 lg:hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="flex items-center justify-between mb-10">
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 no-underline">
            <img
              src={logoAsset.url}
              alt="Driving School Manager"
              className="h-10 w-auto"
            />
            <span
              className="text-[#1B2B4B] font-bold text-lg tracking-tight whitespace-nowrap"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Driving School Manager
            </span>
          </Link>
            <button type="button" onClick={() => setOpen(false)} className="text-[#1B2B4B] p-2 -mr-2" aria-label="Close menu">
              <X size={28} />
            </button>
          </div>
          <nav className="flex flex-col gap-5">
            {navLinks.map((l, idx) => (
              <Link
                key={`${l.to}-${idx}`}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-[#1B2B4B] text-2xl font-bold no-underline"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="w-full text-center border border-[#0E7CCE] text-[#0E7CCE] bg-white hover:bg-[#EAF4FC] px-5 py-3 rounded-lg text-base no-underline font-semibold"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="w-full text-center bg-[#0E7CCE] hover:bg-[#0B69AD] text-white font-semibold px-5 py-3 rounded-lg text-base no-underline"
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
