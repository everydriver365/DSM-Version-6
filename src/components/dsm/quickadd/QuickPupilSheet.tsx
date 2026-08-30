import { useState } from "react";
import { toast } from "@/lib/toast";
import { BottomSheet } from "../BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";
import { FONT, TextField, SheetFooter } from "./fields";

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function QuickPupilSheet({
  open,
  onClose,
  onSaved,
  onOpenFullForm,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (pupilId: string) => void;
  onOpenFullForm?: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const dirty = Boolean(firstName || lastName || phone || address || postcode);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setAddress("");
    setPostcode("");
  };

  const close = () => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (postcode.trim() && !UK_POSTCODE_RE.test(postcode.trim())) {
      toast.error("Enter a valid UK postcode");
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
    const first = firstName.trim();
    const last = lastName.trim();
    const insert: Record<string, unknown> = {
      instructor_id: userId,
      first_name: first,
      last_name: last,
      name: `${first} ${last}`.trim(),
      status: "active",
    };
    if (phone.trim()) insert.phone = phone.trim();
    if (address.trim()) insert.address = address.trim();
    if (postcode.trim()) insert.postcode = postcode.trim().toUpperCase();

    const { data: inserted, error } = await supabase
      .from("pupils")
      .insert(insert)
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message || "Couldn't add pupil");
      return;
    }
    toast.success("Pupil added");
    reset();
    onSaved?.((inserted as { id: string }).id);
    onClose();
  };

  return (
    <BottomSheet
      title="Add pupil"
      subtitle="The essentials — you can add more later"
      onClose={close}
      footer={<SheetFooter onCancel={close} onSave={handleSave} saving={saving} saveLabel="Add pupil" />}
    >
      <div style={{ fontFamily: FONT }}>
        <TextField label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
        <TextField label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
        <TextField label="Phone" value={phone} onChange={setPhone} placeholder="07…" inputMode="tel" />
        <TextField label="Address" value={address} onChange={setAddress} placeholder="Pickup address" />
        <TextField label="Postcode" value={postcode} onChange={setPostcode} placeholder="e.g. TN1 1AA" />
        {onOpenFullForm && (
          <button
            type="button"
            onClick={() => {
              reset();
              onOpenFullForm();
            }}
            style={{
              width: "100%",
              padding: "12px 0",
              background: "transparent",
              border: "none",
              color: "#1877D6",
              fontFamily: FONT,
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            Open full pupil form
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

export default QuickPupilSheet;
