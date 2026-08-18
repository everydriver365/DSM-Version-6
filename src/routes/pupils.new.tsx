import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { IconArrowLeft, IconAddressBook, IconChevronRight, IconSearch, IconX } from "@tabler/icons-react";
import { Contacts } from "@capacitor-community/contacts";
import { toast } from "sonner";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { AddressLookup } from "@/components/dsm/AddressLookup";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

type NewPupilSearch = { name?: string; phone?: string };

const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

export const Route = createFileRoute("/pupils/new")({
  head: () => ({
    meta: [{ title: "Add pupil — DSM by EveryDriver" }],
  }),
  validateSearch: (search: Record<string, unknown>): NewPupilSearch => ({
    name: typeof search.name === "string" ? search.name : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
  }),
  component: NewPupilPage,
});

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(" ")];
}

function NewPupilPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [preFirst, preLast] = splitName(search.name ?? "");
  const [firstName, setFirstName] = useState(preFirst);
  const [lastName, setLastName] = useState(preLast);
  const [phone, setPhone] = useState(search.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [leadSourceDetail, setLeadSourceDetail] = useState("");
  const [blockToggle, setBlockToggle] = useState(false);
  const [prepaidAmount, setPrepaidAmount] = useState("");
  const [prepaidHours, setPrepaidHours] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [blockNotes, setBlockNotes] = useState("");
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    postcode?: string;
    form?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [importingContact, setImportingContact] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");

  async function importFromContacts() {
    setImportingContact(true);
    try {
      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== "granted") {
        toast.error("Contacts permission required");
        return;
      }
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        },
      });
      setContactsList(result.contacts ?? []);
      setShowContactPicker(true);
    } catch (e: any) {
      toast.error("Could not access contacts");
    } finally {
      setImportingContact(false);
    }
  }

  function applyContact(contact: any) {
    const fullName =
      contact.name?.display ??
      `${contact.name?.given ?? ""} ${contact.name?.family ?? ""}`.trim();
    const phone = contact.phones?.[0]?.number?.replace(/\s/g, "") ?? "";
    const [first, last] = splitName(fullName);
    setFirstName(first);
    setLastName(last);
    setPhone(phone);
    setShowContactPicker(false);
    toast.success(`Imported ${fullName || "contact"}`);
  }

  async function handleSave() {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
    if (postcode.trim() && !UK_POSTCODE_RE.test(postcode.trim())) {
      next.postcode = "Enter a valid UK postcode";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrors({ form: "You must be signed in to add a pupil" });
      setSaving(false);
      return;
    }
    const first = firstName.trim();
    const last = lastName.trim();
    const insert: Record<string, unknown> = {
      instructor_id: user.id,
      first_name: first,
      last_name: last,
      name: `${first} ${last}`.trim(),
      status: "active",
    };
    if (phone.trim()) insert.phone = phone.trim();
    if (dateOfBirth) insert.date_of_birth = dateOfBirth;

    if (address.trim()) insert.address = address.trim();
    if (postcode.trim()) insert.postcode = postcode.trim().toUpperCase();
    if (leadSource) {
      insert.lead_source = leadSource;
      if (leadSourceDetail.trim()) insert.lead_source_detail = leadSourceDetail.trim();
    }
    const blockOn = blockToggle || leadSource === "National Intensive";
    const amountNum = parseFloat(prepaidAmount);
    const hoursNum = parseFloat(prepaidHours);
    const hasBlock =
      blockOn && Number.isFinite(amountNum) && amountNum > 0 && Number.isFinite(hoursNum) && hoursNum > 0;
    if (hasBlock) {
      insert.prepaid_amount_paid = amountNum;
      insert.prepaid_hours = hoursNum;
    }
    const { data: inserted, error } = await supabase
      .from("pupils")
      .insert(insert)
      .select("id")
      .single();
    if (error) {
      setErrors({ form: error.message });
      setSaving(false);
      return;
    }
    if (hasBlock && inserted?.id) {
      const { error: phErr } = await supabase.from("lesson_history").insert({
        instructor_id: user.id,
        pupil_id: inserted.id,
        lesson_date: new Date().toISOString().slice(0, 10),
        payment_status: "paid",
        payment_method: paymentMethod,
        amount: amountNum,
        notes: blockNotes.trim() || `Block booking: ${hoursNum} hrs prepaid`,
      });
      if (phErr) console.error("[new-pupil] block payment insert error", phErr);
    }
    navigate({ to: "/pupils" });
  }

  return (
    <PageLayout style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            aria-label="Back to pupils"
            onClick={() => navigate({ to: "/pupils" })}
            className="flex items-center justify-center w-8 h-8 -ml-1"
          >
            <IconArrowLeft size={20} color="#0B1F3A" />
          </button>
          <p
            className="text-[20px] font-semibold"
            style={{ color: "#0B1F3A", fontFamily: "Poppins, sans-serif" }}
          >
            Add pupil
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <button
            type="button"
            onClick={importFromContacts}
            disabled={importingContact}
            style={{
              width: "100%",
              background: "#fff",
              border: "1px solid #E4E8EF",
              borderRadius: 16,
              padding: "13px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              marginBottom: 16,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#EFF6FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconAddressBook size={20} color="#1877D6" stroke={1.5} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0B1F3A",
                  fontFamily: "Poppins, sans-serif",
                  margin: 0,
                }}
              >
                Import from Contacts
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#9CA3AF",
                  marginTop: 2,
                  fontFamily: "Poppins, sans-serif",
                  margin: 0,
                }}
              >
                Auto-fill pupil details
              </p>
            </div>
            <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
          </button>
          <div>
            <Input
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
            />
            {errors.firstName && (
              <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
                {errors.firstName}
              </p>
            )}
          </div>
          <div>
            <Input
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
            />
            {errors.lastName && (
              <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
                {errors.lastName}
              </p>
            )}
          </div>
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
          />
          <div className="flex flex-col gap-1">
            <label
              className="text-[13px] font-medium text-[#0B1F3A]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Date of birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="text-[14px] text-[#0B1F3A]"
              style={{
                height: 44,
                borderRadius: 8,
                border: "1px solid #EEF2F7",
                padding: "0 12px",
                backgroundColor: "#fff",
                fontFamily: "Poppins, sans-serif",
              }}
            />
            <p className="text-[11px]" style={{ color: "#9CA3AF", fontFamily: "Poppins, sans-serif" }}>
              Optional — used for birthday reminders
            </p>
          </div>

          <AddressLookup
            initialPostcode={postcode}
            initialAddress={address}
            onAddressFound={({ postcode: pc, address: addr }) => {
              setPostcode(pc);
              setAddress(addr);
            }}
          />
          {errors.postcode && (
            <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
              {errors.postcode}
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label
              className="text-[13px] font-medium text-[#0B1F3A]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              How did they find you?
            </label>
            <select
              value={leadSource}
              onChange={(e) => {
                setLeadSource(e.target.value);
                setLeadSourceDetail("");
              }}
              className="text-[14px] text-[#0B1F3A]"
              style={{
                height: 44,
                borderRadius: 8,
                border: "1px solid #EEF2F7",
                padding: "0 12px",
                backgroundColor: "#fff",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <option value="">Select source</option>
              <option value="Referral">Referral</option>
              <option value="EveryDriver">EveryDriver</option>
              <option value="National Intensive">National Intensive</option>
              <option value="Online">Online</option>
              <option value="Walk-in / Local">Walk-in / Local</option>
              <option value="Social media">Social media</option>
              <option value="Driving school">Driving school</option>
              <option value="Returning pupil">Returning pupil</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {(leadSource === "Referral" || leadSource === "Other") && (
            <Input
              label={leadSource === "Referral" ? "Who referred them?" : "Please specify"}
              value={leadSourceDetail}
              onChange={(e) => setLeadSourceDetail(e.target.value)}
              maxLength={255}
            />
          )}
          {leadSource !== "National Intensive" && (
            <label
              className="flex items-center justify-between gap-3 mt-1"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              <span className="text-[13px] font-medium text-[#0B1F3A]">
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
              <p
                className="text-[12px] font-semibold tracking-wide"
                style={{ color: "#6B7280", fontFamily: "Poppins, sans-serif" }}
              >
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
                  <p
                    className="text-[12px]"
                    style={{ color: "#6B7280", fontFamily: "Poppins, sans-serif" }}
                  >
                    Effective rate: £{(a / h).toFixed(2)}/hr
                  </p>
                );
              })()}
              <div className="flex flex-col gap-1">
                <label
                  className="text-[13px] font-medium text-[#0B1F3A]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Payment method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-[14px] text-[#0B1F3A]"
                  style={{
                    height: 44,
                    borderRadius: 8,
                    border: "1px solid #EEF2F7",
                    padding: "0 12px",
                    backgroundColor: "#fff",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card</option>
                  <option value="agency">Already paid (via agency)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-[13px] font-medium text-[#0B1F3A]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                  placeholder="e.g. Paid via National Intensive, transfer ref: xxx"
                  className="text-[14px] text-[#0B1F3A] p-2"
                  style={{
                    borderRadius: 8,
                    border: "1px solid #EEF2F7",
                    backgroundColor: "#fff",
                    fontFamily: "Poppins, sans-serif",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          )}

          {errors.form && (
            <p className="text-[12px]" style={{ color: "#1877D6" }}>
              {errors.form}
            </p>
          )}

          <div className="mt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save pupil"}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
