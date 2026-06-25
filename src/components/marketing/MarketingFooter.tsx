import { Link } from "@tanstack/react-router";

export function MarketingFooter() {
  return (
    <footer style={{ background: "#0B1530", color: "#CBD5E1", marginTop: 80 }}>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "56px 20px 28px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 32,
        }}
        className="dsm-mkt-footer-grid"
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg,#3B82F6,#1E40AF)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              D
            </div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>DSM</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#94A3B8", maxWidth: 320 }}>
            The all-in-one app for UK driving instructors — built by EveryDriver in Winchester, Hampshire.
          </p>
        </div>

        <FooterCol title="Product">
          <Link to="/features" style={fLink}>Features</Link>
          <Link to="/pricing" style={fLink}>Pricing</Link>
          <Link to="/how-it-works" style={fLink}>How it works</Link>
        </FooterCol>

        <FooterCol title="Company">
          <Link to="/about" style={fLink}>About</Link>
          <Link to="/contact" style={fLink}>Contact</Link>
          <a href="https://everydriver.co.uk" target="_blank" rel="noreferrer" style={fLink}>EveryDriver.co.uk</a>
        </FooterCol>

        <FooterCol title="Legal">
          <a href="https://everydriver.co.uk/privacy" target="_blank" rel="noreferrer" style={fLink}>Privacy Policy</a>
          <a href="https://everydriver.co.uk/terms" target="_blank" rel="noreferrer" style={fLink}>Terms</a>
        </FooterCol>
      </div>

      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "18px 20px",
          borderTop: "1px solid #1E293B",
          fontSize: 12,
          color: "#64748B",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>© {new Date().getFullYear()} EveryDriver Ltd. All rights reserved.</span>
        <span>Made in Winchester, Hampshire 🇬🇧</span>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .dsm-mkt-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 440px) {
          .dsm-mkt-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

const fLink: React.CSSProperties = {
  color: "#CBD5E1",
  textDecoration: "none",
  fontSize: 13,
  padding: "4px 0",
};

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, marginBottom: 12, letterSpacing: 0.4 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}
