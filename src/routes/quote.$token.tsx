import { createFileRoute } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { IconCircleCheck, IconLock } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/quote/$token")({
  head: () => ({
    meta: [
      { title: "Your driving lesson quote" },
      {
        name: "description",
        content:
          "View and accept your driving lesson quote, then pay securely by card or bank transfer.",
      },
      { property: "og:title", content: "Your driving lesson quote" },
      {
        property: "og:description",
        content:
          "View and accept your driving lesson quote, then pay securely by card or bank transfer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicQuotePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" as const };

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type Quote = {
  id: string;
  token: string;
  instructor_id: string;
  pupil_id?: string | null;
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

type Instructor = {
  phone: string | null;
  email: string | null;
  full_name: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_sort_code?: string | null;
  bank_account_number?: string | null;
};


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
        <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: tokens.navy, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: tokens.fontSize.md, color: "#6B7280" }}>{body}</div>
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

  // Deposit payment state (Square)
  const [payStatus, setPayStatus] = useState<"idle" | "creating" | "ready" | "error">("idle");
  const [payError, setPayError] = useState<string>("");
  const [payUrl, setPayUrl] = useState<string>("");
  const [noSquare, setNoSquare] = useState(false);


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
          .select("*")
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
    setNoSquare(false);
    try {
      const { data, error } = await supabase.functions.invoke("square-create-payment-link", {
        body: {
          instructor_id: quote.instructor_id,
          pupil_id: quote.pupil_id ?? null,
          lesson_id: null,
          amount_pence: amountPence,
          description: `Deposit for driving lessons — ${quote.recipient_name}`,
          metadata: {
            quote_id: quote.id,
            pupil_name: quote.recipient_name,
            pupil_email: quote.recipient_email || "",
            type: "quote_deposit",
          },
        },
      });
      if (error) throw error;
      const res = data as { no_square?: boolean; url?: string } | null;
      if (res?.no_square) {
        setNoSquare(true);
        setPayStatus("idle");
        return;
      }
      if (!res?.url) throw new Error("No payment link returned");
      setPayUrl(res.url);
      setPayStatus("ready");
    } catch (e: any) {
      console.error("[quote] square-create-payment-link failed:", e);
      setPayStatus("error");
      setPayError(e?.message || "Failed to start payment");
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
    ? { label: "Accepted", bg: "#EEF2F7", color: tokens.navy }
    : { label: "Awaiting response", bg: "#EEF2F7", color: tokens.navy };

  const depositAmount = Number(quote.deposit_amount || 0);
  const needsDeposit = accepted && depositAmount > 0 && !depositPaid;
  const depositDoneNow = false; // Square payment completes off-site; status refreshes on reload

  return (
    <div style={{ ...POPPINS, minHeight: "100vh", background: "#fff" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: tokens.navy, color: "#fff", padding: 20, textAlign: "center", paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <div style={{ fontWeight: tokens.fontWeight.bold, fontSize: 18 }}>EveryDriver</div>
          <div style={{ fontSize: tokens.fontSize.base, opacity: 0.85, marginTop: 4 }}>Your driving lesson quote</div>
        </div>

        <div style={{ margin: 16, padding: 24, background: "#fff", border: "0.5px solid #EEF2F7", borderRadius: 8}}>
          <div style={{ fontSize: 20, fontWeight: tokens.fontWeight.bold, color: tokens.navy, marginBottom: 16 }}>
            Quote for {quote.recipient_name}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: tokens.fontSize.md, color: tokens.navy }}>
            {quote.course_type && (
              <Row label="Course type" value={quote.course_type} />
            )}
            {quote.hours != null && (
              <Row label="Hours" value={`${quote.hours}h`} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
              <span style={{ color: "#6B7280" }}>Total price</span>
              <span style={{ fontSize: 24, fontWeight: tokens.fontWeight.bold, color: tokens.blue }}>£{Number(quote.price).toFixed(2)}</span>
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
            <div style={{ marginTop: 16, padding: 12, background: "#EFF6FF", borderRadius: 8, fontStyle: "italic", color: "#475569", fontSize: 14 }}>
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
              <IconCircleCheck size={72} color="#1877D6" stroke={2} />
              <div style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: tokens.navy }}>Quote accepted! 🎉</div>
              <div style={{ fontSize: tokens.fontSize.md, color: "#6B7280", maxWidth: 340 }}>
                {depositPaid && !depositDoneNow
                  ? "Your booking is confirmed. We'll be in touch shortly to arrange your lessons."
                  : depositDoneNow
                  ? "Deposit paid ✅ Your booking is confirmed."
                  : depositAmount > 0
                  ? "Your place is provisionally reserved. Pay your deposit now to confirm your booking."
                  : "We'll be in touch shortly to arrange your lessons."}
              </div>

              {depositAmount > 0 && depositPaid && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: tokens.canvas, color: tokens.navy, fontSize: tokens.fontSize.base, fontWeight: 700 }}>
                  <IconCircleCheck size={16} /> Deposit paid
                </span>
              )}

              {needsDeposit && (
                <div style={{ width: "100%", marginTop: 16, padding: 20, background: "#fff", border: "0.5px solid #EEF2F7", borderRadius: 8, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <IconLock size={18} color="#1877D6" />
                    <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: tokens.navy }}>Secure your booking</div>
                  </div>
                  <div style={{ fontSize: tokens.fontSize.base, color: "#6B7280", marginBottom: 12 }}>
                    Pay your £{depositAmount.toFixed(2)} deposit to confirm your lesson booking
                  </div>
                  <div style={{ fontSize: 36, fontWeight: tokens.fontWeight.bold, color: tokens.blue, lineHeight: 1, marginBottom: 16 }}>
                    £{depositAmount.toFixed(2)}
                  </div>

                  {payError && (
                    <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, fontSize: tokens.fontSize.base, marginBottom: 12 }}>
                      {payError}
                    </div>
                  )}

                  {noSquare && (
                    <div style={{ background: "#FFFBEB", color: "#B45309", padding: 12, borderRadius: 8, fontSize: tokens.fontSize.base, marginBottom: 12 }}>
                      Your instructor hasn't connected Square yet. Please pay by bank transfer or contact your instructor directly.
                      {(instructor?.bank_account_name || instructor?.bank_sort_code || instructor?.bank_account_number) && (
                        <div style={{ marginTop: 8, color: tokens.navy }}>
                          {instructor?.bank_name && <div>Bank: {instructor.bank_name}</div>}
                          {instructor?.bank_account_name && <div>Account name: {instructor.bank_account_name}</div>}
                          {instructor?.bank_sort_code && <div>Sort code: {instructor.bank_sort_code}</div>}
                          {instructor?.bank_account_number && <div>Account number: {instructor.bank_account_number}</div>}
                        </div>
                      )}
                    </div>
                  )}

                  {!payUrl ? (
                    <button
                      disabled={payStatus === "creating"}
                      onClick={startDepositPayment}
                      style={{
                        width: "100%", height: 48, background: tokens.blue, color: "#fff",
                        border: "none", borderRadius: 8, fontSize: 15, fontWeight: tokens.fontWeight.semibold,
                        fontFamily: "Poppins, sans-serif", cursor: "pointer",
                        opacity: payStatus === "creating" ? 0.6 : 1,
                      }}
                    >
                      {payStatus === "creating" ? "Loading…" : "Pay deposit now →"}
                    </button>
                  ) : (
                    <div>
                      <a
                        href={payUrl}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: "100%", height: 48, background: tokens.blue, color: "#fff",
                          borderRadius: 8, fontSize: 15, fontWeight: tokens.fontWeight.semibold, textDecoration: "none",
                        }}
                      >
                        Pay now
                      </a>
                      <div style={{ textAlign: "center", color: tokens.textMuted, fontSize: tokens.fontSize.base, margin: "16px 0 8px" }}>— or scan to pay —</div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <img
                          src={`https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(payUrl)}&choe=UTF-8`}
                          alt="QR code to pay your deposit"
                          width={250}
                          height={250}
                          style={{ borderRadius: 8}}
                        />
                      </div>
                      <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 12 }}>
                        Secured by Square
                      </p>
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
                      height: 52, width: "100%", borderRadius: 8, background: tokens.blue, color: "#fff",
                      fontWeight: tokens.fontWeight.semibold, fontSize: 15, textDecoration: "none",
                    }}
                  >
                    Book your first lesson →
                  </a>
                  <a href="mailto:info@everydriver.co.uk" style={{ marginTop: 4, color: tokens.blue, fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, textDecoration: "none" }}>
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
                height: 52, borderRadius: 8, border: "none",
                background: tokens.blue, color: "#fff", fontWeight: tokens.fontWeight.semibold, fontSize: 15,
                fontFamily: "Poppins, sans-serif", cursor: "pointer", opacity: accepting ? 0.6 : 1,
              }}
            >
              {accepting ? "Accepting…" : "Accept this quote →"}
            </button>
          )}

          <button
            onClick={askQuestion}
            style={{
              height: 48, borderRadius: 8, background: "#fff",
              border: "1px solid #0B1F3A", color: tokens.navy,
              fontWeight: tokens.fontWeight.semibold, fontSize: tokens.fontSize.md, fontFamily: "Poppins, sans-serif", cursor: "pointer",
            }}
          >
            I have questions
          </button>
        </div>

        <div style={{ padding: "16px 16px 32px", textAlign: "center", fontSize: 12, color: "#6B7280" }}>
          Powered by{" "}
          <a href="https://everydriver.co.uk" style={{ color: tokens.blue, textDecoration: "none", fontWeight: 600 }}>
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
