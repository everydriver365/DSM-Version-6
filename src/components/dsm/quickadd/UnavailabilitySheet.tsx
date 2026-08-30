import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "../BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";
import { FONT, NAVY, TextField, SheetFooter } from "./fields";

export function UnavailabilitySheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        setLoading(false);
        return;
      }
      setUserId(u.id);
      const { data: row } = await supabase
        .from("instructors")
        .select("is_active, unavailable_until, unavailable_reason")
        .eq("id", u.id)
        .maybeSingle();
      if (row) {
        setIsActive((row as any).is_active ?? true);
        setReturnDate(((row as any).unavailable_until as string | null) ?? "");
        setReason(((row as any).unavailable_reason as string | null) ?? "");
      }
      setLoading(false);
    })();
  }, [open]);

  if (!open) return null;

  const toggleStatus = async () => {
    if (!userId) return;
    const next = !isActive;
    setIsActive(next);
    const { error } = await supabase
      .from("instructors")
      .update({ is_active: next })
      .eq("id", userId);
    if (error) {
      setIsActive(!next);
      toast.error("Couldn't update availability");
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("instructors")
      .update({
        unavailable_until: returnDate || null,
        unavailable_reason: reason || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save unavailability");
      return;
    }
    toast.success("Availability updated");
    onSaved?.();
    onClose();
  };

  return (
    <BottomSheet
      title="Availability"
      subtitle="Set your status and a return date"
      onClose={onClose}
      footer={<SheetFooter onCancel={onClose} onSave={handleSave} saving={saving} disabled={loading} />}
    >
      <div style={{ fontFamily: FONT }}>
        <div
          style={{
            borderRadius: 12,
            padding: 20,
            background: isActive ? "#F3F8FF" : "#FEF2F2",
            border: "1px solid #1877D6",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1877D6" }}>
            {isActive ? "You are available" : "You are unavailable"}
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4, marginBottom: 14 }}>
            {isActive ? "Pupils can see and book your slots" : "Pupils cannot book new lessons"}
          </div>
          <button
            type="button"
            onClick={toggleStatus}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "none",
              background: "#1877D6",
              color: "#fff",
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {isActive ? "Go unavailable" : "Go available"}
          </button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A93A3", marginBottom: 8, letterSpacing: 0.4 }}>
          TEMPORARY UNAVAILABILITY
        </div>
        <TextField label="Return date" type="date" value={returnDate} onChange={setReturnDate} />
        <TextField
          label="Reason (optional)"
          value={reason}
          onChange={setReason}
          placeholder="e.g. Holiday, Illness"
        />
        <div style={{ height: 8, color: NAVY }} />
      </div>
    </BottomSheet>
  );
}

export default UnavailabilitySheet;
