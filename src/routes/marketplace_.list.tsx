import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Tag,
  Briefcase,
  X,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

export const Route = createFileRoute("/marketplace/list")({
  component: MarketplaceListPage,
});

interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

type ListingType = "product" | "service";
type PriceType = "fixed" | "poa" | "free";
type ContactMethod = "website" | "email" | "phone";
type Condition = "New" | "Used" | "Refurbished";

const MAX_IMAGES = 4;

function MarketplaceListPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listingType, setListingType] = useState<ListingType>("product");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("fixed");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [condition, setCondition] = useState<Condition | "">("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [contactValue, setContactValue] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/marketplace_categories?is_active=eq.true&order=display_order.asc`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
        const data = (await res.json()) as Category[];
        setCategories(data);
      } catch (err) {
        console.error("[list] load cats", err);
      }
    })();
  }, []);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5),
    [tagsInput],
  );

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return;
    setImages([...images, ...files.slice(0, room)]);
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages(images.filter((_, i) => i !== idx));
  }

  function validate(): string | null {
    if (!categoryId) return "Please choose a category";
    if (!title.trim()) return "Please add a title";
    if (!description.trim()) return "Please add a description";
    if (priceType === "fixed" && !priceAmount.trim())
      return "Please add a price amount";
    if (!contactValue.trim()) return "Please add contact details";
    return null;
  }

  async function uploadImages(userId: string): Promise<string[]> {
    const urls: string[] = [];
    for (const file of images) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("marketplace-images")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage
        .from("marketplace-images")
        .getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast.error("Please sign in to list a product");
        setSubmitting(false);
        return;
      }

      const image_urls = images.length ? await uploadImages(userId) : [];

      const payload: Record<string, unknown> = {
        instructor_id: userId,
        category_id: categoryId,
        title: title.trim(),
        description: description.trim(),
        price_type: priceType,
        price_amount:
          priceType === "fixed" && priceAmount ? Number(priceAmount) : null,
        price_display:
          priceDisplay.trim() ||
          (priceType === "free"
            ? "Free"
            : priceType === "poa"
              ? "POA"
              : priceAmount
                ? `£${priceAmount}`
                : null),
        condition: listingType === "product" && condition ? condition : null,
        location: location.trim() || null,
        image_urls,
        contact_type: contactMethod,
        contact_url: contactMethod === "website" ? contactValue.trim() : null,
        contact_email: contactMethod === "email" ? contactValue.trim() : null,
        contact_phone: contactMethod === "phone" ? contactValue.trim() : null,
        listing_type: "instructor",
        tags: tags.length ? tags : null,
        is_active: false,
      };

      const { error: insertErr } = await supabase
        .from("marketplace_listings")
        .insert(payload);
      if (insertErr) throw insertErr;

      await supabase.from("instructor_notifications").insert({
        instructor_id: userId,
        message:
          "Your listing has been submitted for review. We'll notify you when it goes live.",
      });

      setSubmitted(true);
    } catch (e) {
      console.error("[list] submit failed", e);
      toast.error("Could not submit listing. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
        <TopBar onBack={() => navigate({ to: "/marketplace" })} />
        <div
          style={{
            padding: 32,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CheckCircle2 size={56} color="#00B5A5" />
          <div
            style={{ fontSize: 20, fontWeight: 700, color: "#0F2044" }}
          >
            Listing submitted!
          </div>
          <div style={{ fontSize: 14, color: "#6B7280", maxWidth: 320 }}>
            We'll review it within 24 hours and notify you when it goes live.
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/marketplace" })}
            style={{
              marginTop: 16,
              background: "#1A52A0",
              color: "#FFFFFF",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              padding: "12px 20px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Back to marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "#FFFFFF", paddingBottom: 120 }}
    >
      <TopBar onBack={() => navigate({ to: "/marketplace" })} />

      {/* Intro */}
      <div
        style={{
          background: "#FFFBEB",
          borderBottom: "0.5px solid #FDE68A",
          padding: 16,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Tag size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 14, color: "#0F2044", fontWeight: 600 }}>
            List your product or service free. Reach thousands of driving
            instructors.
          </div>
          <div
            style={{ fontSize: 12, color: "#92400E", marginTop: 4 }}
          >
            DSM listings are moderated before going live.
          </div>
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Listing type */}
        <Field label="Listing type">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <TypePill
              active={listingType === "product"}
              onClick={() => setListingType("product")}
              icon={<Tag size={16} />}
              label="Product / Equipment"
            />
            <TypePill
              active={listingType === "service"}
              onClick={() => setListingType("service")}
              icon={<Briefcase size={16} />}
              label="Service / Business"
            />
          </div>
        </Field>

        {/* Category */}
        <Field label="Category" required>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {/* Title */}
        <Field
          label="Title"
          required
          hint={`${title.length}/80`}
        >
          <input
            type="text"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2019 Vauxhall Corsa dual controls"
            style={inputStyle}
          />
        </Field>

        {/* Description */}
        <Field
          label="Description"
          required
          hint={`${description.length}/500`}
        >
          <textarea
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Describe what you're offering…"
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>

        {/* Price */}
        <Field label="Price">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            <PricePill active={priceType === "fixed"} onClick={() => setPriceType("fixed")}>
              Fixed
            </PricePill>
            <PricePill active={priceType === "poa"} onClick={() => setPriceType("poa")}>
              POA / Quote
            </PricePill>
            <PricePill active={priceType === "free"} onClick={() => setPriceType("free")}>
              Free
            </PricePill>
          </div>
          {priceType === "fixed" && (
            <div style={{ position: "relative", marginBottom: 8 }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6B7280",
                  fontSize: 14,
                }}
              >
                £
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                placeholder="0.00"
                style={{ ...inputStyle, paddingLeft: 26 }}
              />
            </div>
          )}
          <input
            type="text"
            value={priceDisplay}
            onChange={(e) => setPriceDisplay(e.target.value)}
            placeholder='Price display text (e.g. "From £299" or "£14.99/month")'
            style={inputStyle}
          />
        </Field>

        {/* Condition */}
        {listingType === "product" && (
          <Field label="Condition">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["New", "Used", "Refurbished"] as Condition[]).map((c) => (
                <PricePill
                  key={c}
                  active={condition === c}
                  onClick={() => setCondition(condition === c ? "" : c)}
                >
                  {c}
                </PricePill>
              ))}
            </div>
          </Field>
        )}

        {/* Location */}
        <Field label="Location">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Winchester, Hampshire or UK-wide"
            style={inputStyle}
          />
        </Field>

        {/* Images */}
        <Field label={`Images (up to ${MAX_IMAGES})`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {previews.map((src, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  background: `#F3F8FF url(${src}) center/cover`,
                  border: "0.5px solid #E2E6ED",
                }}
              >
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  aria-label="Remove image"
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: "#0F2044",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  border: "0.5px dashed #A0AEC0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6B7280",
                  cursor: "pointer",
                }}
              >
                <Upload size={18} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagePick}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
        </Field>

        {/* Contact */}
        <Field label="How should people contact you?" required>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            <PricePill active={contactMethod === "website"} onClick={() => setContactMethod("website")}>
              Website
            </PricePill>
            <PricePill active={contactMethod === "email"} onClick={() => setContactMethod("email")}>
              Email
            </PricePill>
            <PricePill active={contactMethod === "phone"} onClick={() => setContactMethod("phone")}>
              Phone
            </PricePill>
          </div>
          <input
            type={contactMethod === "email" ? "email" : contactMethod === "phone" ? "tel" : "url"}
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            placeholder={
              contactMethod === "website"
                ? "https://…"
                : contactMethod === "email"
                  ? "you@example.com"
                  : "07…"
            }
            style={inputStyle}
          />
        </Field>

        {/* Tags */}
        <Field label="Tags" hint="Comma separated, max 5">
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. dual controls, corsa, hampshire"
            style={inputStyle}
          />
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6B7280",
                    background: "#F3F4F6",
                    padding: "3px 8px",
                    borderRadius: 999,
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </Field>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            style={{
              flex: 1,
              background: "#FFFFFF",
              color: "#0F2044",
              border: "0.5px solid #0F2044",
              fontSize: 14,
              fontWeight: 700,
              padding: "12px 16px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2,
              background: "#1A52A0",
              color: "#FFFFFF",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              padding: "12px 16px",
              borderRadius: 10,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Submitting…" : "Submit for review →"}
          </button>
        </div>
      </div>

      {showPreview && (
        <PreviewSheet
          title={title}
          description={description}
          priceDisplay={
            priceDisplay ||
            (priceType === "free"
              ? "Free"
              : priceType === "poa"
                ? "POA"
                : priceAmount
                  ? `£${priceAmount}`
                  : "")
          }
          image={previews[0]}
          categoryName={categories.find((c) => c.id === categoryId)?.name}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        background: "#0F2044",
        color: "#FFFFFF",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        style={{
          background: "transparent",
          border: "none",
          color: "#FFFFFF",
          cursor: "pointer",
          padding: 0,
          display: "flex",
        }}
      >
        <ArrowLeft size={22} />
      </button>
      <div style={{ fontSize: 16, fontWeight: 700 }}>List your product</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <label style={{ fontSize: 13, fontWeight: 600, color: "#0F2044" }}>
          {label}
          {required && <span style={{ color: "#DC2626" }}> *</span>}
        </label>
        {hint && <span style={{ fontSize: 11, color: "#6B7280" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TypePill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "14px 8px",
        borderRadius: 12,
        border: active ? "1px solid #0F2044" : "0.5px solid #E2E6ED",
        background: active ? "#0F2044" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#0F2044",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function PricePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: active ? "none" : "0.5px solid #E2E6ED",
        background: active ? "#0F2044" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#0F2044",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "0.5px solid #E2E6ED",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: "#0F2044",
  background: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
};

function PreviewSheet({
  title,
  description,
  priceDisplay,
  image,
  categoryName,
  onClose,
}: {
  title: string;
  description: string;
  priceDisplay: string;
  image?: string;
  categoryName?: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,32,68,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          width: "100%",
          maxWidth: 520,
          borderRadius: "16px 16px 0 0",
          padding: 16,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F2044" }}>
            Preview
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6B7280",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            border: "0.5px solid #E2E6ED",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 160,
              background: image
                ? `#F3F8FF url(${image}) center/cover`
                : "linear-gradient(135deg,#0F2044,#1A52A0)",
            }}
          />
          <div style={{ padding: 12 }}>
            {categoryName && (
              <span
                style={{
                  display: "inline-block",
                  background: "#EEF2F7",
                  color: "#0F2044",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  marginBottom: 6,
                }}
              >
                {categoryName}
              </span>
            )}
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0F2044",
                marginBottom: 6,
              }}
            >
              {title || "Listing title"}
            </div>
            {priceDisplay && (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#00B5A5",
                  marginBottom: 6,
                }}
              >
                {priceDisplay}
              </div>
            )}
            <div
              style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}
            >
              {description || "Description will appear here."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}