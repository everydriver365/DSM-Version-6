import { Link } from "@tanstack/react-router";

export function MarketingFooter() {
  return (
    <footer
      className="bg-[#0F2044] text-white pt-16 pb-8"
      style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="text-white font-bold text-lg mb-2">DSM by EveryDriver</div>
            <p className="text-white/60 text-sm leading-relaxed">
              The all-in-one driving instructor app — schedule lessons, take payments, manage pupils
              and grow your business from your phone.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Product</h3>
            <div className="flex flex-col gap-2">
              <Link to="/features" className="text-white/60 hover:text-white text-sm no-underline">
                Features
              </Link>
              <Link to="/pricing" className="text-white/60 hover:text-white text-sm no-underline">
                Pricing
              </Link>
              <Link to="/how-it-works" className="text-white/60 hover:text-white text-sm no-underline">
                How it works
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Company</h3>
            <div className="flex flex-col gap-2">
              <Link to="/about" className="text-white/60 hover:text-white text-sm no-underline">
                About
              </Link>
              <Link to="/contact" className="text-white/60 hover:text-white text-sm no-underline">
                Contact
              </Link>
              <a
                href="https://everydriver.co.uk"
                target="_blank"
                rel="noreferrer"
                className="text-white/60 hover:text-white text-sm no-underline"
              >
                EveryDriver.co.uk
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h3>
            <div className="flex flex-col gap-2">
              <a href="/privacy" className="text-white/60 hover:text-white text-sm no-underline">
                Privacy Policy
              </a>
              <a href="/terms" className="text-white/60 hover:text-white text-sm no-underline">
                Terms
              </a>
              <a href="/returns" className="text-white/60 hover:text-white text-sm no-underline">
                Returns Policy
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-white/40 text-sm">
          © 2026 EveryDriver Ltd. All rights reserved. Made with ❤️ for driving instructors across the UK.
        </div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
