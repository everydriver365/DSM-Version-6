import { useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu,
  X,
  ChevronDown,
  Calendar,
  CreditCard,
  Users,
  GraduationCap,
  Globe,
  Gauge,
  Camera,
  Newspaper,
  HelpCircle,
  Star,
  PlayCircle,
  ArrowUpRight,
} from "lucide-react";
import logoAsset from "../../assets/dsm-logo.png.asset.json";

const NAVY = "#0A2540";
const ACCENT = "#0B7DDA";
const PANEL_BG = "#F7F5EF";
const ICON_BG = "#EAF3FB";
const BORDER = "#EEF2F7";

type Featured = { to: string; icon: any; label: string; desc?: string };
type ListItem = { to: string; label: string };

const productFeatured: Featured[] = [
  { to: "/features", icon: Calendar, label: "Smart diary", desc: "Bookings, reschedules & reminders in one place." },
  { to: "/features", icon: CreditCard, label: "Payments & invoicing", desc: "Take card payments and settle balances fast." },
];
const productList: ListItem[] = [
  { to: "/features", label: "Pupil management" },
  { to: "/features", label: "Progress tracking" },
  { to: "/features", label: "Automations" },
  { to: "/features", label: "Reports & tax" },
  { to: "/features", label: "See all features" },
];

const workFeatured: Featured[] = [
  { to: "/features", icon: GraduationCap, label: "Independent instructors" },
  { to: "/features", icon: Users, label: "Driving schools" },
];
const workList: ListItem[] = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
];

const learnFeatured: Featured[] = [
  { to: "/how-it-works", icon: Newspaper, label: "How it works" },
  { to: "/about", icon: Star, label: "About us" },
  { to: "/contact", icon: HelpCircle, label: "Support" },
];
const learnList: ListItem[] = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const extrasFeatured: Featured[] = [
  { to: "/features", icon: Globe, label: "Websites & domains" },
  { to: "/features", icon: Gauge, label: "Telematics" },
  { to: "/features", icon: Camera, label: "Dashcam" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [which, setWhich] = useState<null | "product" | "work" | "extras" | "learn">(null);
  const closeTimer = useRef<number | null>(null);

  const openMenu = (m: NonNullable<typeof which>) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setWhich(m);
  };
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setWhich(null), 120);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#fff",
        borderBottom: `1px solid ${BORDER}`,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 40px",
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
        className="ed-nav-inner"
      >
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src={logoAsset.url} alt="Driving School Manager" style={{ height: 36, width: "auto" }} />
          <span
            className="ed-nav-brand"
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1,
              color: NAVY,
              fontWeight: 800,
              fontFamily: "'Poppins', sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 14 }}>Driving School</span>
            <span style={{ fontSize: 14 }}>Manager</span>
          </span>
        </Link>

        <nav className="ed-nav-center" style={{ display: "flex", gap: 4, alignItems: "center", height: "100%" }}>
          <MenuTrigger label="Product" active={which === "product"} onEnter={() => openMenu("product")} onLeave={scheduleClose} />
          <MenuTrigger label="Who it's for" active={which === "work"} onEnter={() => openMenu("work")} onLeave={scheduleClose} />
          <MenuTrigger label="Add-ons" active={which === "extras"} onEnter={() => openMenu("extras")} onLeave={scheduleClose} />
          <Link to="/pricing" className="ed-nav-link" style={triggerStyle(false)}>
            Pricing
          </Link>
          <MenuTrigger label="Company" active={which === "learn"} onEnter={() => openMenu("learn")} onLeave={scheduleClose} />
        </nav>

        <div className="ed-nav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            to="/register"
            style={{
              background: ACCENT,
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              padding: "12px 22px",
              borderRadius: 6,
              lineHeight: 1,
              border: `1.5px solid ${ACCENT}`,
              boxShadow: "0 1px 2px rgba(12,35,64,0.08)",
            }}
          >
            Start free
          </Link>
          <Link
            to="/login"
            style={{
              background: "#fff",
              color: ACCENT,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              padding: "12px 22px",
              borderRadius: 6,
              border: `1.5px solid ${ACCENT}`,
              lineHeight: 1,
            }}
          >
            Sign in
          </Link>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="ed-nav-burger"
          style={{ display: "none", background: "transparent", border: 0, cursor: "pointer", color: NAVY }}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {which && (
        <div
          onMouseEnter={() => openMenu(which)}
          onMouseLeave={scheduleClose}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 80,
            background: "#fff",
            borderTop: `1px solid ${BORDER}`,
            borderBottom: `1px solid ${BORDER}`,
            boxShadow: "0 24px 40px rgba(12,35,64,0.08)",
          }}
        >
          {which === "product" && (
            <MegaPanel
              leftTitle="Product"
              featured={productFeatured}
              middleTitle="More features"
              list={productList}
              rightTitle="Get started"
              rightHeadline="See DSM in action"
              rightDesc="Create an account in seconds and try every feature free for 14 days."
              rightCta="Start free"
              rightHref="/register"
            />
          )}
          {which === "work" && (
            <MegaPanel
              leftTitle="Who it's for"
              featured={workFeatured}
              middleTitle="Explore"
              list={workList}
              rightTitle="Talk to us"
              rightHeadline="Not sure it's right for you?"
              rightDesc="Send us a note — we'll help you decide if DSM fits your school."
              rightCta="Contact us"
              rightHref="/contact"
            />
          )}
          {which === "extras" && (
            <MegaPanel
              leftTitle="Add-ons"
              featured={extrasFeatured}
              middleTitle="Also included"
              list={[
                { to: "/features", label: "AI receptionist" },
                { to: "/features", label: "Flexible payments" },
                { to: "/features", label: "Test swap service" },
              ]}
              rightTitle="Bundle & save"
              rightHeadline="Everything in one plan"
              rightDesc="Combine add-ons with your subscription for a single monthly price."
              rightCta="See pricing"
              rightHref="/pricing"
            />
          )}
          {which === "learn" && (
            <MegaPanel
              leftTitle="Company"
              featured={learnFeatured}
              middleTitle="More"
              list={learnList}
              rightTitle="Help & support"
              rightHeadline="Questions? We've got answers"
              rightDesc="Read our step-by-step guide to how DSM works for instructors."
              rightCta="How it works"
              rightHref="/how-it-works"
            />
          )}
        </div>
      )}

      {open && (
        <div className="ed-nav-mobile" style={{ display: "none", padding: "8px 20px 20px", borderTop: `1px solid ${BORDER}` }}>
          {[
            { to: "/features", label: "Product" },
            { to: "/how-it-works", label: "How it works" },
            { to: "/pricing", label: "Pricing" },
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
          ].map((l, i) => (
            <Link key={i} to={l.to} onClick={() => setOpen(false)} style={mobileLink}>
              {l.label}
            </Link>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                background: ACCENT,
                color: "#fff",
                textAlign: "center",
                padding: "12px 16px",
                borderRadius: 6,
                fontWeight: 700,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              Start free
            </Link>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                background: "#fff",
                color: ACCENT,
                textAlign: "center",
                padding: "12px 16px",
                borderRadius: 6,
                fontWeight: 700,
                textDecoration: "none",
                fontSize: 14,
                border: `1.5px solid ${ACCENT}`,
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .ed-nav-link, .ed-nav-trigger { transition: color .15s ease; }
        .ed-nav-link:hover, .ed-nav-trigger:hover { color: ${ACCENT} !important; }
        .ed-mega-item:hover .ed-mega-item-title { color: ${ACCENT}; }
        .ed-mega-item:hover .ed-mega-icon { background: ${ACCENT}; color: #fff !important; }
        .ed-mega-list-item:hover { color: ${ACCENT} !important; }
        @media (max-width: 1024px) {
          .ed-nav-center, .ed-nav-actions { display: none !important; }
          .ed-nav-burger { display: inline-flex !important; }
          .ed-nav-mobile { display: block !important; }
          .ed-nav-inner { padding: 0 20px !important; height: 64px !important; }
        }
      `}</style>
    </header>
  );
}

function triggerStyle(active: boolean): React.CSSProperties {
  return {
    color: active ? ACCENT : NAVY,
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 600,
    padding: "10px 16px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 80,
    lineHeight: 1,
    boxSizing: "border-box",
    borderBottom: active ? `3px solid ${ACCENT}` : "3px solid transparent",
    marginBottom: -1,
    background: "transparent",
    border: 0,
    borderTop: "3px solid transparent",
    cursor: "pointer",
    font: "inherit",
  };
}

function MenuTrigger({
  label,
  active,
  onEnter,
  onLeave,
}: {
  label: string;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      className="ed-nav-trigger"
      style={triggerStyle(active)}
    >
      {label}
      <ChevronDown
        size={14}
        strokeWidth={2.5}
        style={{ transition: "transform .2s ease", transform: active ? "rotate(180deg)" : "rotate(0deg)" }}
      />
    </button>
  );
}

function MegaPanel({
  leftTitle,
  featured,
  middleTitle,
  list,
  rightTitle,
  rightHeadline,
  rightDesc,
  rightCta,
  rightHref,
}: {
  leftTitle: string;
  featured: Featured[];
  middleTitle: string;
  list: ListItem[];
  rightTitle: string;
  rightHeadline: string;
  rightDesc: string;
  rightCta: string;
  rightHref: string;
}) {
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "36px 40px",
        display: "grid",
        gridTemplateColumns: "1.15fr 1fr 1fr",
        gap: 40,
      }}
    >
      <div>
        <SectionLabel>{leftTitle}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {featured.map((f, i) => {
            const Icon = f.icon;
            return (
              <Link
                key={i}
                to={f.to}
                className="ed-mega-item"
                style={{ display: "flex", gap: 14, textDecoration: "none", alignItems: "flex-start" }}
              >
                <div
                  className="ed-mega-icon"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: ICON_BG,
                    color: ACCENT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background .15s ease, color .15s ease",
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <div
                    className="ed-mega-item-title"
                    style={{
                      color: NAVY,
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: f.desc ? 4 : 0,
                      transition: "color .15s ease",
                    }}
                  >
                    {f.label}
                  </div>
                  {f.desc && <div style={{ color: "#5A6B82", fontSize: 13, lineHeight: 1.45 }}>{f.desc}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>{middleTitle}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {list.map((l, i) => (
            <Link
              key={i}
              to={l.to}
              className="ed-mega-list-item"
              style={{
                display: "block",
                color: NAVY,
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 600,
                padding: "10px 0",
                transition: "color .15s ease",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ background: PANEL_BG, borderRadius: 12, padding: "24px 26px", marginLeft: -8 }}>
        <SectionLabel>{rightTitle}</SectionLabel>
        <Link
          to={rightHref}
          className="ed-mega-item"
          style={{ display: "flex", gap: 14, textDecoration: "none", alignItems: "flex-start" }}
        >
          <div
            className="ed-mega-icon"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#fff",
              color: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(12,35,64,0.08)",
              transition: "background .15s ease, color .15s ease",
            }}
          >
            <PlayCircle size={22} />
          </div>
          <div>
            <div
              className="ed-mega-item-title"
              style={{
                color: NAVY,
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "color .15s ease",
              }}
            >
              {rightHeadline} <ArrowUpRight size={14} />
            </div>
            <div style={{ color: "#5A6B82", fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>{rightDesc}</div>
            <span
              style={{
                display: "inline-block",
                background: ACCENT,
                color: "#fff",
                padding: "9px 16px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {rightCta}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          color: "#5A6B82",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          paddingBottom: 12,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const mobileLink: React.CSSProperties = {
  display: "block",
  padding: "12px 4px",
  color: NAVY,
  textDecoration: "none",
  fontSize: 15,
  fontWeight: 600,
  borderBottom: "1px solid #F1F5F9",
};

export default MarketingNav;
