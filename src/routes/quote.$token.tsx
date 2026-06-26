import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/quote/$token")({
  component: PublicQuotePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" as const };

type Quote = {
  id: string;
  token: string;
  instructor_id: string;
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  course_type: string | null;
  hours: number | null;
  price: number;
  deposit_amount: number | null;
  personal_message: string | null;
  valid_until: string | null;
  status: string;
  viewed_at: string | null;
  accepted_at: string | null;
};

type Instructor = { phone: string | null; email: string | null; full_name: string | null };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function isExpired(q: Quote): boolean {
  if (q.status === "expired") return true;
  if (!q.valid_until) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const until = new Date(q.valid_until); until.setHours(0, 0, 0, 0);
  return until.getTime() < today.getTime();
}

function MessagePage({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ ...POPPINS, minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0F2044", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: "#6B7280" }}>{body}</div>
      </div>
    </div>
  );
}

function PublicQuotePage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const q = data as Quote;
      setQuote(q);
      setAccepted(q.status === "accepted");

      if (!q.viewed_at) {
        await supabase
          .from("quotes")
          .update({ viewed_at: new Date().toISOString(), status: q.status === "pending" || q.status === "sent" || q.status === "draft" ? "viewed" : q.status })
          .eq("token", token);
      }

      if (q.instructor_id) {
        const { data: ins } = await supabase
          .from("instructors")
          .select("phone, email, full_name")
          .eq("id", q.instructor_id)
          .maybeSingle();
        if (ins) setInstructor(ins as Instructor);
      }
      setLoading(false);
    })();
  }, [token]);

  async function accept() {
    if (!quote) return;
    setAccepting(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("token", token);
      if (error) throw error;

      // Notify instructor
      try {
        const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
        await fetch(`${SUPABASE_URL}/rest/v1/instructor_notifications`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            instructor_id: quote.instructor_id,
            title: "Quote accepted! 🎉",
            body: `${quote.recipient_name} has accepted their quote for £${Number(quote.price).toFixed(2)}`,
            type: "quote_accepted",
            read: false,
            reference_id: quote.id,
            reference_type: "quote",
          }),
        });
      } catch (notifyErr) {
        console.error("[quote] notify instructor failed:", notifyErr);
      }

      setAccepted(true);
    } catch (e: any) {
      alert("Failed to accept: " + (e?.message ?? "unknown"));
    } finally {
      setAccepting(false);
    }
  }

  function askQuestion() {
    if (!instructor) return;
    const subject = `Question about my quote`;
    const body = `Hi${instructor.full_name ? " " + instructor.full_name : ""}, I have a question about my quote.`;
    if (instructor.phone) window.location.href = `sms:${instructor.phone}?body=${encodeURIComponent(body)}`;
    else if (instructor.email) window.location.href = `mailto:${instructor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    else alert("No contact details available");
  }

  if (loading) return <MessagePage title="Loading…" body="Fetching your quote." />;
  if (notFound || !quote) return <MessagePage title="Quote not found" body="This quote link is invalid or has expired." />;
  if (!accepted && isExpired(quote)) return <MessagePage title="This quote has expired" body="Please contact your instructor for a new quote." />;

  const badge = accepted
    ? { label: "Accepted", bg: "#DCFCE7", color: "#15803D" }
    : { label: "Awaiting response", bg: "#FEF3C7", color: "#92400E" };

  return (
    <div style={{ ...POPPINS, minHeight: "100vh", background: "#fff" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: "#0F2044", color: "#fff", padding: 20, textAlign: "center", paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>EveryDriver</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Your driving lesson quote</div>
        </div>

        <div style={{ margin: 16, padding: 24, background: "#fff", border: "0.5px solid #E2E6ED", borderRadius: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0F2044", marginBottom: 16 }}>
            Quote for {quote.recipient_name}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "#0F2044" }}>
            {quote.course_type && (
              <Row label="Course type" value={quote.course_type} />
            )}
            {quote.hours != null && (
              <Row label="Hours" value={`${quote.hours}h`} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
              <span style={{ color: "#6B7280" }}>Total price</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#1A52A0" }}>£{Number(quote.price).toFixed(2)}</span>
            </div>
            {quote.deposit_amount != null && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#6B7280", fontSize: 13 }}>
                <span>Deposit to secure</span>
                <span>£{Number(quote.deposit_amount).toFixed(2)}</span>
              </div>
            )}
            <Row label="Valid until" value={formatDate(quote.valid_until)} />
          </div>

          {quote.personal_message && (
            <div style={{ marginTop: 16, padding: 12, background: "#EFF6FF", borderRadius: 10, fontStyle: "italic", color: "#475569", fontSize: 14 }}>
              {quote.personal_message}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 600 }}>
              {badge.label}
            </span>
          </div>
        </div>

        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {accepted ? (
            <>
              <div style={{ padding: 16, background: "#F0FDF4", border: "0.5px solid #BBF7D0", borderRadius: 12, color: "#15803D", textAlign: "center", fontSize: 14 }}>
                Quote accepted! We'll be in touch to arrange your lessons.
              </div>
              <a href="https://everydriver.co.uk/bespoke" style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: 52, borderRadius: 12, background: "#0F2044", color: "#fff",
                fontWeight: 600, fontSize: 15, textDecoration: "none",
              }}>Book now →</a>
            </>
          ) : (
            <button
              disabled={accepting}
              onClick={accept}
              style={{
                height: 52, borderRadius: 12, border: "none",
                background: "#16A34A", color: "#fff", fontWeight: 600, fontSize: 15,
                fontFamily: "Poppins, sans-serif", cursor: "pointer", opacity: accepting ? 0.6 : 1,
              }}
            >
              {accepting ? "Accepting…" : "Accept this quote →"}
            </button>
          )}

          <button
            onClick={askQuestion}
            style={{
              height: 48, borderRadius: 12, background: "#fff",
              border: "1px solid #0F2044", color: "#0F2044",
              fontWeight: 600, fontSize: 14, fontFamily: "Poppins, sans-serif", cursor: "pointer",
            }}
          >
            I have questions
          </button>
        </div>

        <div style={{ padding: "16px 16px 32px", textAlign: "center", fontSize: 12, color: "#6B7280" }}>
          Powered by{" "}
          <a href="https://everydriver.co.uk" style={{ color: "#1A52A0", textDecoration: "none", fontWeight: 600 }}>
            EveryDriver
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
