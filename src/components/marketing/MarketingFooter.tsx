import { Link } from "@tanstack/react-router";

const NAVY = "#0F2044";
const FONT = "Poppins, system-ui, sans-serif";

const productLinks = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/features", label: "Roadmap" },
];

const companyLinks = [
  { to: "/about", label: "About", external: false },
  { to: "/contact", label: "Contact", external: false },
  { to: "https://everydriver.co.uk", label: "EveryDriver.co.uk", external: true },
  { to: "https://everydriver.co.uk/blog", label: "Blog", external: true },
];

const legalLinks = [
  { to: "https://everydriver.co.uk/privacy", label: "Privacy Policy" },
  { to: "https://everydriver.co.uk/terms", label: "Terms of Service" },
  { to: "https://everydriver.co.uk/returns", label: "Returns Policy" },
];

const linkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)",
  textDecoration: "none",
  fontSize: 14,
  fontFamily: FONT,
};

const headingStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  margin: "0 0 16px",
  fontFamily: FONT,
  letterSpacing: 0.3,
};

export function MarketingFooter() {
  return (
    <footer style={{ background: NAVY, color: "#fff", padding: "60px 0 32px", fontFamily: FONT }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px" }}>
        <div
          className="dsm-footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
            gap: 40,
          }}
        >
          {/* Column 1: Brand */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
              DSM by EveryDriver
            </div>
            <p
              style={{
                marginTop: 12,
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: 320,
              }}
            >
              The driving instructor app that works as hard as you do.
            </p>
            <p style={{ marginTop: 20, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
              © 2026 EveryDriver Ltd
            </p>
          </div>

          {/* Column 2: Product */}
          <div>
            <h4 style={headingStyle}>Product</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} style={linkStyle}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 style={headingStyle}>Company</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {companyLinks.map((l) =>
                l.external ? (
                  <li key={l.label}>
                    <a href={l.to} target="_blank" rel="noreferrer" style={linkStyle}>{l.label}</a>
                  </li>
                ) : (
                  <li key={l.label}>
                    <Link to={l.to} style={linkStyle}>{l.label}</Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 style={headingStyle}>Legal</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.to} target="_blank" rel="noreferrer" style={linkStyle}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
          }}
        >
          Made with ❤️ for driving instructors across the UK
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .dsm-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .dsm-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
