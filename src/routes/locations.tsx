import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, MapPin, Navigation as NavIcon, Copy } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/locations")({
  head: () => ({
    meta: [
      { title: "Saved locations — DSM by EveryDriver" },
      { name: "description", content: "Saved pickup and meeting locations." },
    ],
  }),
  component: LocationsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface LocationRow {
  id: string;
  name: string;
  postcode: string | null;
  address: string | null;
  notes: string | null;
}

function LocationsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);

  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const fetchRows = async (uid: string) => {
    const { data, error } = await supabase
      .from("saved_locations")
      .select("id, name, postcode, address, notes")
      .eq("instructor_id", uid)
      .order("name", { ascending: true });
    if (error) console.error("[locations] fetch error", error);
    setRows((data ?? []) as unknown as LocationRow[]);
  };

  useEffect(() => {
    if (!userId) return;
    fetchRows(userId);
  }, [userId]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setPostcode("");
    setAddress("");
    setNotes("");
    setSheetError(null);
    setShowSheet(true);
  };

  const openEdit = (r: LocationRow) => {
    setEditing(r);
    setName(r.name);
    setPostcode(r.postcode ?? "");
    setAddress(r.address ?? "");
    setNotes(r.notes ?? "");
    setSheetError(null);
    setShowSheet(true);
  };

  const save = async () => {
    if (!userId) return;
    if (!name.trim()) {
      setSheetError("Please enter a name.");
      return;
    }
    setSaving(true);
    setSheetError(null);
    const payload = {
      name: name.trim(),
      postcode: postcode.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("saved_locations").update(payload).eq("id", editing.id)
      : await supabase
          .from("saved_locations")
          .insert({ ...payload, instructor_id: userId });
    setSaving(false);
    if (error) {
      console.error("[locations] save error", error);
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
    const { error } = await supabase.from("saved_locations").delete().eq("id", id);
    if (error) {
      console.error("[locations] delete error", error);
      if (userId) await fetchRows(userId);
    }
  };

  const openMaps = (r: LocationRow) => {
    const q = encodeURIComponent(r.postcode || r.address || r.name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  const copyPostcode = async (r: LocationRow) => {
    const text = r.postcode || r.address || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId((c) => (c === r.id ? null : c)), 1500);
    } catch (e) {
      console.error("[locations] copy error", e);
    }
  };

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
          Saved locations
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="ml-auto p-1"
          aria-label="Add location"
        >
          <Plus size={24} color="#FFFFFF" />
        </button>
      </div>

      <div className="pt-[52px]">
        <div className="mx-4">
          <SectionHeader>SAVED LOCATIONS</SectionHeader>

          {rows.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center text-center py-12"
              style={{ gap: 10 }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 56, height: 56, backgroundColor: "#EEF4FB" }}
              >
                <MapPin size={28} color="#0B7DDA" />
              </div>
              <div className="text-[14px] text-[#6B7280]">No saved locations yet</div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {rows.map((r) => (
                <Card key={r.id} className="!py-3 !px-4">
                  <div className="flex items-center" style={{ gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="flex items-center flex-1 min-w-0 text-left"
                      style={{ gap: 12 }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full"
                        style={{
                          width: 36,
                          height: 36,
                          backgroundColor: "#EEF4FB",
                          flexShrink: 0,
                        }}
                      >
                        <MapPin size={18} color="#0B7DDA" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-[#0A2540] truncate">
                          {r.name}
                        </div>
                        {(r.postcode || r.address) && (
                          <div className="text-[13px] text-[#6B7280] truncate">
                            {[r.postcode, r.address].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyPostcode(r);
                      }}
                      aria-label="Copy postcode"
                      className="flex items-center justify-center rounded-md"
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        backgroundColor: copiedId === r.id ? "#ECFDF5" : "transparent",
                      }}
                    >
                      <Copy size={16} color={copiedId === r.id ? "#059669" : "#6B7280"} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMaps(r);
                      }}
                      aria-label="Navigate"
                      className="flex items-center rounded-md px-2"
                      style={{
                        height: 32,
                        gap: 4,
                        flexShrink: 0,
                        color: "#0B7DDA",
                      }}
                    >
                      <NavIcon size={14} color="#0B7DDA" />
                      <span className="text-[12px] font-medium">Navigate</span>
                    </button>
                  </div>
                </Card>
              ))}
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
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8"
            style={{ animation: "slideUp 0.25s ease-out" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-semibold text-[#0A2540]">
                {editing ? "Edit location" : "Add location"}
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
                label="Name"
                placeholder="e.g. Town centre pickup"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Postcode"
                placeholder="e.g. SW1A 1AA"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
              <Input
                label="Full address (optional)"
                placeholder="Street, town"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Input
                label="Notes (optional)"
                placeholder="e.g. Meet by the bus stop"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {sheetError && (
                <div className="text-[12px]" style={{ color: "#CC2229" }}>
                  {sheetError}
                </div>
              )}

              <Button onClick={save} disabled={saving || !userId}>
                {saving ? "Saving…" : editing ? "Update location" : "Save location"}
              </Button>

              {editing && (
                <button
                  type="button"
                  onClick={remove}
                  className="text-[13px] font-medium py-2"
                  style={{ color: "#CC2229" }}
                >
                  Delete location
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
