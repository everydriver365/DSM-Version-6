import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/listings")({
  component: AdminListingsPage,
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price_type: string | null;
  price_amount: number | null;
  price_display: string | null;
  condition: string | null;
  location: string | null;
  image_urls: string[] | null;
  contact_type: string | null;
  contact_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  listing_type: string | null;
  tags: string[] | null;
  is_active: boolean;
  is_featured: boolean | null;
  created_at: string;
  instructor_id: string | null;
  supplier_id: string | null;
  category_id: string | null;
  deleted_at: string | null;
  marketplace_categories?: { name: string } | null;
  instructors?: { name: string } | null;
};

type Filter = "all" | "pending" | "live" | "instructor" | "supplier";

async function restPatch(id: string, body: Record<string, unknown>) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token ?? SUPABASE_ANON_KEY;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/marketplace_listings?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Category = { id: string; name: string };

type NewListingDraft = {
  supplierName: string;
  supplierWebsite: string;
  supplierLogo: string;
  supplierVerified: boolean;
  categoryId: string;
  title: string;
  description: string;
  priceDisplay: string;
  priceType: "fixed" | "poa" | "free";
  contactType: "website" | "email" | "phone";
  contactValue: string;
  isFeatured: boolean;
  isVerified: boolean;
  isActive: boolean;
  images: [string, string, string, string];
};

const emptyDraft: NewListingDraft = {
  supplierName: "",
  supplierWebsite: "",
  supplierLogo: "",
  supplierVerified: true,
  categoryId: "",
  title: "",
  description: "",
  priceDisplay: "",
  priceType: "fixed",
  contactType: "website",
  contactValue: "",
  isFeatured: false,
  isVerified: true,
  isActive: true,
  images: ["", "", "", ""],
};

function AdminListingsPage() {
  const navigate = useNavigate();
  const [gate, setGate] = useState<"checking" | "allowed" | "denied">("checking");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Listing>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<NewListingDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        if (!cancelled) {
          setGate("denied");
          navigate({ to: "/home" });
        }
        return;
      }
      const { data: rows } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", userId)
        .limit(1);
      if (cancelled) return;
      if (!rows || rows.length === 0) {
        setGate("denied");
        navigate({ to: "/home" });
        return;
      }
      setGate("allowed");
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (gate !== "allowed") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*,marketplace_categories(name),instructors(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("[admin/listings]", error);
        toast.error("Failed to load listings");
      } else {
        setListings((data ?? []) as Listing[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [gate]);

  useEffect(() => {
    if (gate !== "allowed") return;
    (async () => {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("id,name")
        .order("name", { ascending: true });
      if (error) {
        console.error("[admin/listings] categories", error);
        return;
      }
      setCategories((data ?? []) as Category[]);
    })();
  }, [gate]);

  async function refetchListings() {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*,marketplace_categories(name),instructors(name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin/listings] refetch", error);
      return;
    }
    setListings((data ?? []) as Listing[]);
  }

  async function handleCreateSupplierListing() {
    if (!draft.supplierName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!draft.description.trim()) {
      toast.error("Description is required");
      return;
    }
    setSaving(true);
    try {
      const { data: supplierRow, error: supplierErr } = await supabase
        .from("marketplace_suppliers")
        .insert({
          name: draft.supplierName.trim(),
          website_url: draft.supplierWebsite.trim() || null,
          logo_url: draft.supplierLogo.trim() || null,
          is_verified: draft.supplierVerified,
          is_featured: draft.isFeatured,
        })
        .select("id")
        .single();
      if (supplierErr || !supplierRow) throw supplierErr ?? new Error("Supplier insert failed");

      const images = draft.images.map((s) => s.trim()).filter(Boolean);
      const listingPayload: Record<string, unknown> = {
        supplier_id: supplierRow.id,
        category_id: draft.categoryId || null,
        title: draft.title.trim(),
        description: draft.description.trim(),
        price_display: draft.priceDisplay.trim() || null,
        price_type: draft.priceType,
        contact_type: draft.contactType,
        is_active: draft.isActive,
        is_featured: draft.isFeatured,
        is_verified: draft.isVerified,
        listing_type: "supplier",
        image_urls: images,
      };
      const contactVal = draft.contactValue.trim() || null;
      if (draft.contactType === "website") listingPayload.contact_url = contactVal;
      else if (draft.contactType === "email") listingPayload.contact_email = contactVal;
      else listingPayload.contact_phone = contactVal;

      const { error: listErr } = await supabase
        .from("marketplace_listings")
        .insert(listingPayload);
      if (listErr) throw listErr;

      toast.success("Supplier listing created");
      setSheetOpen(false);
      setDraft(emptyDraft);
      await refetchListings();
    } catch (e) {
      console.error("[admin/listings] create", e);
      const msg = e instanceof Error ? e.message : "Failed to create listing";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const pending = listings.filter((l) => !l.is_active).length;
    const live = listings.filter((l) => l.is_active).length;
    return { pending, live, total: listings.length };
  }, [listings]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "pending":
        return listings.filter((l) => !l.is_active);
      case "live":
        return listings.filter((l) => l.is_active);
      case "instructor":
        return listings.filter((l) => l.listing_type === "instructor");
      case "supplier":
        return listings.filter((l) => l.listing_type === "supplier");
      default:
        return listings;
    }
  }, [listings, filter]);

  async function notify(instructorId: string | null, message: string) {
    if (!instructorId) return;
    const { error } = await supabase.from("instructor_notifications").insert({
      instructor_id: instructorId,
      message,
    });
    if (error) console.error("[admin/listings] notify", error);
  }

  async function handleApprove(l: Listing) {
    try {
      await restPatch(l.id, { is_active: true });
      await notify(
        l.instructor_id,
        `✓ Your listing '${l.title}' is now live on the DSM Marketplace!`,
      );
      setListings((prev) =>
        prev.map((x) => (x.id === l.id ? { ...x, is_active: true } : x)),
      );
      toast.success("Listing published");
    } catch (e) {
      console.error(e);
      toast.error("Failed to publish");
    }
  }

  async function handleReject(l: Listing) {
    try {
      await restPatch(l.id, { deleted_at: new Date().toISOString() });
      await notify(
        l.instructor_id,
        `Your listing '${l.title}' was not approved. ${rejectReason}`,
      );
      setListings((prev) => prev.filter((x) => x.id !== l.id));
      setRejectingId(null);
      setRejectReason("");
      toast.success("Listing rejected");
    } catch (e) {
      console.error(e);
      toast.error("Failed to reject");
    }
  }

  async function handleToggleFeatured(l: Listing) {
    try {
      const next = !l.is_featured;
      await restPatch(l.id, { is_featured: next });
      setListings((prev) =>
        prev.map((x) => (x.id === l.id ? { ...x, is_featured: next } : x)),
      );
      toast.success(next ? "Featured" : "Unfeatured");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update");
    }
  }

  function startEdit(l: Listing) {
    setEditingId(l.id);
    setEditDraft({
      title: l.title,
      description: l.description,
      price_display: l.price_display,
      category_id: l.category_id,
    });
  }

  async function saveEdit(l: Listing) {
    try {
      const patch: Record<string, unknown> = {
        title: editDraft.title,
        description: editDraft.description,
        price_display: editDraft.price_display,
      };
      if (editDraft.category_id) patch.category_id = editDraft.category_id;
      await restPatch(l.id, patch);
      setListings((prev) =>
        prev.map((x) => (x.id === l.id ? { ...x, ...patch } as Listing : x)),
      );
      setEditingId(null);
      setEditDraft({});
      toast.success("Listing updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update");
    }
  }

  if (gate === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
        Checking access…
      </div>
    );
  }
  if (gate === "denied") return null;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "Inter, sans-serif", paddingBottom: 40 }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          background: "#CC2229",
          color: "#fff",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          aria-label="Back"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Marketplace listings</span>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255,255,255,0.18)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> Add supplier listing
        </button>
      </div>

      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 16 }}>
          <StatCard label="Pending review" value={stats.pending} color="#B45309" bg="#FEF3C7" />
          <StatCard label="Live" value={stats.live} color="#166534" bg="#DCFCE7" />
          <StatCard label="Total" value={stats.total} color="#0B1F3A" bg="#EEF2F7" />
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px" }}>
          {(
            [
              ["all", "All"],
              ["pending", "Pending review"],
              ["live", "Live"],
              ["instructor", "Instructor listings"],
              ["supplier", "Supplier listings"],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              style={{
                whiteSpace: "nowrap",
                padding: "8px 12px",
                borderRadius: 999,
                border: "0.5px solid #E2E6ED",
                background: filter === k ? "#0F2044" : "#fff",
                color: filter === k ? "#fff" : "#0B1F3A",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 24, color: "#6B7280" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, color: "#6B7280" }}>No listings.</div>
        ) : (
          filtered.map((l) => {
            const images = Array.isArray(l.image_urls)
              ? l.image_urls
              : (typeof l.image_urls === "string" ? JSON.parse(l.image_urls) : []);
            const firstImage = images[0];
            const expanded = expandedId === l.id;
            const editing = editingId === l.id;
            const rejecting = rejectingId === l.id;
            return (
              <div
                key={l.id}
                style={{
                  background: "#fff",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                  borderRadius: 12,
                  padding: 16,
                  marginLeft: 16,
                  marginRight: 16,
                  marginBottom: 8,
                }}
              >
                <div
                  onClick={() => setExpandedId(expanded ? null : l.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontWeight: 700, color: "#0B1F3A", fontSize: 15 }}>{l.title}</div>
                    {l.marketplace_categories?.name && (
                      <Badge color="#0B1F3A" bg="#EEF2F7">{l.marketplace_categories.name}</Badge>
                    )}
                  </div>
                  <div style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
                    {l.instructors?.name ?? "—"}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {l.listing_type === "instructor" ? (
                      <Badge color="#1E40AF" bg="#DBEAFE">Instructor</Badge>
                    ) : (
                      <Badge color="#6D28D9" bg="#EDE9FE">Supplier</Badge>
                    )}
                    {l.is_active ? (
                      <Badge color="#166534" bg="#DCFCE7">Live</Badge>
                    ) : (
                      <Badge color="#B45309" bg="#FEF3C7">Pending</Badge>
                    )}
                    {l.is_featured && <Badge color="#92400E" bg="#FEF3C7">Featured</Badge>}
                  </div>
                  <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 6 }}>
                    Submitted {new Date(l.created_at).toLocaleDateString()}
                  </div>
                </div>

                {expanded && (
                  <div style={{ marginTop: 12, borderTop: "0.5px solid #E2E6ED", paddingTop: 12 }}>
                    {editing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <Field label="Title">
                          <input
                            value={editDraft.title ?? ""}
                            onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            value={editDraft.description ?? ""}
                            onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                            style={{ ...inputStyle, minHeight: 80 }}
                          />
                        </Field>
                        <Field label="Price display">
                          <input
                            value={editDraft.price_display ?? ""}
                            onChange={(e) => setEditDraft({ ...editDraft, price_display: e.target.value })}
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Category ID">
                          <input
                            value={editDraft.category_id ?? ""}
                            onChange={(e) => setEditDraft({ ...editDraft, category_id: e.target.value })}
                            style={inputStyle}
                          />
                        </Field>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => saveEdit(l)} style={primaryBtn("#0F2044")}>Save</button>
                          <button type="button" onClick={() => { setEditingId(null); setEditDraft({}); }} style={ghostBtn}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {l.description && (
                          <Detail label="Description" value={l.description} />
                        )}
                        {l.price_display && <Detail label="Price" value={l.price_display} />}
                        {l.location && <Detail label="Location" value={l.location} />}
                        {l.condition && <Detail label="Condition" value={l.condition} />}
                        {(l.contact_url || l.contact_email || l.contact_phone) && (
                          <Detail
                            label="Contact"
                            value={[l.contact_type, l.contact_url, l.contact_email, l.contact_phone]
                              .filter(Boolean)
                              .join(" · ")}
                          />
                        )}
                        {l.tags && l.tags.length > 0 && (
                          <Detail label="Tags" value={l.tags.join(", ")} />
                        )}
                        {firstImage && (
                          <img
                            src={firstImage}
                            alt={l.title}
                            style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, marginBottom: 12 }}
                          />
                        )}
                      </>
                    )}

                    {rejecting ? (
                      <div style={{ marginTop: 12 }}>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection"
                          style={{ ...inputStyle, minHeight: 70 }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button type="button" onClick={() => handleReject(l)} style={primaryBtn("#CC2229")}>
                            Confirm reject
                          </button>
                          <button type="button" onClick={() => { setRejectingId(null); setRejectReason(""); }} style={ghostBtn}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                        {!l.is_active && (
                          <button type="button" onClick={() => handleApprove(l)} style={primaryBtn("#16A34A")}>
                            Approve & publish
                          </button>
                        )}
                        <button type="button" onClick={() => setRejectingId(l.id)} style={primaryBtn("#CC2229")}>
                          Reject
                        </button>
                        {!editing && (
                          <button type="button" onClick={() => startEdit(l)} style={ghostBtn}>
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(l)}
                          style={{
                            ...ghostBtn,
                            background: l.is_featured ? "#FEF3C7" : "#fff",
                            borderColor: l.is_featured ? "#F59E0B" : "#0F2044",
                            color: l.is_featured ? "#92400E" : "#0F2044",
                          }}
                        >
                          {l.is_featured ? "★ Featured" : "Feature this listing"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {sheetOpen && (
        <SupplierListingSheet
          draft={draft}
          setDraft={setDraft}
          categories={categories}
          saving={saving}
          onClose={() => setSheetOpen(false)}
          onSave={handleCreateSupplierListing}
        />
      )}
    </div>
  );
}

function SupplierListingSheet({
  draft,
  setDraft,
  categories,
  saving,
  onClose,
  onSave,
}: {
  draft: NewListingDraft;
  setDraft: (d: NewListingDraft) => void;
  categories: Category[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const upd = <K extends keyof NewListingDraft>(k: K, v: NewListingDraft[K]) =>
    setDraft({ ...draft, [k]: v });
  const setImage = (i: number, v: string) => {
    const next = [...draft.images] as [string, string, string, string];
    next[i] = v;
    setDraft({ ...draft, images: next });
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "0.5px solid #E2E6ED",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A" }}>
            New supplier listing
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: "auto",
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#F3F4F6",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0B1F3A",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
          <Section title="Supplier">
            <Field label="Supplier name *">
              <input value={draft.supplierName} onChange={(e) => upd("supplierName", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Website URL">
              <input value={draft.supplierWebsite} onChange={(e) => upd("supplierWebsite", e.target.value)} style={inputStyle} placeholder="https://" />
            </Field>
            <Field label="Logo URL">
              <input value={draft.supplierLogo} onChange={(e) => upd("supplierLogo", e.target.value)} style={inputStyle} placeholder="https://" />
            </Field>
            <Toggle label="Verified supplier" value={draft.supplierVerified} onChange={(v) => upd("supplierVerified", v)} />
          </Section>

          <Section title="Listing details">
            <Field label="Category">
              <select value={draft.categoryId} onChange={(e) => upd("categoryId", e.target.value)} style={inputStyle}>
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Title *">
              <input value={draft.title} onChange={(e) => upd("title", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Description *">
              <textarea value={draft.description} onChange={(e) => upd("description", e.target.value)} style={{ ...inputStyle, minHeight: 90 }} />
            </Field>
            <Field label="Price display">
              <input value={draft.priceDisplay} onChange={(e) => upd("priceDisplay", e.target.value)} style={inputStyle} placeholder="From £14.99/month" />
            </Field>
            <Field label="Price type">
              <div style={{ display: "flex", gap: 6 }}>
                {(["fixed", "poa", "free"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => upd("priceType", t)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "0.5px solid #E2E6ED",
                      background: draft.priceType === t ? "#0F2044" : "#fff",
                      color: draft.priceType === t ? "#fff" : "#0B1F3A",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Contact">
            <Field label="Contact type">
              <div style={{ display: "flex", gap: 6 }}>
                {(["website", "email", "phone"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => upd("contactType", t)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "0.5px solid #E2E6ED",
                      background: draft.contactType === t ? "#0F2044" : "#fff",
                      color: draft.contactType === t ? "#fff" : "#0B1F3A",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={draft.contactType === "website" ? "URL" : draft.contactType === "email" ? "Email" : "Phone"}>
              <input
                value={draft.contactValue}
                onChange={(e) => upd("contactValue", e.target.value)}
                style={inputStyle}
                placeholder={
                  draft.contactType === "website"
                    ? "https://"
                    : draft.contactType === "email"
                    ? "name@example.com"
                    : "+44 …"
                }
              />
            </Field>
          </Section>

          <Section title="Images (up to 4 URLs)">
            {draft.images.map((val, i) => (
              <Field key={i} label={`Image ${i + 1}`}>
                <input value={val} onChange={(e) => setImage(i, e.target.value)} style={inputStyle} placeholder="https://" />
              </Field>
            ))}
          </Section>

          <Section title="Settings">
            <Toggle label="Featured (show in featured carousel)" value={draft.isFeatured} onChange={(v) => upd("isFeatured", v)} />
            <Toggle label="Verified badge" value={draft.isVerified} onChange={(v) => upd("isVerified", v)} />
            <Toggle label="Active (publish immediately)" value={draft.isActive} onChange={(v) => upd("isActive", v)} />
          </Section>
        </div>

        <div style={{ padding: 16, borderTop: "0.5px solid #E2E6ED", display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} style={{ ...ghostBtn, flex: 1 }} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            style={{ ...primaryBtn("#0F2044"), flex: 2, opacity: saving ? 0.6 : 1 }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Create listing"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        style={{
          width: 40,
          height: 24,
          borderRadius: 999,
          border: "none",
          background: value ? "#16A34A" : "#D1D5DB",
          position: "relative",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 18 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </button>
      <span style={{ fontSize: 13, color: "#0B1F3A" }}>{label}</span>
    </label>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, color, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 }}>
      {children}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#0B1F3A", whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  border: "0.5px solid #E2E6ED",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "Inter, sans-serif",
  color: "#0B1F3A",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
};

function primaryBtn(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
}

const ghostBtn: React.CSSProperties = {
  background: "#fff",
  color: "#0F2044",
  border: "1px solid #0F2044",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};