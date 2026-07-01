import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Clock } from "lucide-react";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";


export const Route = createFileRoute("/_marketing/contact")({
  head: () => ({
    meta: [
      { title: "Contact — DSM by EveryDriver" },
      {
        name: "description",
        content:
          "Get in touch with the DSM team. Questions, feedback, partnerships — we respond within 24 hours.",
      },
      { property: "og:title", content: "Contact DSM" },
      {
        property: "og:description",
        content:
          "Reach the DSM team by email or through our contact form. Based in Winchester, serving instructors across the UK.",
      },
    ],
  }),
  component: ContactPage,
});

type Status = "idle" | "sending" | "success" | "error";

const SUBJECTS = [
  "General enquiry",
  "I'm an instructor",
  "I'm a learner",
  "Press",
  "Partnership",
  "Feedback",
  "Other",
];

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const payload = {
      name: name.trim(),
      email: email.trim(),
      subject,
      message: message.trim(),
    };

    console.log("[contact] submitting:", { name, email, subject, message });

    const url = `${SUPABASE_URL}/rest/v1/contact_submissions`;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };
    const body = JSON.stringify(payload);

    console.log("[contact] fetch request:", { url, headers, body });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
      });

      const responseData = await res.text();
      console.log("[contact] fetch response:", res.status, responseData);

      if (!res.ok) {
        throw new Error(
          responseData || `Request failed with status ${res.status}`,
        );
      }

      const RESEND_KEY = "@secret:RESEND_API_KEY ";

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "DSM Website <info@everydriver.co.uk>",
            to: "info@everydriver.co.uk",
            reply_to: email,
            subject: `New contact form submission — ${subject}`,
            html: `
              <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="border-bottom: 2px solid #00B5A5; padding-bottom: 12px; margin-bottom: 24px;">
                  <h1 style="color: #1B2B4B; margin: 0 0 4px;">New contact form submission</h1>
                  <p style="color: #718096; margin: 0; font-size: 14px;">drivingschoolmanager.co.uk</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                  <tr><td style="padding: 8px 0; color: #718096; width: 100px;"><strong>Name:</strong></td><td style="color: #1B2B4B;">${name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #718096;"><strong>Email:</strong></td><td style="color: #1B2B4B;">${email}</td></tr>
                  <tr><td style="padding: 8px 0; color: #718096;"><strong>Subject:</strong></td><td style="color: #1B2B4B;">${subject}</td></tr>
                </table>
                <div style="background: #F7FAFC; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <p style="color: #1B2B4B; margin: 0; white-space: pre-wrap;">${message}</p>
                </div>
                <p style="color: #718096; font-size: 13px;">Reply directly to this email to respond to ${name}.</p>
              </div>
            `,
          }),
        });
      } catch (notifyErr) {
        console.error("[contact] resend notification failed:", notifyErr);
      }

      setStatus("success");
      setName("");
      setEmail("");
      setSubject(SUBJECTS[0]);
      setMessage("");
    } catch (err) {
      console.error("[contact] error:", err);
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again or email info@everydriver.co.uk.",
      );
    }
  }


  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* HERO */}
      <section className="bg-[#F7FAFC] py-16 px-6 text-center">
        <span className="inline-block bg-[#E6F7F6] text-[#00B5A5] text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Get in touch
        </span>
        <h1 className="text-4xl font-black text-[#1B2B4B] mb-4">
          We'd love to hear from you
        </h1>
        <p className="text-[#718096] text-lg max-w-2xl mx-auto">
          Whether you have a question, feedback or just want to say hello — we're here.
        </p>
      </section>

      {/* MAIN */}
      <section className="bg-white py-16 px-6">
        <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto">
          {/* LEFT — FORM */}
          <div>
            <h2 className="text-2xl font-black text-[#1B2B4B] mb-8">
              Send us a message
            </h2>

            {status === "success" ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 text-green-800 p-6">
                <p className="font-semibold mb-1">Message sent!</p>
                <p className="text-sm">We'll be in touch within 24 hours.</p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-4 text-sm font-semibold text-[#00B5A5] hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[#1B2B4B] mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1B2B4B] focus:outline-none focus:border-[#00B5A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2B4B] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1B2B4B] focus:outline-none focus:border-[#00B5A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2B4B] mb-2">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1B2B4B] bg-white focus:outline-none focus:border-[#00B5A5]"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2B4B] mb-2">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1B2B4B] focus:outline-none focus:border-[#00B5A5]"
                  />
                </div>

                {status === "error" && (
                  <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="bg-[#00B5A5] text-white font-semibold px-8 py-3 rounded-xl w-full hover:opacity-90 disabled:opacity-60 transition"
                >
                  {status === "sending" ? "Sending…" : "Send message →"}
                </button>
              </form>
            )}
          </div>

          {/* RIGHT — DETAILS */}
          <div>
            <h2 className="text-2xl font-black text-[#1B2B4B] mb-8">
              Other ways to reach us
            </h2>

            <div className="border border-gray-100 rounded-2xl p-6 mb-4 flex gap-4">
              <Mail className="text-[#00B5A5] shrink-0" size={24} />
              <div>
                <p className="font-bold text-[#1B2B4B] mb-1">Email</p>
                <a
                  href="mailto:info@everydriver.co.uk"
                  className="text-[#00B5A5] font-medium"
                >
                  info@everydriver.co.uk
                </a>
                <p className="text-[#718096] text-sm mt-1">
                  We respond within 24 hours
                </p>
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl p-6 mb-4 flex gap-4">
              <MapPin className="text-[#00B5A5] shrink-0" size={24} />
              <div>
                <p className="font-bold text-[#1B2B4B] mb-1">Based in</p>
                <p className="text-[#1B2B4B]">Winchester, Hampshire</p>
                <p className="text-[#718096] text-sm mt-1">
                  Serving instructors across the UK
                </p>
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl p-6 mb-6 flex gap-4">
              <Clock className="text-[#00B5A5] shrink-0" size={24} />
              <div>
                <p className="font-bold text-[#1B2B4B] mb-1">Support hours</p>
                <p className="text-[#1B2B4B]">Monday – Friday, 9am – 5pm</p>
                <p className="text-[#718096] text-sm mt-1">
                  Emergency support for Plus & Max subscribers
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-bold text-[#1B2B4B] mb-3">Follow us</p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://everydriver.co.uk"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00B5A5] font-medium hover:underline"
                >
                  EveryDriver →
                </a>
                <a
                  href="https://drivingschoolmanager.co.uk"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00B5A5] font-medium hover:underline"
                >
                  Driving School Manager →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ TEASER */}
      <section className="bg-[#F7FAFC] py-16 px-6 text-center">
        <h2 className="text-3xl font-black text-[#1B2B4B] mb-4">
          Looking for quick answers?
        </h2>
        <p className="text-[#718096] mb-8 max-w-xl mx-auto">
          Check our how it works page for answers to common questions.
        </p>
        <Link
          to="/how-it-works"
          className="inline-block border-2 border-[#1B2B4B] text-[#1B2B4B] font-semibold px-8 py-4 rounded-xl hover:bg-[#1B2B4B] hover:text-white transition"
        >
          View FAQ →
        </Link>
      </section>
    </div>
  );
}
