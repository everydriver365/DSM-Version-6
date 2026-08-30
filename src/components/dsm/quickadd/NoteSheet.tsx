import { useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "../BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";
import { FONT, TextField, TextAreaField, SheetFooter } from "./fields";

export function NoteSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const dirty = title.trim().length > 0 || body.trim().length > 0;

  const close = () => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    setTitle("");
    setBody("");
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) {
      toast.error("Add a title or some text first");
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
    const { error } = await supabase
      .from("notes")
      .insert({ instructor_id: userId, title: title.trim(), body: body.trim() });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save note");
      return;
    }
    toast.success("Note added");
    setTitle("");
    setBody("");
    onSaved?.();
    onClose();
  };

  return (
    <BottomSheet
      title="Add note"
      subtitle="Saved to your notes"
      onClose={close}
      footer={<SheetFooter onCancel={close} onSave={handleSave} saving={saving} />}
    >
      <div style={{ fontFamily: FONT }}>
        <TextField label="Title" value={title} onChange={setTitle} placeholder="Note title" />
        <TextAreaField label="Note" value={body} onChange={setBody} placeholder="Write your note…" rows={7} />
      </div>
    </BottomSheet>
  );
}

export default NoteSheet;
