import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/quote/$token")({
  component: PublicQuotePage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" as const };

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
const RYFT_PUBLIC_KEY =
  "pk_sandbox_QpmgBnWSyZXGthN4EtZy6XIXYu+oRRkEUeceUFKLrXS5zmRA7XWBrkAdD8E6FgTn";

declare global {
  interface Window {
    Ryft?: any;
  }
}

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
  deposit_paid: boolean | null;
  deposit_paid_at: string | null;
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
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0B1F3A", marginBottom: 8 }}>{title}</div>
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
  const [depositPaid, setDepositPaid] = useState(false);

  // Deposit payment state
  const [payStatus, setPayStatus] = useState<"idle" | "creating" | "ready" | "paying" | "paid" | "error">("idle");
  const [payError, setPayError] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const ryftInitedRef = useRef(false);

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
      console.log("[quote] loaded:", q);
      console.log("[quote] deposit_amount:", q?.deposit_amount, "deposit_paid:", q?.deposit_paid);
      setQuote(q);
      setAccepted(q.status === "accepted");
      setDepositPaid(!!q.deposit_paid);

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

  async function startDepositPayment() {
    if (!quote || !quote.deposit_amount || quote.deposit_amount <= 0) return;
    const amountPence = Math.max(3, Math.round(Number(quote.deposit_amount) * 100));
    setPayStatus("creating");
    setPayError("");
    try {
      console.log("[quote] create-ryft-payment request:", { amountPence, quote_id: quote.id });
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-ryft-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          amount: amountPence,
          currency: "GBP",
          description: `Deposit for driving lessons — ${quote.recipient_name}`,
          metadata: {
            quote_id: quote.id,
            instructor_id: quote.instructor_id,
            pupil_name: quote.recipient_name,
            pupil_email: quote.recipient_email || "",
            type: "quote_deposit",
          },
        }),
      });
      const json = await res.json();
      console.log("[quote] create-ryft-payment response:", res.status, json);
      if (!res.ok) throw new Error(json?.error || json?.message || `Failed to create payment (${res.status})`);
      if (!json.clientSecret) throw new Error("No clientSecret returned");
      setClientSecret(json.clientSecret);
    } catch (e: any) {
      console.error("[quote] create-ryft-payment failed:", e);
      setPayStatus("error");
      setPayError(e?.message || "Failed to start payment");
    }
  }

  // Initialise Ryft once we have a clientSecret
  useEffect(() => {
    if (!clientSecret || !quote) return;
    if (ryftInitedRef.current) return;
    ryftInitedRef.current = true;

    const SDK_URL = "https://embedded.ryftpay.com/v2/ryft.min.js";
    const existing = document.querySelector(`script[src="${SDK_URL}"]`) as HTMLScriptElement | null;

    const onApproved = async () => {
      setPayStatus("paid");
      setDepositPaid(true);
      try {
        await supabase
          .from("quotes")
          .update({ deposit_paid: true, deposit_paid_at: new Date().toISOString() })
          .eq("token", token);
      } catch (err) {
        console.error("[quote] mark deposit paid failed:", err);
      }
      try {
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
            title: "Deposit received! 💰",
            body: `${quote.recipient_name} paid £${Number(quote.deposit_amount).toFixed(2)} deposit`,
            type: "payment",
            read: false,
            reference_id: quote.id,
            reference_type: "quote",
          }),
        });
      } catch (err) {
        console.error("[quote] notify deposit failed:", err);
      }
    };

    const init = () => {
      try {
        if (!window.Ryft) throw new Error("Ryft SDK not loaded");
        window.Ryft.init({
          publicKey: RYFT_PUBLIC_KEY,
          clientSecret,
          googlePay: { merchantName: "EveryDriver", merchantCountryCode: "GB" },
          applePay: { merchantName: "EveryDriver", merchantCountryCode: "GB" },
        });
        try { window.Ryft?.googlePay?.mount?.("#google-pay-container"); } catch (e) { console.warn("Google Pay unavailable:", e); }
        try { window.Ryft?.applePay?.mount?.("#apple-pay-container"); } catch (e) { console.warn("Apple Pay unavailable:", e); }
        window.Ryft.addEventHandler("paymentSuccess", (evt: any) => {
          console.log("[quote] Ryft paymentSuccess:", evt);
          const status = evt?.paymentSession?.status;
          if (!status || status === "Approved" || status === "Captured") onApproved();
        });
        window.Ryft.addEventHandler("paymentError", (e: any) => {
          console.error("[quote] Ryft paymentError:", e);
          const msg =
            e?.error?.message ||
            e?.errors?.[0]?.message ||
            e?.message ||
            (typeof e === "string" ? e : "") ||
            "Payment failed. Please try again.";
          setPayStatus("error");
          setPayError(msg);
        });
        setPayStatus("ready");
      } catch (e: any) {
        setPayStatus("error");
        setPayError(e?.message || "Failed to initialise payment");
      }
    };

    if (existing && window.Ryft) {
      init();
    } else {
      const s = existing || document.createElement("script");
      if (!existing) {
        s.src = SDK_URL;
        s.async = true;
        document.body.appendChild(s);
      }
      s.addEventListener("load", init, { once: true });
      s.addEventListener("error", () => {
        setPayStatus("error");
        setPayError("Could not load payment SDK");
      }, { once: true });
    }
  }, [clientSecret, quote, token]);

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

  const depositAmount = Number(quote.deposit_amount || 0);
  const needsDeposit = accepted && depositAmount > 0 && !depositPaid;
  const depositDoneNow = payStatus === "paid";

  return (
    <div style={{ ...POPPINS, minHeight: "100vh", background: "#fff" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: "#0B1F3A", color: "#fff", padding: 20, textAlign: "center", paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>EveryDriver</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Your driving lesson quote</div>
        </div>

        <div style={{ margin: 16, padding: 24, background: "#fff", border: "0.5px solid #EEF2F7", borderRadius: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0B1F3A", marginBottom: 16 }}>
            Quote for {quote.recipient_name}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "#0B1F3A" }}>
            {quote.course_type && (
              <Row label="Course type" value={quote.course_type} />
            )}
            {quote.hours != null && (
              <Row label="Hours" value={`${quote.hours}h`} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
              <span style={{ color: "#6B7280" }}>Total price</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#1877D6" }}>£{Number(quote.price).toFixed(2)}</span>
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
            <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
              <CheckCircle2 size={72} color="#16A34A" strokeWidth={2} />
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0B1F3A" }}>Quote accepted! 🎉</div>
              <div style={{ fontSize: 14, color: "#6B7280", maxWidth: 340 }}>
                {depositPaid && !depositDoneNow
                  ? "Your booking is confirmed. We'll be in touch shortly to arrange your lessons."
                  : depositDoneNow
                  ? "Deposit paid ✅ Your booking is confirmed."
                  : depositAmount > 0
                  ? "Your place is provisionally reserved. Pay your deposit now to confirm your booking."
                  : "We'll be in touch shortly to arrange your lessons."}
              </div>

              {depositAmount > 0 && depositPaid && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "#DCFCE7", color: "#15803D", fontSize: 13, fontWeight: 700 }}>
                  <CheckCircle2 size={16} /> Deposit paid
                </span>
              )}

              {needsDeposit && (
                <div style={{ width: "100%", marginTop: 16, padding: 20, background: "#fff", border: "0.5px solid #EEF2F7", borderRadius: 12, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Lock size={18} color="#1877D6" />
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A" }}>Secure your booking</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>
                    Pay your £{depositAmount.toFixed(2)} deposit to confirm your lesson booking
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "#1877D6", lineHeight: 1, marginBottom: 16 }}>
                    £{depositAmount.toFixed(2)}
                  </div>

                  {payError && (
                    <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                      {payError}
                    </div>
                  )}

                  {!clientSecret ? (
                    <button
                      disabled={payStatus === "creating"}
                      onClick={startDepositPayment}
                      style={{
                        width: "100%", height: 48, background: "#1877D6", color: "#fff",
                        border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600,
                        fontFamily: "Inter, sans-serif", cursor: "pointer",
                        opacity: payStatus === "creating" ? 0.6 : 1,
                      }}
                    >
                      {payStatus === "creating" ? "Loading…" : "Pay deposit now →"}
                    </button>
                  ) : (
                    <div>
                      <div id="google-pay-container" style={{ marginBottom: 12 }} />
                      <div id="apple-pay-container" style={{ marginBottom: 12 }} />
                      <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, marginBottom: 12 }}>— or pay by card —</div>
                      <div className="Ryft--paysection">
                        <form
                          id="ryft-pay-form"
                          className="Ryft--payform"
                          onSubmit={(e) => {
                            e.preventDefault();
                            setPayError("");
                            setPayStatus("paying");
                            try {
                              window.Ryft?.attemptPayment?.();
                            } catch (err: any) {
                              setPayStatus("error");
                              setPayError(err?.message || "Payment failed");
                            }
                          }}
                        >
                          <button
                            id="pay-btn"
                            type="submit"
                            disabled={payStatus === "paying"}
                            style={{
                              width: "100%", background: "#1877D6", color: "#fff",
                              border: 0, borderRadius: 10, padding: "14px 16px",
                              fontSize: 16, fontWeight: 600, cursor: "pointer",
                              opacity: payStatus === "paying" ? 0.6 : 1,
                            }}
                          >
                            {payStatus === "paying" ? "Processing…" : `Pay £${depositAmount.toFixed(2)}`}
                          </button>
                        </form>
                      </div>
                      {payStatus === "ready" || payStatus === "creating" ? (
                        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 12 }}>
                          Secured by Ryft
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {(!needsDeposit || depositDoneNow) && (
                <>
                  <a
                    href="https://everydriver.co.uk/courses"
                    style={{
                      marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      height: 52, width: "100%", borderRadius: 12, background: "#16A34A", color: "#fff",
                      fontWeight: 600, fontSize: 15, textDecoration: "none",
                    }}
                  >
                    Book your first lesson →
                  </a>
                  <a href="mailto:info@everydriver.co.uk" style={{ marginTop: 4, color: "#1877D6", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                    Contact us
                  </a>
                </>
              )}
            </div>
          ) : (
            <button
              disabled={accepting}
              onClick={accept}
              style={{
                height: 52, borderRadius: 12, border: "none",
                background: "#16A34A", color: "#fff", fontWeight: 600, fontSize: 15,
                fontFamily: "Inter, sans-serif", cursor: "pointer", opacity: accepting ? 0.6 : 1,
              }}
            >
              {accepting ? "Accepting…" : "Accept this quote →"}
            </button>
          )}

          <button
            onClick={askQuestion}
            style={{
              height: 48, borderRadius: 12, background: "#fff",
              border: "1px solid #0B1F3A", color: "#0B1F3A",
              fontWeight: 600, fontSize: 14, fontFamily: "Inter, sans-serif", cursor: "pointer",
            }}
          >
            I have questions
          </button>
        </div>

        <div style={{ padding: "16px 16px 32px", textAlign: "center", fontSize: 12, color: "#6B7280" }}>
          Powered by{" "}
          <a href="https://everydriver.co.uk" style={{ color: "#1877D6", textDecoration: "none", fontWeight: 600 }}>
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
