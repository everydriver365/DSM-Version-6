import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Section, Eyebrow, H1, Lead } from "../components/marketing/ui";

export const Route = createFileRoute("/_marketing/contact")({
  head: () => ({
    meta: [
      { title: "Contact — DSM by EveryDriver" },
      { name: "description", content: "Get in touch with the DSM team. Based in Winchester, Hampshire. We respond within 24 hours." },
      { property: "og:title", content: "Contact DSM" },
      { property: "og:description", content: "We respond within 24 hours. Email info@everydriver.co.uk." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in name, email and message.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.from("contact_submissions").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim(),
      source: "dsm-marketing",
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    borderRadius: 10,
    border: "1px solid #CBD5E1",
    background: "#fff",
    color: "#0F172A",
    outline: "none",
    fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
    marginBottom: 6,
    display: "block",
  };

  return (
    <>
      <Section padY={72}>
        <Eyebrow>Contact</Eyebrow>
        <H1>Get in touch.</H1>
        <Lead>Questions, feedback or want a demo? We respond within 24 hours.</Lead>
      </Section>

      <Section padY={16}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 40 }} className="dsm-contact-grid">
          <div
            style={{
              background: "#fff",
              border: "1px solid #E6E8EE",
              borderRadius: 20,
              padding: 28,
            }}
          >
            {done ? (
              <div style={{ padding: "40px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#0B1530" }}>Thanks!</h2>
                <p style={{ marginTop: 8, color: "#475569" }}>We'll be in touch within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 130, resize: "vertical" }}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                {error && <div style={{ color: "#DC2626", fontSize: 13 }}>{error}</div>}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "13px 22px",
                    borderRadius: 12,
                    background: "#00B5A5",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 15,
                    border: "none",
                    cursor: submitting ? "default" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    boxShadow: "0 8px 20px rgba(0,181,165,0.28)",
                  }}
                >
                  {submitting ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ContactRow label="Email" value="info@everydriver.co.uk" href="mailto:info@everydriver.co.uk" />
            <ContactRow label="Based in" value="Winchester, Hampshire" />
            <ContactRow label="Response time" value="Within 24 hours" />
            <div style={{ height: 1, background: "#E2E8F0", margin: "4px 0" }} />
            <ContactRow label="Website" value="EveryDriver.co.uk" href="https://everydriver.co.uk" />
            <ContactRow label="Privacy" value="Privacy Policy" href="https://everydriver.co.uk/privacy" />
            <ContactRow label="Terms" value="Terms of service" href="https://everydriver.co.uk/terms" />
          </div>
        </div>
        <style>{`@media (max-width: 820px){.dsm-contact-grid{grid-template-columns:1fr !important;}}`}</style>
      </Section>
    </>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>
        {label}
      </div>
      {href ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          style={{ color: "#0F2044", fontSize: 16, fontWeight: 600, textDecoration: "none" }}
        >
          {value}
        </a>
      ) : (
        <div style={{ color: "#0F172A", fontSize: 16, fontWeight: 600 }}>{value}</div>
      )}
    </div>
  );
}
