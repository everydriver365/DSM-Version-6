import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Award, AlertTriangle, ShieldCheck, Heart, BadgeCheck, FileText } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/certifications")({
  head: () => ({
    meta: [
      { title: "Certifications — DSM by EveryDriver" },
      { name: "description", content: "Track your professional certifications and expiry dates." },
    ],
  }),
  component: CertificationsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type CertType = "adi_badge" | "dbs" | "first_aid" | "insurance" | "other";

const TYPE_OPTIONS: { value: CertType; label: string }[] = [
  { value: "adi_badge", label: "ADI Badge" },
  { value: "dbs", label: "DBS Check" },
  { value: "first_aid", label: "First Aid" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

interface CertRow {
  id: string;
  name: string;
  cert_type: string | null;
  issued_by: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  cert_number: string | null;
}

function typeMeta(t: string | null) {
  switch (t) {
    case "adi_badge":
      return { color: "#00A3B4", tint: "#EEF4FB", Icon: BadgeCheck, label: "ADI Badge" };
    case "dbs":
      return { color: "#CC2229", tint: "#FEF2F2", Icon: ShieldCheck, label: "DBS Check" };
    case "first_aid":
      return { color: "#16A34A", tint: "#ECFDF5", Icon: Heart, label: "First Aid" };
    case "insurance":
      return { color: "#00A3B4", tint: "#EEF4FB", Icon: FileText, label: "Insurance" };
    default:
      return { color: "#6B7280", tint: "#F4F4F5", Icon: Award, label: "Other" };
  }
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function CertificationsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<CertRow[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [editing, setEditing] = useState<CertRow | null>(null);

  const [name, setName] = useState("");
  const [certType, setCertType] = useState<CertType>("other");
  const [issuedBy, setIssuedBy] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const fetchRows = async (uid: string) => {
    const { data, error } = await supabase
      .from("certifications")
      .select("id, name, cert_type, issued_by, issue_date, expiry_date, cert_number")
      .eq("instructor_id", uid)
      .order("expiry_date", { ascending: true, nullsFirst: false });
    if (error) console.error("[certifications] fetch error", error);
    setRows((data ?? []) as unknown as CertRow[]);
  };

  useEffect(() => {
    if (!userId) return;
    fetchRows(userId);
  }, [userId]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setCertType("other");
    setIssuedBy("");
    setIssueDate("");
    setExpiryDate("");
    setCertNumber("");
    setSheetError(null);
    setShowSheet(true);
  };

  const openEdit = (r: CertRow) => {
    setEditing(r);
    setName(r.name);
    setCertType(((r.cert_type as CertType) ?? "other"));
    setIssuedBy(r.issued_by ?? "");
    setIssueDate(r.issue_date ?? "");
    setExpiryDate(r.expiry_date ?? "");
    setCertNumber(r.cert_number ?? "");
    setSheetError(null);
    setShowSheet(true);
  };

  const save = async () => {
    if (!userId) return;
    if (!name.trim()) {
      setSheetError("Please enter a certification name.");
      return;
    }
    setSaving(true);
    setSheetError(null);
    const payload = {
      name: name.trim(),
      cert_type: certType,
      issued_by: issuedBy.trim() || null,
      issue_date: issueDate || null,
      expiry_date: expiryDate || null,
      cert_number: certNumber.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("certifications").update(payload).eq("id", editing.id)
      : await supabase.from("certifications").insert({ ...payload, instructor_id: userId });
    setSaving(false);
    if (error) {
      console.error("[certifications] save error", error);
      setSheetError(error.message);
      return;
    }
    setShowSheet(false);
    await fetchRows(userId);
  };

  const remove = async () => {
    if (!editing) return;
    const id = editing.id;
    setShowSheet(false);
    setRows((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("certifications").delete().eq("id", id);
    if (error) {
      console.error("[certifications] delete error", error);
      if (userId) await fetchRows(userId);
    }
  };

  const expiringCount = rows.filter((r) => {
    const d = daysUntil(r.expiry_date);
    return d !== null && d >= 0 && d <= 60;
  }).length;

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[52px] flex items-center px-3 z-50"
        style={{ background: "#072b47" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="p-1"
          aria-label="Back"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-white text-[16px] font-semibold">
          Certifications
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="ml-auto p-1"
          aria-label="Add certification"
        >
          <Plus size={24} color="#FFFFFF" />
        </button>
      </div>

      <div className="pt-[52px]">
        <div className="mx-4">
          {expiringCount > 0 && (
            <div
              className="mt-3 rounded-lg px-3 py-3 flex items-center"
              style={{ backgroundColor: "#FEF3C7", gap: 10 }}
            >
              <AlertTriangle size={18} color="#92400E" />
              <div className="text-[13px] font-medium" style={{ color: "#92400E" }}>
                {expiringCount} certification{expiringCount === 1 ? "" : "s"} expiring soon
              </div>
            </div>
          )}

          <SectionHeader>MY CERTIFICATIONS</SectionHeader>

          {rows.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center text-center py-12"
              style={{ gap: 10 }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 56, height: 56, backgroundColor: "#EEF4FB" }}
              >
                <Award size={28} color="#00A3B4" />
              </div>
              <div className="text-[14px] text-[#6B7280]">No certifications added yet</div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {rows.map((r) => {
                const meta = typeMeta(r.cert_type);
                const days = daysUntil(r.expiry_date);
                let expColor = "#16A34A";
                let statusText = "";
                if (days === null) {
                  expColor = "#6B7280";
                  statusText = "No expiry set";
                } else if (days < 0) {
                  expColor = "#CC2229";
                  statusText = "Expired";
                } else if (days <= 60) {
                  expColor = "#92400E";
                  statusText = `${days} day${days === 1 ? "" : "s"} remaining`;
                } else {
                  expColor = "#16A34A";
                  statusText = `${days} days remaining`;
                }
                const Icon = meta.Icon;
                return (
                  <Card key={r.id} className="!py-3 !px-4">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="flex items-start w-full text-left"
                      style={{ gap: 12 }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full"
                        style={{
                          width: 36,
                          height: 36,
                          backgroundColor: meta.tint,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} color={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-[#0A2540] truncate">
                          {r.name}
                        </div>
                        {r.issued_by && (
                          <div className="text-[13px] text-[#6B7280] truncate">
                            {r.issued_by}
                          </div>
                        )}
                        <div className="text-[12px] mt-0.5" style={{ color: expColor }}>
                          {statusText}
                        </div>
                      </div>
                      <div className="text-right" style={{ flexShrink: 0 }}>
                        <div className="text-[13px] font-medium" style={{ color: expColor }}>
                          {r.expiry_date ? formatDate(r.expiry_date) : "—"}
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADD/EDIT SHEET */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSheet(false)}
          />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8 max-h-[90vh] overflow-y-auto"
            style={{ animation: "slideUp 0.25s ease-out" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-semibold text-[#0A2540]">
                {editing ? "Edit certification" : "Add certification"}
              </div>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="text-[13px] text-[#6B7280]"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: 12 }}>
              <Input
                label="Certification name"
                placeholder="e.g. ADI Green Badge"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="w-full">
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={POPPINS}
                >
                  Type
                </label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as CertType)}
                  className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#00A3B4] focus:outline-none"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                  }}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Issued by"
                placeholder="e.g. DVSA"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
              />
              <Input
                label="Issue date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
              <Input
                label="Expiry date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <Input
                label="Certificate number (optional)"
                placeholder="e.g. 1234567"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
              />

              {sheetError && (
                <div className="text-[12px]" style={{ color: "#CC2229" }}>
                  {sheetError}
                </div>
              )}

              <Button onClick={save} disabled={saving || !userId}>
                {saving ? "Saving…" : editing ? "Update certification" : "Save certification"}
              </Button>

              {editing && (
                <button
                  type="button"
                  onClick={remove}
                  className="text-[13px] font-medium py-2"
                  style={{ color: "#CC2229" }}
                >
                  Delete certification
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
