import { Link } from "@tanstack/react-router";

export function MarketingFooter() {
  return (
    <footer className="bg-[#0A1024] pt-16 pb-10 px-6 border-t border-white/5">
      <div className="max-w-[1180px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1A73E8] to-[#0F2044] grid place-items-center text-white font-black text-sm">
                DSM
              </span>
              <span className="text-white font-bold text-[15px]">Driving School Manager</span>
            </div>
            <p className="text-white/55 text-sm leading-relaxed max-w-xs">
              The all-in-one app for UK driving instructors. Manage lessons, take payments, track progress —
              free forever.
            </p>
          </div>

          <div>
            <h3 className="text-white/40 text-xs uppercase tracking-widest mb-4 font-semibold">Product</h3>
            <div className="flex flex-col gap-3">
              <Link to="/features" className="text-white/70 hover:text-white text-sm no-underline">Features</Link>
              <Link to="/pricing" className="text-white/70 hover:text-white text-sm no-underline">Pricing</Link>
              <Link to="/how-it-works" className="text-white/70 hover:text-white text-sm no-underline">How it works</Link>
              <Link to="/register" className="text-white/70 hover:text-white text-sm no-underline">Sign up free</Link>
            </div>
          </div>

          <div>
            <h3 className="text-white/40 text-xs uppercase tracking-widest mb-4 font-semibold">Company</h3>
            <div className="flex flex-col gap-3">
              <Link to="/about" className="text-white/70 hover:text-white text-sm no-underline">About</Link>
              <Link to="/contact" className="text-white/70 hover:text-white text-sm no-underline">Contact</Link>
              <a href="https://everydriver.co.uk" target="_blank" rel="noreferrer" className="text-white/70 hover:text-white text-sm no-underline">
                EveryDriver.co.uk
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white/40 text-xs uppercase tracking-widest mb-4 font-semibold">Legal</h3>
            <div className="flex flex-col gap-3">
              <a href="https://everydriver.co.uk/privacy" className="text-white/70 hover:text-white text-sm no-underline">Privacy</a>
              <a href="https://everydriver.co.uk/terms" className="text-white/70 hover:text-white text-sm no-underline">Terms</a>
              <a href="https://everydriver.co.uk/returns" className="text-white/70 hover:text-white text-sm no-underline">Returns</a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-xs">
          <div>© {new Date().getFullYear()} EveryDriver Ltd. All rights reserved.</div>
          <div className="flex gap-5">
            <span>Made in Winchester, UK 🇬🇧</span>
            <span>GDPR compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
