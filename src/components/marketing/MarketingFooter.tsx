import { Link } from "@tanstack/react-router";

export function MarketingFooter() {
  return (
    <footer className="bg-[#0A1628] py-16 px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto mb-12">
        <div>
          <div className="font-black text-white text-lg mb-3">DSM by EveryDriver</div>
          <p className="text-white/50 text-sm leading-relaxed">
            The all-in-one app for UK driving instructors.
          </p>
        </div>

        <div>
          <h3 className="text-white/30 text-xs uppercase tracking-widest mb-4">Product</h3>
          <div className="flex flex-col gap-3">
            <Link to="/features" className="text-white/60 hover:text-white text-sm no-underline">Features</Link>
            <Link to="/pricing" className="text-white/60 hover:text-white text-sm no-underline">Pricing</Link>
            <Link to="/how-it-works" className="text-white/60 hover:text-white text-sm no-underline">How it works</Link>
          </div>
        </div>

        <div>
          <h3 className="text-white/30 text-xs uppercase tracking-widest mb-4">Company</h3>
          <div className="flex flex-col gap-3">
            <Link to="/about" className="text-white/60 hover:text-white text-sm no-underline">About</Link>
            <Link to="/contact" className="text-white/60 hover:text-white text-sm no-underline">Contact</Link>
            <a href="https://everydriver.co.uk" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white text-sm no-underline">
              EveryDriver.co.uk
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-white/30 text-xs uppercase tracking-widest mb-4">Legal</h3>
          <div className="flex flex-col gap-3">
            <a href="/privacy" className="text-white/60 hover:text-white text-sm no-underline">Privacy Policy</a>
            <a href="/terms" className="text-white/60 hover:text-white text-sm no-underline">Terms</a>
            <a href="/returns" className="text-white/60 hover:text-white text-sm no-underline">Returns Policy</a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-8 text-center text-white/30 text-sm">
        © 2026 EveryDriver Ltd. All rights reserved.
      </div>
    </footer>
  );
}

export default MarketingFooter;
