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
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        fontFamily: "'Inter', sans-serif",
        background:
          "radial-gradient(1100px 600px at 50% 120%, rgba(0,181,165,0.14), transparent 60%), rgba(247,250,252,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(229,233,242,0.6)",
      }}
    >
      <div className="h-14 flex items-center justify-between px-5 md:px-10 max-w-[1280px] mx-auto">
        <Link to="/" className="flex items-center no-underline">
          <img
            src={logoAsset.url}
            alt="Driving School Manager"
            className="h-10 sm:h-9 w-auto"
          />
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
            className="text-gray-600 hover:text-[#1B2B4B] text-sm font-medium no-underline px-2"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="bg-[#00B5A5] hover:bg-[#009E8F] text-white font-semibold px-5 py-2.5 rounded-lg text-sm no-underline transition-colors"
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
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center no-underline">
            <img
              src={logoAsset.url}
              alt="Driving School Manager"
              className="h-10 w-auto"
            />
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
              className="w-full text-center border border-gray-200 text-[#1B2B4B] px-4 py-3 rounded-lg text-base hover:bg-gray-50 no-underline font-medium"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="w-full text-center bg-[#00B5A5] hover:bg-[#009E8F] text-white font-semibold px-5 py-3 rounded-lg text-base no-underline"
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
