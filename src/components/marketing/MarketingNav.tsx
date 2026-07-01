import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import logoAsset from "../../assets/dsm-logo.png.asset.json";
import { PrimaryBtn, SecondaryBtn } from "./ui";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
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
          <SecondaryBtn to="/login">Log in</SecondaryBtn>
          <PrimaryBtn to="/register">Start free →</PrimaryBtn>
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
              className="flex flex-col leading-none text-[#1B2B4B] font-bold tracking-tight whitespace-nowrap"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              <span className="text-[15px]">Driving School</span>
              <span className="text-[15px]">Manager</span>
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
            <SecondaryBtn to="/login" onClick={() => setOpen(false)} className="w-full justify-center">
              Log in
            </SecondaryBtn>
            <PrimaryBtn to="/register" onClick={() => setOpen(false)} className="w-full justify-center">
              Start free →
            </PrimaryBtn>
          </div>
        </div>
      )}
    </header>
  );
}

export default MarketingNav;
