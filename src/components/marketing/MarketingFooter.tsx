import { Link } from "@tanstack/react-router";
import logoAsset from "../../assets/dsm-main-logo.png.asset.json";

export function MarketingFooter() {
  return (
    <footer className="bg-[#133155] pt-16 pb-10 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[1180px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2 md:col-span-2">
            <Link to="/" className="inline-flex items-center no-underline mb-4">
              <img
                src={logoAsset.url}
                alt="Driving School Manager"
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              The all-in-one app for UK driving instructors. Manage lessons, take payments, track progress —
              free forever.
            </p>
          </div>

          <div>
            <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-semibold">Product</h3>
            <div className="flex flex-col gap-3">
              <Link to="/features" className="text-gray-400 hover:text-white text-sm no-underline">Features</Link>
              <Link to="/pricing" className="text-gray-400 hover:text-white text-sm no-underline">Pricing</Link>
              <Link to="/how-it-works" className="text-gray-400 hover:text-white text-sm no-underline">How it works</Link>
              <Link to="/register" className="text-gray-400 hover:text-white text-sm no-underline">Sign up free</Link>
            </div>
          </div>

          <div>
            <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-semibold">Company</h3>
            <div className="flex flex-col gap-3">
              <Link to="/about" className="text-gray-400 hover:text-white text-sm no-underline">About</Link>
              <Link to="/contact" className="text-gray-400 hover:text-white text-sm no-underline">Contact</Link>
              <a href="https://everydriver.co.uk" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white text-sm no-underline">
                EveryDriver.co.uk
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-semibold">Legal</h3>
            <div className="flex flex-col gap-3">
              <a href="https://everydriver.co.uk/privacy" className="text-gray-400 hover:text-white text-sm no-underline">Privacy</a>
              <a href="https://everydriver.co.uk/terms" className="text-gray-400 hover:text-white text-sm no-underline">Terms</a>
              <a href="https://everydriver.co.uk/returns" className="text-gray-400 hover:text-white text-sm no-underline">Returns</a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-xs">
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
