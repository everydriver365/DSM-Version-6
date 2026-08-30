import { useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "../BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";
import { FONT, TextField, TextAreaField, SelectField, SheetFooter } from "./fields";

const SOURCES = [
  { value: "", label: "Not set" },
  { value: "Phone", label: "Phone" },
  { value: "Website", label: "Website" },
  { value: "Referral", label: "Referral" },
  { value: "Social media", label: "Social media" },
  { value: "Walk-up", label: "Walk-up" },
  { value: "Other", label: "Other" },
];

export function EnquirySheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const dirty = Boolean(name || phone || email || postcode || source || notes);

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setPostcode("");
    setSource("");
    setNotes("");
  };

  const close = () => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) {
      setSaving(false);
      toast.error("You must be signed in");
      return;
    }
    const row: Record<string, unknown> = {
      instructor_id: userId,
      name: name.trim(),
      status: "new",
    };
    if (phone.trim()) row.phone = phone.trim();
    if (email.trim()) row.email = email.trim();
    if (postcode.trim()) row.postcode = postcode.trim().toUpperCase();
    const noteParts = [source ? `Source: ${source}` : "", notes.trim()].filter(Boolean);
    if (noteParts.length) row.notes = noteParts.join("\n");

    const { error } = await supabase.from("enquiries").insert(row);
    setSaving(false);
    if (error) {
      toast.error("Couldn't log enquiry");
      return;
    }
    toast.success("Enquiry logged");
    reset();
    onSaved?.();
    onClose();
  };

  return (
    <BottomSheet
      title="Log enquiry"
      subtitle="Capture a new lead"
      onClose={close}
      footer={<SheetFooter onCancel={close} onSave={handleSave} saving={saving} saveLabel="Log enquiry" />}
    >
      <div style={{ fontFamily: FONT }}>
        <TextField label="Name" value={name} onChange={setName} placeholder="Full name" />
        <TextField label="Phone" value={phone} onChange={setPhone} placeholder="07…" inputMode="tel" />
        <TextField label="Email" value={email} onChange={setEmail} placeholder="name@example.com" inputMode="email" />
        <TextField label="Postcode" value={postcode} onChange={setPostcode} placeholder="e.g. TN1 1AA" />
        <SelectField label="Source" value={source} onChange={setSource} options={SOURCES} />
        <TextAreaField label="Notes" value={notes} onChange={setNotes} placeholder="What are they looking for?" />
      </div>
    </BottomSheet>
  );
}

export default EnquirySheet;
