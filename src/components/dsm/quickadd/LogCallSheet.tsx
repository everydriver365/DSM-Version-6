import { useState } from "react";
import { toast } from "@/lib/toast";
import { BottomSheet } from "../BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";
import { FONT, TextField, TextAreaField, PillGroup, SheetFooter } from "./fields";

const OUTCOMES = [
  { value: "spoke", label: "Spoke" },
  { value: "voicemail", label: "Voicemail" },
  { value: "no_answer", label: "No answer" },
];

export function LogCallSheet({
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
  const [outcome, setOutcome] = useState("spoke");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const dirty = Boolean(name || phone || notes);

  const reset = () => {
    setName("");
    setPhone("");
    setOutcome("spoke");
    setNotes("");
  };

  const close = () => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim() && !phone.trim()) {
      toast.error("Add a name or phone number");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) {
        toast.error("You must be signed in");
        return;
      }

      // Find an existing enquiry for this contact, otherwise create one so the
      // call has somewhere to live in the enquiry timeline.
      let enquiryId: string | null = null;
      if (phone.trim()) {
        const { data: match } = await supabase
          .from("enquiries")
          .select("id")
          .eq("instructor_id", userId)
          .eq("phone", phone.trim())
          .limit(1)
          .maybeSingle();
        enquiryId = (match as { id: string } | null)?.id ?? null;
      }

      if (!enquiryId) {
        const { data: created, error: cErr } = await supabase
          .from("enquiries")
          .insert({
            instructor_id: userId,
            name: name.trim() || phone.trim(),
            phone: phone.trim() || null,
            status: "contacted",
            contacted_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        enquiryId = (created as { id: string }).id;
      }

      const outcomeLabel = OUTCOMES.find((o) => o.value === outcome)?.label ?? "Call";
      const body = [outcomeLabel, notes.trim()].filter(Boolean).join(" — ");
      const { error } = await supabase.from("enquiry_activities").insert({
        enquiry_id: enquiryId,
        instructor_id: userId,
        type: "call",
        body,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      toast.success("Call logged");
      reset();
      onSaved?.();
      onClose();
    } catch (e) {
      console.error("[log-call]", e);
      toast.error("Couldn't log call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      title="Log call"
      subtitle="Record a conversation"
      onClose={close}
      footer={<SheetFooter onCancel={close} onSave={handleSave} saving={saving} saveLabel="Log call" />}
    >
      <div style={{ fontFamily: FONT }}>
        <TextField label="Contact name" value={name} onChange={setName} placeholder="Who did you call?" />
        <TextField label="Phone" value={phone} onChange={setPhone} placeholder="07…" inputMode="tel" />
        <PillGroup label="Outcome" value={outcome} onChange={setOutcome} options={OUTCOMES} />
        <TextAreaField label="Notes" value={notes} onChange={setNotes} placeholder="What was discussed?" />
      </div>
    </BottomSheet>
  );
}

export default LogCallSheet;
