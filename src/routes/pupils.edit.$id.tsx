import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../components/dsm/Input";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/edit/$id")({
  head: () => ({
    meta: [{ title: "Edit pupil — DSM by EveryDriver" }],
  }),
  component: EditPupilPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const STATUSES: { label: string; value: string }[] = [
  { label: "Active", value: "active" },
  { label: "Passed", value: "passed" },
  { label: "Inactive", value: "inactive" },
  { label: "On hold", value: "on_hold" },
  { label: "Cancelled", value: "cancelled" },
];

const LEAD_SOURCES = [
  "Referral",
  "EveryDriver",
  "National Intensive",
  "Online",
  "Walk-in / Local",
  "Social media",
  "Driving school",
  "Returning pupil",
  "Other",
];

const fieldBorder: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  borderWidth: "0.5px",
  borderStyle: "solid",
  borderColor: "#EEF2F7",
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1 text-[12px] font-medium text-[#6B7280]"
      style={POPPINS}
    >
      {children}
    </label>
  );
}

function EditPupilPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");
  const [testDate, setTestDate] = useState("");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [leadSourceDetail, setLeadSourceDetail] = useState("");
  const [blockToggle, setBlockToggle] = useState(false);
  const [prepaidAmount, setPrepaidAmount] = useState("");
  const [prepaidHours, setPrepaidHours] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [niAmountTotal, setNiAmountTotal] = useState("");
  const [niPayer, setNiPayer] = useState("pupil");
  const [niAmountPaid, setNiAmountPaid] = useState("");
  const [niPaymentDate, setNiPaymentDate] = useState("");
  const [niReference, setNiReference] = useState("");
  const [testTime, setTestTime] = useState("");
  const [testCentre, setTestCentre] = useState("");
  const [wantsSwap, setWantsSwap] = useState(false);
  const [swapEarliestDate, setSwapEarliestDate] = useState("");
  const [swapLatestDate, setSwapLatestDate] = useState("");
  const [swapPreferredTime, setSwapPreferredTime] = useState("any");
  const [swapCentre1, setSwapCentre1] = useState("");
  const [swapCentre2, setSwapCentre2] = useState("");
  const [swapCentre3, setSwapCentre3] = useState("");
  const originalPrepaidAmount = useRef<number>(0);
  const originalStatus = useRef<string>("active");
  const [inactiveConfirmOpen, setInactiveConfirmOpen] = useState(false);
  const [hoursCompleted, setHoursCompleted] = useState<number>(0);
  const [instructorRate, setInstructorRate] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("lessons")
      .select("duration_minutes")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .in("status", ["confirmed", "completed"])
      .then(({ data }) => {
        const mins = (data ?? []).reduce(
          (s: number, r: { duration_minutes: number | null }) =>
            s + Number(r.duration_minutes ?? 0),
          0,
        );
        setHoursCompleted(mins / 60);
      });
    supabase.auth.getUser().then(({ data: u }) => {
      const uid = u?.user?.id;
      if (!uid) return;
      supabase
        .from("instructors")
        .select("hourly_rate")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.hourly_rate != null) setInstructorRate(Number(data.hourly_rate));
        });
    });
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.error("[edit-pupil] auth error", authErr);
        setLoading(false);
        return;
      }
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("pupils")
        .select("first_name, last_name, phone, email, status, test_date, notes, address, lead_source, lead_source_detail, prepaid_hours, prepaid_amount_paid, account_balance, ni_amount_total, ni_payer, ni_amount_paid, ni_payment_date, ni_reference, test_time, test_centre, wants_swap, swap_earliest_date, swap_latest_date, swap_preferred_time, swap_centre_1, swap_centre_2, swap_centre_3")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (fetchErr) {
        console.error("[edit-pupil] fetch error", fetchErr);
        setError(fetchErr.message);
      } else if (data) {
        const p = data as {
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          email: string | null;
          status: string | null;
          test_date: string | null;
          notes: string | null;
          address: string | null;
          lead_source: string | null;
          lead_source_detail: string | null;
          prepaid_hours: number | null;
          prepaid_amount_paid: number | null;
          account_balance: number | null;
          ni_amount_total: number | null;
          ni_payer: string | null;
          ni_amount_paid: number | null;
          ni_payment_date: string | null;
          ni_reference: string | null;
          test_time: string | null;
          test_centre: string | null;
          wants_swap: boolean | null;
          swap_earliest_date: string | null;
          swap_latest_date: string | null;
          swap_preferred_time: string | null;
          swap_centre_1: string | null;
          swap_centre_2: string | null;
          swap_centre_3: string | null;
        };
        setFirstName(p.first_name ?? "");
        setLastName(p.last_name ?? "");
        setPhone(p.phone ?? "");
        setEmail(p.email ?? "");
        setStatus(p.status ?? "active");
        originalStatus.current = p.status ?? "active";
        setTestDate(p.test_date ?? "");
        setNotes(p.notes ?? "");
        setAddress(p.address ?? "");
        setLeadSource(p.lead_source ?? "");
        setLeadSourceDetail(p.lead_source_detail ?? "");
        const hasBlock =
          (p.prepaid_hours ?? 0) > 0 || (p.prepaid_amount_paid ?? 0) > 0;
        setBlockToggle(hasBlock);
        setPrepaidHours(p.prepaid_hours != null ? String(p.prepaid_hours) : "");
        setPrepaidAmount(p.prepaid_amount_paid != null ? String(p.prepaid_amount_paid) : "");
        originalPrepaidAmount.current = p.prepaid_amount_paid ?? 0;
        setNiAmountTotal(p.ni_amount_total != null ? String(p.ni_amount_total) : "");
        setNiPayer(p.ni_payer ?? "pupil");
        setNiAmountPaid(p.ni_amount_paid != null ? String(p.ni_amount_paid) : "");
        setNiPaymentDate(p.ni_payment_date ?? "");
        setNiReference(p.ni_reference ?? "");
        setTestTime(p.test_time ? p.test_time.slice(0, 5) : "");
        setTestCentre(p.test_centre ?? "");
        setWantsSwap(Boolean(p.wants_swap));
        setSwapEarliestDate(p.swap_earliest_date ?? "");
        setSwapLatestDate(p.swap_latest_date ?? "");
        setSwapPreferredTime(p.swap_preferred_time ?? "any");
        setSwapCentre1(p.swap_centre_1 ?? "");
        setSwapCentre2(p.swap_centre_2 ?? "");
        setSwapCentre3(p.swap_centre_3 ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleSave() {
    if (saving) return;
    if (status === "inactive" && originalStatus.current !== "inactive") {
      setInactiveConfirmOpen(true);
      return;
    }
    await performSave();
  }

  async function performSave() {
    setInactiveConfirmOpen(false);
    setSaving(true);
    setError(null);

    const name = `${firstName.trim()} ${lastName.trim()}`.trim();

    const blockOn = blockToggle || leadSource === "National Intensive";
    const aNum = parseFloat(prepaidAmount);
    const hNum = parseFloat(prepaidHours);
    const hasBlock =
      blockOn && Number.isFinite(aNum) && aNum > 0 && Number.isFinite(hNum) && hNum > 0;

    const updatePayload: Record<string, unknown> = {
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      name: name || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      status: status || "active",
      test_date: testDate || null,
      notes: notes.trim() || null,
      address: address.trim() || null,
      lead_source: leadSource || null,
      lead_source_detail:
        (leadSource === "Referral" || leadSource === "Other") && leadSourceDetail.trim()
          ? leadSourceDetail.trim()
          : null,
      prepaid_hours:
        hasBlock
          ? hNum
          : leadSource === "National Intensive" && Number.isFinite(hNum) && hNum > 0
            ? hNum
            : null,
      prepaid_amount_paid: hasBlock ? aNum : null,
      account_balance: hasBlock ? aNum : null,
      ni_amount_total:
        leadSource === "National Intensive" && niAmountTotal.trim() !== ""
          ? parseFloat(niAmountTotal)
          : null,
      ni_payer: leadSource === "National Intensive" ? niPayer : null,
      ni_amount_paid:
        leadSource === "National Intensive" && niAmountPaid.trim() !== ""
          ? parseFloat(niAmountPaid)
          : null,
      ni_payment_date:
        leadSource === "National Intensive" && niPaymentDate ? niPaymentDate : null,
      ni_reference:
        leadSource === "National Intensive" && niReference.trim()
          ? niReference.trim()
          : null,
      test_time:
        leadSource === "National Intensive" && testTime ? testTime : null,
      test_centre:
        leadSource === "National Intensive" && testCentre.trim() ? testCentre.trim() : null,
      wants_swap: leadSource === "National Intensive" ? wantsSwap : false,
      swap_earliest_date:
        leadSource === "National Intensive" && wantsSwap && swapEarliestDate
          ? swapEarliestDate
          : null,
      swap_latest_date:
        leadSource === "National Intensive" && wantsSwap && swapLatestDate
          ? swapLatestDate
          : null,
      swap_preferred_time:
        leadSource === "National Intensive" && wantsSwap ? swapPreferredTime : null,
      swap_centre_1:
        leadSource === "National Intensive" && wantsSwap && swapCentre1.trim() ? swapCentre1.trim() : null,
      swap_centre_2:
        leadSource === "National Intensive" && wantsSwap && swapCentre2.trim() ? swapCentre2.trim() : null,
      swap_centre_3:
        leadSource === "National Intensive" && wantsSwap && swapCentre3.trim() ? swapCentre3.trim() : null,
    };

    console.log("[pupils.edit] save payload:", updatePayload);

    const { error: updErr } = await supabase
      .from("pupils")
      .update(updatePayload)
      .eq("id", id);

    if (updErr) {
      console.error("[edit-pupil] update error", updErr);
      setError(updErr.message);
      setSaving(false);
      return;
    }

    if (hasBlock && aNum > originalPrepaidAmount.current) {
      const delta = aNum - originalPrepaidAmount.current;
      const { data: userData } = await supabase.auth.getUser();
      const { error: phErr } = await supabase.from("lesson_history").insert({
        instructor_id: userData.user?.id ?? null,
        pupil_id: id,
        lesson_date: new Date().toISOString().slice(0, 10),
        payment_status: "paid",
        payment_method: paymentMethod,
        amount: delta,
        notes: topUpNotes.trim() || `Block booking top-up: +£${delta.toFixed(2)}`,
      });
      if (phErr) console.error("[edit-pupil] top-up payment insert error", phErr);
      originalPrepaidAmount.current = aNum;
    }

    if (leadSource === "National Intensive" && wantsSwap) {
      const altCentres = [swapCentre1, swapCentre2, swapCentre3]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ") || "—";
      const swapPayload = {
        pupil_id: id,
        name: `${firstName.trim()} ${lastName.trim()}`.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        test_centre: testCentre.trim() || null,
        current_test_date: testDate || null,
        current_test_time: testTime || null,
        preferred_earliest: swapEarliestDate || null,
        preferred_latest: swapLatestDate || null,
        notes: `Preferred time: ${swapPreferredTime}. Alt centres: ${altCentres}`,
        status: "pending",
      };
      const { error: swapErr } = await supabase
        .from("test_swap_requests")
        .upsert(swapPayload, { onConflict: "pupil_id" });
      if (swapErr) console.error("[edit-pupil] swap upsert error", swapErr);
    }


    toast.success("Pupil updated");
    navigate({ to: "/pupils/$id", params: { id } });
  }

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils/$id", params: { id } })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Edit pupil
        </div>
        <button
          type="button"
          aria-label="Save"
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center justify-center text-white text-[14px] font-semibold px-3"
          style={{ height: 40, opacity: saving || loading ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="px-4 pt-6 text-[14px] text-[#6B7280]">Loading…</div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 px-4 pt-4"
        >
          <Input
            label="First name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <Input
            label="Last name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Home address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div>
            <FieldLabel htmlFor="lead_source">How did they find you?</FieldLabel>
            <select
              id="lead_source"
              value={leadSource}
              onChange={(e) => {
                setLeadSource(e.target.value);
                setLeadSourceDetail("");
              }}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            >
              <option value="">Select…</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {(leadSource === "Referral" || leadSource === "Other") && (
            <Input
              label={leadSource === "Referral" ? "Who referred them?" : "Please specify"}
              type="text"
              value={leadSourceDetail}
              onChange={(e) => setLeadSourceDetail(e.target.value.slice(0, 255))}
            />
          )}

          {leadSource !== "National Intensive" && (
            <label className="flex items-center justify-between gap-3" style={POPPINS}>
              <span className="text-[13px] font-medium text-[#1A1A2E]">
                Block booking / prepaid hours
              </span>
              <input
                type="checkbox"
                checked={blockToggle}
                onChange={(e) => setBlockToggle(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
            </label>
          )}

          {(blockToggle || leadSource === "National Intensive") && (
            <div
              className="flex flex-col gap-3 p-3 rounded-lg"
              style={{ border: "1px solid #EEF2F7", backgroundColor: "#F9FAFB" }}
            >
              <p className="text-[12px] font-semibold tracking-wide text-[#6B7280]" style={POPPINS}>
                BLOCK BOOKING
              </p>
              <Input
                label="Total amount paid (£)"
                type="number"
                inputMode="decimal"
                value={prepaidAmount}
                onChange={(e) => setPrepaidAmount(e.target.value)}
                placeholder="500.00"
              />
              <Input
                label="Hours included"
                type="number"
                inputMode="decimal"
                value={prepaidHours}
                onChange={(e) => setPrepaidHours(e.target.value)}
                placeholder="20"
              />
              {(() => {
                const a = parseFloat(prepaidAmount);
                const h = parseFloat(prepaidHours);
                if (!Number.isFinite(a) || !Number.isFinite(h) || h <= 0) return null;
                return (
                  <p className="text-[12px] text-[#6B7280]" style={POPPINS}>
                    Effective rate: £{(a / h).toFixed(2)}/hr
                  </p>
                );
              })()}
              {(() => {
                const a = parseFloat(prepaidAmount);
                if (!Number.isFinite(a) || a <= originalPrepaidAmount.current) return null;
                const delta = a - originalPrepaidAmount.current;
                return (
                  <>
                    <p className="text-[12px] font-medium" style={{ color: "#16A34A", ...POPPINS }}>
                      New top-up: +£{delta.toFixed(2)} will be recorded
                    </p>
                    <div className="flex flex-col gap-1">
                      <FieldLabel htmlFor="payment_method">Payment method</FieldLabel>
                      <select
                        id="payment_method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none"
                        style={fieldBorder}
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="card">Card</option>
                        <option value="agency">Already paid (via agency)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel htmlFor="top_up_notes">Notes (optional)</FieldLabel>
                      <textarea
                        id="top_up_notes"
                        rows={2}
                        value={topUpNotes}
                        onChange={(e) => setTopUpNotes(e.target.value)}
                        placeholder="e.g. Top-up paid by bank transfer, ref: xxx"
                        className="w-full rounded-lg p-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none"
                        style={{ ...fieldBorder, resize: "vertical" }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {leadSource === "National Intensive" && (
            <div
              className="flex flex-col gap-3 p-3 rounded-lg"
              style={{ border: "1px solid #EEF2F7", backgroundColor: "#F9FAFB" }}
            >
              <p className="text-[12px] font-semibold tracking-wide text-[#6B7280]" style={POPPINS}>
                NATIONAL INTENSIVE PAYMENT
              </p>
              <Input
                label="Total course fee (£)"
                type="number"
                inputMode="decimal"
                value={niAmountTotal}
                onChange={(e) => setNiAmountTotal(e.target.value)}
                placeholder="1500.00"
              />
              <Input
                label="Hours purchased"
                type="number"
                inputMode="decimal"
                value={prepaidHours}
                onChange={(e) => setPrepaidHours(e.target.value)}
                placeholder="40"
              />

              <div>
                <FieldLabel htmlFor="ni_payer">Who pays?</FieldLabel>
                <select
                  id="ni_payer"
                  value={niPayer}
                  onChange={(e) => setNiPayer(e.target.value)}
                  className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none"
                  style={fieldBorder}
                >
                  <option value="pupil">Pupil pays directly</option>
                  <option value="national_intensives">National Intensives (agency pays)</option>
                </select>
              </div>
              <Input
                label="Amount paid so far (£)"
                type="number"
                inputMode="decimal"
                value={niAmountPaid}
                onChange={(e) => setNiAmountPaid(e.target.value)}
                placeholder="0.00"
              />
              <Input
                label="Payment date"
                type="date"
                value={niPaymentDate}
                onChange={(e) => setNiPaymentDate(e.target.value)}
              />
              <Input
                label="Payment reference"
                type="text"
                value={niReference}
                onChange={(e) => setNiReference(e.target.value)}
                placeholder="Bank transfer ref / NI booking ref"
              />

              {(() => {
                const total = Number(niAmountTotal || 0);
                const prepaid = Number(prepaidHours || 0);
                if (!(total > 0 || prepaid > 0)) return null;
                const effectiveRate =
                  total > 0 && prepaid > 0 ? total / prepaid : instructorRate ?? 0;
                const hoursPurchased =
                  prepaid > 0 ? prepaid : effectiveRate > 0 ? total / effectiveRate : 0;
                const hoursRemaining = hoursPurchased - hoursCompleted;
                let remainColor = "#CC2229";
                if (hoursRemaining > 5) remainColor = "#16A34A";
                else if (hoursRemaining >= 1) remainColor = "#F59E0B";
                const pct =
                  hoursPurchased > 0
                    ? Math.min(100, Math.max(0, (hoursCompleted / hoursPurchased) * 100))
                    : 0;
                const row = (label: string, value: string, color?: string) => (
                  <div
                    className="flex items-center justify-between py-1.5"
                    style={{ borderTop: "0.5px solid #F3F4F6" }}
                  >
                    <span className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                      {label}
                    </span>
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: color ?? "#0B1F3A", ...POPPINS }}
                    >
                      {value}
                    </span>
                  </div>
                );
                return (
                  <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid #EEF2F7" }}>
                    <p
                      className="text-[12px] font-semibold tracking-wide text-[#6B7280] mb-2"
                      style={POPPINS}
                    >
                      HOURS
                    </p>
                    {row("Hours purchased", `${hoursPurchased.toFixed(1)} hrs`)}
                    {row("Hours completed", `${hoursCompleted.toFixed(1)} hrs`)}
                    {row("Hours remaining", `${hoursRemaining.toFixed(1)} hrs`, remainColor)}
                    {total > 0 && prepaid > 0 &&
                      row("Rate per hour", `£${(total / prepaid).toFixed(2)}/hr`)}
                    <div
                      style={{
                        marginTop: 10,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#F3F8FF",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          backgroundColor: "#1877D6",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                );
              })()}



              <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid #EEF2F7" }}>
                <p
                  className="text-[12px] font-semibold tracking-wide text-[#6B7280] mb-2"
                  style={POPPINS}
                >
                  TEST DETAILS
                </p>
                <div className="flex flex-col gap-3">
                  <Input
                    label="Test date"
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                  />
                  <Input
                    label="Test time"
                    type="time"
                    value={testTime}
                    onChange={(e) => setTestTime(e.target.value)}
                  />
                  <CentreSearch
                    label="Test centre"
                    value={testCentre}
                    onChange={setTestCentre}
                  />
                </div>
              </div>

              <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid #EEF2F7" }}>
                <p
                  className="text-[12px] font-semibold tracking-wide text-[#6B7280] mb-2"
                  style={POPPINS}
                >
                  EVERYSWAP
                </p>
                <label className="flex items-center justify-between gap-3" style={POPPINS}>
                  <span className="text-[13px] font-medium text-[#1A1A2E]">
                    Add to EverySwap swap list
                  </span>
                  <input
                    type="checkbox"
                    checked={wantsSwap}
                    onChange={(e) => setWantsSwap(e.target.checked)}
                    style={{ width: 20, height: 20 }}
                  />
                </label>
                {wantsSwap && (
                  <div className="mt-3 flex flex-col gap-3">
                    <Input
                      label="Preferred earliest date"
                      type="date"
                      value={swapEarliestDate}
                      onChange={(e) => setSwapEarliestDate(e.target.value)}
                    />
                    <Input
                      label="Preferred latest date"
                      type="date"
                      value={swapLatestDate}
                      onChange={(e) => setSwapLatestDate(e.target.value)}
                    />
                    <div>
                      <FieldLabel htmlFor="swap_preferred_time">Preferred time</FieldLabel>
                      <select
                        id="swap_preferred_time"
                        value={swapPreferredTime}
                        onChange={(e) => setSwapPreferredTime(e.target.value)}
                        className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none"
                        style={fieldBorder}
                      >
                        <option value="any">Any</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                      </select>
                    </div>
                    <CentreSearch
                      label="Alternative centre 1"
                      value={swapCentre1}
                      onChange={setSwapCentre1}
                    />
                    <CentreSearch
                      label="Alternative centre 2"
                      value={swapCentre2}
                      onChange={setSwapCentre2}
                    />
                    <CentreSearch
                      label="Alternative centre 3"
                      value={swapCentre3}
                      onChange={setSwapCentre3}
                    />
                  </div>
                )}
              </div>
            </div>
          )}





          <div>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Test date"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
          />

          <div>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this pupil…"
              className="w-full rounded-lg px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            />
          </div>

          {error && (
            <p className="text-[12px]" style={{ color: "#CC2229" }}>
              {error}
            </p>
          )}
        </form>
      )}

      <ConfirmDialog
        open={inactiveConfirmOpen}
        title={`Mark ${`${firstName} ${lastName}`.trim() || "pupil"} as inactive?`}
        message="They will be hidden from active lists and cannot be booked for new lessons."
        confirmLabel="Mark inactive"
        onConfirm={performSave}
        onCancel={() => setInactiveConfirmOpen(false)}
      />
    </div>
  );
}

function CentreSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ id: string; name: string; town: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (!open || q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("test_centres")
        .select("id, name, town")
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(10);
      if (cancelled) return;
      if (error) console.error("[centre-search]", error);
      setResults((data as { id: string; name: string; town: string | null }[]) ?? []);
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, open]);

  return (
    <div className="relative">
      <FieldLabel htmlFor={`centre_${label}`}>{label}</FieldLabel>
      <input
        id={`centre_${label}`}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search test centres…"
        className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none"
        style={fieldBorder}
      />
      {open && (results.length > 0 || loading) && (
        <div
          className="absolute z-20 left-0 right-0 mt-1 rounded-lg bg-white shadow-lg overflow-hidden"
          style={{ border: "0.5px solid #EEF2F7", maxHeight: 240, overflowY: "auto" }}
        >
          {loading && (
            <div className="px-3 py-2 text-[12px] text-[#6B7280]" style={POPPINS}>
              Searching…
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(r.name);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-[13px] text-[#1A1A2E] hover:bg-[#F3F4F6]"
              style={POPPINS}
            >
              <span className="font-medium">{r.name}</span>
              {r.town && (
                <span className="text-[11px] text-[#6B7280] ml-2">{r.town}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
