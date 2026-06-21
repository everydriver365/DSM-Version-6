import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Smartphone,
  Camera,
  Check,
  AlertTriangle,
  User,
  Briefcase,
  Car,
  Bell,
  Shield,
  Puzzle,
  ChevronDown,
  Calendar as CalendarIcon,
  Apple,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My profile — DSM by EveryDriver" }] }),
  component: ProfilePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const AVATAR_COLORS: Record<string, string> = {
  blue: "#85B7EB",
  coral: "#F0997B",
  green: "#C0DD97",
  pink: "#ED93B1",
  purple: "#AFA9EC",
  amber: "#FAC775",
};

type TabKey =
  | "personal"
  | "business"
  | "vehicle"
  | "notifications"
  | "security"
  | "integrations"
  | "danger";

const SECTION_META: {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
}[] = [
  { key: "personal", label: "Personal", icon: User, iconColor: "#1A52A0" },
  { key: "business", label: "Business", icon: Briefcase, iconColor: "#16A34A" },
  { key: "vehicle", label: "Vehicle", icon: Car, iconColor: "#F59E0B" },
  { key: "notifications", label: "Notifications", icon: Bell, iconColor: "#7C3AED" },
  { key: "security", label: "Security", icon: Shield, iconColor: "#CC2229" },
  { key: "integrations", label: "Integrations", icon: Puzzle, iconColor: "#1A52A0" },
  { key: "danger", label: "Danger zone", icon: AlertTriangle, iconColor: "#CC2229" },
];

const NOTIF_EVENTS: { key: string; label: string }[] = [
  { key: "new_booking", label: "New booking" },
  { key: "lesson_reminder", label: "Lesson reminder" },
  { key: "payment_received", label: "Payment received" },
  { key: "payment_failed", label: "Payment failed" },
  { key: "pupil_cancelled", label: "Pupil cancelled" },
  { key: "pupil_dormant", label: "Pupil dormant 21 days" },
  { key: "test_result", label: "Test result" },
  { key: "weekly_summary", label: "Weekly summary" },
  { key: "marketing", label: "Marketing" },
];

type NotifPrefs = Record<string, { email: boolean; sms: boolean; push: boolean }>;

function defaultNotifPrefs(): NotifPrefs {
  const out: NotifPrefs = {};
  for (const e of NOTIF_EVENTS) out[e.key] = { email: true, sms: false, push: true };
  return out;
}

function initials(first: string, last: string, email: string) {
  const a = (first.trim()[0] ?? "").toUpperCase();
  const b = (last.trim()[0] ?? "").toUpperCase();
  if (a || b) return (a + b) || "?";
  const src = email.split("@")[0] ?? "";
  return (src[0] ?? "?").toUpperCase();
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  rightSlot,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="w-full">
      <label className="block mb-1 text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
        {label}
      </label>
      <div
        className="flex items-center gap-2 rounded-lg bg-white px-3"
        style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED", height: 40 }}
      >
        {icon ? <span className="flex-shrink-0">{icon}</span> : null}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          inputMode={inputMode}
          className="flex-1 bg-transparent text-[14px] text-[#1A1A2E] outline-none"
          style={POPPINS}
        />
        {rightSlot}
      </div>
    </div>
  );
}

function AccordionCard({
  sectionKey,
  isOpen,
  onToggle,
  children,
}: {
  sectionKey: TabKey;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const meta = SECTION_META.find((s) => s.key === sectionKey)!;
  const Icon = meta.icon;
  return (
    <div
      className="bg-white mb-3"
      style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED", borderRadius: 12 }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <Icon size={18} color={meta.iconColor} />
        <span className="flex-1 text-left text-[14px] font-medium text-[#1A1A2E]" style={POPPINS}>
          {meta.label}
        </span>
        <ChevronDown
          size={18}
          color="#6B7280"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms",
          }}
        />
      </button>
      {isOpen && (
        <div
          className="px-4 pb-4"
          style={{
            borderTopWidth: "0.5px",
            borderTopStyle: "solid",
            borderTopColor: "#E2E6ED",
            paddingTop: 16,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="w-full">
      <label className="block mb-1 text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg bg-white px-3 text-[14px] text-[#1A1A2E] outline-none"
        style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED", ...POPPINS }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center"
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        backgroundColor: checked ? "#1A52A0" : "#D1D5DB",
        transition: "background-color 120ms",
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: 999,
          backgroundColor: "#FFFFFF",
          transition: "left 120ms",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

function VerifiedPill() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: "#DCFCE7", color: "#15803D", ...POPPINS }}
    >
      <Check size={11} color="#15803D" /> Verified
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[16px] font-semibold text-[#0F2044] mb-3" style={POPPINS}>
      {children}
    </h2>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const dbsRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState<Record<TabKey, boolean>>({
    personal: true,
    business: false,
    vehicle: false,
    notifications: false,
    security: false,
    integrations: false,
    danger: false,
  });

  function toggleSection(key: TabKey) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Personal
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("Europe/London");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>("blue");

  // Business
  const [dvsaBadge, setDvsaBadge] = useState("");
  const [dvsaGrade, setDvsaGrade] = useState("A");
  const [dvsaType, setDvsaType] = useState("ADI");
  const [tradingName, setTradingName] = useState("");
  const [bio, setBio] = useState("");
  const [dbsUploaded, setDbsUploaded] = useState(false);
  const [dbsUrl, setDbsUrl] = useState<string | null>(null);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [serviceAreaInput, setServiceAreaInput] = useState("");

  // Vehicle
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [transmission, setTransmission] = useState("Manual");
  const [dualControls, setDualControls] = useState(false);
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null);
  const [uploadingVehicle, setUploadingVehicle] = useState(false);
  const vehiclePhotoRef = useRef<HTMLInputElement>(null);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(defaultNotifPrefs());

  // Security
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState("Authenticator app");
  const [loginAlerts, setLoginAlerts] = useState(true);
  const activeSessions = 1;

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setOriginalEmail(user.email ?? "");
      setEmailVerified(Boolean(user.email_confirmed_at));
      setPhoneVerified(Boolean((user as { phone_confirmed_at?: string }).phone_confirmed_at));
      const updatedAt = (user as { updated_at?: string }).updated_at;
      if (updatedAt) setPasswordChangedAt(updatedAt);

      const { data: inst, error: instErr } = await supabase
        .from("instructors")
        .select(
          "name, phone, bio, car_make, car_model, profile_image_url, address, email_verified, phone_verified, timezone, avatar_color, dvsa_badge, dvsa_grade, dvsa_type, trading_name, dbs_uploaded, dbs_document_url, service_areas, vehicle_make, vehicle_model, vehicle_reg, dual_controls, insurance_expiry, vehicle_photo_url, notification_prefs, two_factor_enabled, two_factor_method, login_alerts",
        )
        .eq("id", user.id)
        .maybeSingle();
      console.log("[profile] load instructor row", { userId: user.id, inst, instErr });
      if (inst) {
        const fullName = (inst.name ?? "").trim();
        const sp = fullName.split(/\s+/);
        setFirstName(sp[0] ?? "");
        setLastName(sp.slice(1).join(" "));
        setPhone(inst.phone ?? "");
        setBio(inst.bio ?? "");
        setVehicleMake(inst.vehicle_make ?? inst.car_make ?? "");
        setVehicleModel(inst.vehicle_model ?? inst.car_model ?? "");
        setImageUrl(inst.profile_image_url ?? null);
        setAddress(inst.address ?? "");
        if (inst.email_verified != null) setEmailVerified(inst.email_verified);
        if (inst.phone_verified != null) setPhoneVerified(inst.phone_verified);
        setTimezone(inst.timezone ?? "Europe/London");
        setAvatarColor(inst.avatar_color ?? "blue");
        setDvsaBadge(inst.dvsa_badge ?? "");
        setDvsaGrade(inst.dvsa_grade ?? "A");
        setDvsaType(inst.dvsa_type ?? "ADI");
        setTradingName(inst.trading_name ?? "");
        setDbsUploaded(Boolean(inst.dbs_uploaded));
        setDbsUrl(inst.dbs_document_url ?? null);
        setServiceAreas(Array.isArray(inst.service_areas) ? inst.service_areas : []);
        setVehicleReg(inst.vehicle_reg ?? "");
        setDualControls(Boolean(inst.dual_controls));
        setInsuranceExpiry(inst.insurance_expiry ?? "");
        setVehiclePhotoUrl(inst.vehicle_photo_url ?? null);
        if (inst.notification_prefs && typeof inst.notification_prefs === "object") {
          setNotifPrefs({ ...defaultNotifPrefs(), ...(inst.notification_prefs as NotifPrefs) });
        }
        setTwoFactorEnabled(Boolean(inst.two_factor_enabled));
        setTwoFactorMethod(inst.two_factor_method ?? "Authenticator app");
        if (inst.login_alerts != null) setLoginAlerts(inst.login_alerts);
      }
      setLoading(false);
    })();
  }, [navigate]);

  async function saveAll() {
    if (!userId) return;
    setSaving(true);
    const fullName = `${firstName} ${lastName}`.trim() || email.split("@")[0];
    const payload: Record<string, unknown> = {
      id: userId,
      name: fullName,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      profile_image_url: imageUrl,
      address: address.trim() || null,
      email_verified: emailVerified,
      phone_verified: phoneVerified,
      timezone,
      avatar_color: avatarColor,
      dvsa_badge: dvsaBadge.trim() || null,
      dvsa_grade: dvsaGrade || null,
      dvsa_type: dvsaType || null,
      trading_name: tradingName.trim() || null,
      dbs_uploaded: dbsUploaded,
      dbs_document_url: dbsUrl,
      service_areas: serviceAreas,
      vehicle_make: vehicleMake.trim() || null,
      vehicle_model: vehicleModel.trim() || null,
      vehicle_reg: vehicleReg.trim() || null,
      dual_controls: dualControls,
      insurance_expiry: insuranceExpiry || null,
      vehicle_photo_url: vehiclePhotoUrl,
      notification_prefs: notifPrefs,
      two_factor_enabled: twoFactorEnabled,
      two_factor_method: twoFactorMethod,
      login_alerts: loginAlerts,
    };
    console.log("[profile] save payload includes profile_image_url:", payload.profile_image_url);
    const saveResponse = await supabase.from("instructors").upsert(payload);
    console.log("[profile] save response:", saveResponse);

    const newEmail = email.trim();
    const emailChanged = newEmail.length > 0 && newEmail.toLowerCase() !== originalEmail.trim().toLowerCase();
    if (emailChanged) {
      console.log("[profile] saving email:", newEmail);
      const { data: emailData, error: emailError } = await supabase.auth.updateUser({ email: newEmail });
      console.log("[profile] auth.updateUser response:", { emailData, emailError });
      if (emailError) {
        console.error("[profile] email update", emailError);
        toast.error(emailError.message || "Couldn't update email");
        setSaving(false);
        return;
      }
      toast.success("Check your new email address to confirm the change");
    }

    setSaving(false);
    if (saveResponse.error) {
      console.error("[profile] save", saveResponse.error);
      toast.error("Couldn't save profile");
      return;
    }
    if (!emailChanged) toast.success("Saved");
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !userId) return;
    console.log("[profile] file selected:", f.name, f.size);
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
      toast.error("Use a PNG or JPG image");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    // Instant local preview
    const localPreview = URL.createObjectURL(f);
    const previousUrl = imageUrl;
    setImageUrl(localPreview);
    setUploading(true);
    try {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const uploadRes = await supabase.storage
        .from("avatars")
        .upload(path, f, { contentType: f.type, upsert: true });
      console.log("[profile] storage upload response:", uploadRes);
      if (uploadRes.error) throw uploadRes.error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      console.log("[profile] public URL:", publicUrl);
      const payload = { id: userId, profile_image_url: publicUrl };
      const avatarSaveRes = await supabase
        .from("instructors")
        .upsert(payload)
        .select();
      console.log("[profile] avatar save response:", avatarSaveRes);
      if (avatarSaveRes.error) throw avatarSaveRes.error;
      setImageUrl(publicUrl);
      URL.revokeObjectURL(localPreview);
      toast.success("Photo updated");
    } catch (err) {
      console.error("[profile] avatar upload", err);
      toast.error("Couldn't upload photo");
      setImageUrl(previousUrl);
      URL.revokeObjectURL(localPreview);
    } finally {
      setUploading(false);
    }
  }

  async function onPickDbs(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !userId) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploading(true);
    const ext = f.name.split(".").pop() ?? "pdf";
    const path = `${userId}/dbs-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, f, { contentType: f.type, upsert: true });
    if (upErr) {
      console.error("[profile] dbs upload", upErr);
      toast.error("Couldn't upload DBS");
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setDbsUrl(pub.publicUrl);
    setDbsUploaded(true);
    setUploading(false);
    toast.success("DBS uploaded");
  }

  async function onPickVehiclePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !userId) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Use an image file");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    const localPreview = URL.createObjectURL(f);
    const previous = vehiclePhotoUrl;
    setVehiclePhotoUrl(localPreview);
    setUploadingVehicle(true);
    try {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${userId}/vehicle-${Date.now()}.${ext}`;
      const uploadResult = await supabase.storage
        .from("vehicle-images")
        .upload(path, f, { contentType: f.type, upsert: true });
      if (uploadResult.error) throw uploadResult.error;
      const { data: pub } = supabase.storage.from("vehicle-images").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const saveResponse = await supabase
        .from("instructors")
        .upsert({ id: userId, vehicle_photo_url: publicUrl })
        .select();
      if (saveResponse.error) throw saveResponse.error;
      setVehiclePhotoUrl(publicUrl);
      URL.revokeObjectURL(localPreview);
      toast.success("Vehicle photo updated");
    } catch (err) {
      console.error("[profile] vehicle photo upload", err);
      toast.error("Couldn't upload vehicle photo");
      setVehiclePhotoUrl(previous);
      URL.revokeObjectURL(localPreview);
    } finally {
      setUploadingVehicle(false);
    }
  }

  async function removeVehiclePhoto() {
    if (!userId) return;
    const previous = vehiclePhotoUrl;
    setVehiclePhotoUrl(null);
    const { error } = await supabase
      .from("instructors")
      .upsert({ id: userId, vehicle_photo_url: null });
    if (error) {
      console.error("[profile] remove vehicle photo", error);
      toast.error("Couldn't remove photo");
      setVehiclePhotoUrl(previous);
      return;
    }
    toast.success("Vehicle photo removed");
  }

  function addServiceArea() {
    const v = serviceAreaInput.trim();
    if (!v) return;
    if (serviceAreas.includes(v)) {
      setServiceAreaInput("");
      return;
    }
    setServiceAreas([...serviceAreas, v]);
    setServiceAreaInput("");
  }

  function removeServiceArea(v: string) {
    setServiceAreas(serviceAreas.filter((x) => x !== v));
  }

  function setNotif(key: string, channel: "email" | "sms" | "push", value: boolean) {
    setNotifPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: value },
    }));
  }

  async function deactivate() {
    if (!userId) return;
    if (!window.confirm("Deactivate your account? You can reactivate by signing in again.")) return;
    const { error } = await supabase
      .from("instructors")
      .update({ account_status: "deactivated" })
      .eq("id", userId);
    if (error) {
      toast.error("Couldn't deactivate");
      return;
    }
    toast.success("Account deactivated");
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  async function deleteAccount() {
    if (!userId) return;
    if (deleteConfirm !== "DELETE") {
      toast.error('Type DELETE to confirm');
      return;
    }
    const { error } = await supabase
      .from("instructors")
      .update({ account_status: "deleted" })
      .eq("id", userId);
    if (error) {
      toast.error("Couldn't delete");
      return;
    }
    toast.success("Account scheduled for deletion");
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const insuranceWarning = (() => {
    if (!insuranceExpiry) return false;
    const d = new Date(insuranceExpiry);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  })();

  const currentAvatarBg = AVATAR_COLORS[avatarColor] ?? AVATAR_COLORS.blue;


  return (
    <div className="min-h-screen bg-[#F8F9FB]" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" })}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36 }}
          aria-label="Back"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="text-[15px] font-semibold text-white" style={POPPINS}>
          My profile
        </div>
        <button
          type="button"
          onClick={saveAll}
          disabled={saving || loading}
          className="text-[14px] font-medium text-white disabled:opacity-50 px-2"
          style={POPPINS}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="px-4 py-4 pb-24 max-w-3xl mx-auto">
        {/* Personal */}
        <AccordionCard sectionKey="personal" isOpen={expanded.personal} onToggle={() => toggleSection("personal")}>
          <div className="flex flex-col items-center mb-4">
            <button
              type="button"
              onClick={() => !uploading && fileRef.current?.click()}
              disabled={uploading}
              aria-label="Upload profile photo"
              className="relative rounded-full overflow-hidden flex items-center justify-center text-[24px] font-semibold text-white"
              style={{ width: 80, height: 80, backgroundColor: currentAvatarBg, ...POPPINS }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{initials(firstName, lastName, email)}</span>
              )}
              {uploading && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                >
                  <Loader2 size={24} color="#FFFFFF" className="animate-spin" />
                </div>
              )}
              <span
                className="absolute bottom-0 right-0 flex items-center justify-center rounded-full"
                style={{
                  width: 26,
                  height: 26,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E6ED",
                }}
              >
                <Camera size={14} color="#1A52A0" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onPickPhoto}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] disabled:opacity-50"
              style={{ color: "#1A52A0", ...POPPINS }}
            >
              {uploading ? "Uploading…" : imageUrl ? "Change photo" : "Upload photo"}
            </button>
            {!imageUrl && (
              <div className="mt-3 flex items-center gap-2">
                {Object.entries(AVATAR_COLORS).map(([key, hex]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAvatarColor(key)}
                    aria-label={`Avatar color ${key}`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      backgroundColor: hex,
                      outline: avatarColor === key ? "2px solid #0F2044" : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="First name" value={firstName} onChange={setFirstName} placeholder="Jane" />
            <TextField label="Last name" value={lastName} onChange={setLastName} placeholder="Smith" />
            <TextField
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              icon={<Mail size={16} color="#6B7280" />}
              rightSlot={emailVerified ? <VerifiedPill /> : null}
            />
            <TextField
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="07…"
              inputMode="tel"
              icon={<Smartphone size={16} color="#6B7280" />}
              rightSlot={phoneVerified ? <VerifiedPill /> : null}
            />
            <div className="sm:col-span-2">
              <TextField
                label="Address"
                value={address}
                onChange={setAddress}
                placeholder="Street, city, postcode"
              />
            </div>
            <div className="sm:col-span-2">
              <SelectField
                label="Timezone"
                value={timezone}
                onChange={setTimezone}
                options={[
                  { value: "Europe/London", label: "Europe/London" },
                  { value: "Europe/Dublin", label: "Europe/Dublin" },
                  { value: "Europe/Paris", label: "Europe/Paris" },
                  { value: "UTC", label: "UTC" },
                ]}
              />
            </div>
          </div>
        </AccordionCard>

        {/* Business */}
        <AccordionCard sectionKey="business" isOpen={expanded.business} onToggle={() => toggleSection("business")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="DVSA badge number" value={dvsaBadge} onChange={setDvsaBadge} placeholder="123456" />
            <SelectField
              label="DVSA grade"
              value={dvsaGrade}
              onChange={setDvsaGrade}
              options={[
                { value: "A", label: "A" },
                { value: "B", label: "B" },
                { value: "Trainee", label: "Trainee" },
              ]}
            />
            <SelectField
              label="DVSA type"
              value={dvsaType}
              onChange={setDvsaType}
              options={[
                { value: "ADI", label: "ADI" },
                { value: "PDI", label: "PDI" },
              ]}
            />
            <TextField label="Trading name" value={tradingName} onChange={setTradingName} placeholder="e.g. Jane's Driving School" />
            <div className="sm:col-span-2">
              <label className="block mb-1 text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell pupils a bit about yourself"
                className="w-full rounded-lg px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
                style={{
                  fontFamily: "Poppins, sans-serif",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                  resize: "vertical",
                }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-1 text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
                DBS certificate
              </label>
              <input
                ref={dbsRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={onPickDbs}
              />
              <button
                type="button"
                onClick={() => dbsRef.current?.click()}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-white text-left"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED" }}
              >
                <span className="flex items-center gap-2 text-[14px]" style={POPPINS}>
                  {dbsUploaded ? (
                    <>
                      <Check size={16} color="#15803D" />
                      <span className="text-[#15803D] font-medium">Uploaded</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} color="#D97706" />
                      <span className="text-[#D97706]">Upload DBS certificate</span>
                    </>
                  )}
                </span>
                <span className="text-[13px]" style={{ color: "#1A52A0", ...POPPINS }}>
                  {dbsUploaded ? "Replace" : "Upload"}
                </span>
              </button>
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-1 text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
                Service areas
              </label>
              <div
                className="rounded-lg bg-white px-2 py-2 flex flex-wrap gap-2"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED", minHeight: 44 }}
              >
                {serviceAreas.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px]"
                    style={{ backgroundColor: "#E0ECFA", color: "#0F2044", ...POPPINS }}
                  >
                    {a}
                    <button type="button" onClick={() => removeServiceArea(a)} aria-label={`Remove ${a}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F2044" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                ))}
                <input
                  value={serviceAreaInput}
                  onChange={(e) => setServiceAreaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addServiceArea();
                    }
                  }}
                  onBlur={addServiceArea}
                  placeholder="Add a town and press Enter"
                  className="flex-1 min-w-[140px] bg-transparent text-[14px] text-[#1A1A2E] outline-none px-1"
                  style={POPPINS}
                />
              </div>
            </div>
          </div>
        </AccordionCard>

        {/* Vehicle */}
        <AccordionCard sectionKey="vehicle" isOpen={expanded.vehicle} onToggle={() => toggleSection("vehicle")}>
          <input
            ref={vehiclePhotoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickVehiclePhoto}
          />
          <div className="mb-3">
            {vehiclePhotoUrl ? (
              <div>
                <img
                  src={vehiclePhotoUrl}
                  alt="Vehicle"
                  style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => vehiclePhotoRef.current?.click()}
                    disabled={uploadingVehicle}
                    className="text-[13px] disabled:opacity-50"
                    style={{ color: "#1A52A0", ...POPPINS }}
                  >
                    {uploadingVehicle ? "Uploading…" : "Change photo"}
                  </button>
                  <button
                    type="button"
                    onClick={removeVehiclePhoto}
                    disabled={uploadingVehicle}
                    className="text-[13px] disabled:opacity-50"
                    style={{ color: "#CC2229", ...POPPINS }}
                  >
                    Remove photo
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => vehiclePhotoRef.current?.click()}
                disabled={uploadingVehicle}
                className="w-full flex flex-col items-center justify-center bg-white"
                style={{
                  borderWidth: "1px",
                  borderStyle: "dashed",
                  borderColor: "#E2E6ED",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                {uploadingVehicle ? (
                  <Loader2 size={24} color="#1A52A0" className="animate-spin" />
                ) : (
                  <Car size={28} color="#F59E0B" />
                )}
                <span
                  className="mt-2 text-[13px]"
                  style={{ color: "#1A52A0", ...POPPINS }}
                >
                  {uploadingVehicle ? "Uploading…" : "Tap to upload vehicle photo"}
                </span>
                <span className="mt-1 text-[11px]" style={{ color: "#6B7280", ...POPPINS }}>
                  PNG or JPG, up to 8MB
                </span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="Make" value={vehicleMake} onChange={setVehicleMake} placeholder="Vauxhall" />
            <TextField label="Model" value={vehicleModel} onChange={setVehicleModel} placeholder="Corsa" />
            <TextField label="Registration" value={vehicleReg} onChange={setVehicleReg} placeholder="AB12 CDE" />
            <SelectField
              label="Transmission"
              value={transmission}
              onChange={setTransmission}
              options={[
                { value: "Manual", label: "Manual" },
                { value: "Automatic", label: "Automatic" },
                { value: "Both", label: "Both" },
              ]}
            />
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 sm:col-span-2"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED", height: 48 }}>
              <span className="text-[14px] text-[#1A1A2E]" style={POPPINS}>Dual controls fitted</span>
              <Toggle checked={dualControls} onChange={setDualControls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block mb-1 text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
                Insurance expiry
              </label>
              <div
                className="flex items-center gap-2 rounded-lg bg-white px-3"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED", height: 40 }}
              >
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] text-[#1A1A2E] outline-none"
                  style={POPPINS}
                />
                {insuranceWarning ? (
                  <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: "#D97706", ...POPPINS }}>
                    <AlertTriangle size={14} color="#D97706" /> Expiring soon
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </AccordionCard>

        {/* Notifications */}
        <AccordionCard sectionKey="notifications" isOpen={expanded.notifications} onToggle={() => toggleSection("notifications")}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={POPPINS}>
              <thead>
                <tr className="text-left text-[#6B7280]">
                  <th className="py-2 pr-2 font-medium">Event</th>
                  <th className="py-2 px-2 font-medium text-center">Email</th>
                  <th className="py-2 px-2 font-medium text-center">SMS</th>
                  <th className="py-2 px-2 font-medium text-center">Push</th>
                </tr>
              </thead>
              <tbody>
                {NOTIF_EVENTS.map((ev) => {
                  const pref = notifPrefs[ev.key] ?? { email: false, sms: false, push: false };
                  return (
                    <tr key={ev.key} className="border-t" style={{ borderColor: "#E2E6ED" }}>
                      <td className="py-2 pr-2 text-[#1A1A2E]">{ev.label}</td>
                      <td className="py-2 px-2"><div className="flex justify-center"><Toggle checked={pref.email} onChange={(v) => setNotif(ev.key, "email", v)} /></div></td>
                      <td className="py-2 px-2"><div className="flex justify-center"><Toggle checked={pref.sms} onChange={(v) => setNotif(ev.key, "sms", v)} /></div></td>
                      <td className="py-2 px-2"><div className="flex justify-center"><Toggle checked={pref.push} onChange={(v) => setNotif(ev.key, "push", v)} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AccordionCard>

        {/* Security */}
        <AccordionCard sectionKey="security" isOpen={expanded.security} onToggle={() => toggleSection("security")}>
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center justify-between rounded-lg bg-white px-3 py-3"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED" }}
            >
              <div>
                <div className="text-[14px] text-[#1A1A2E]" style={POPPINS}>Password</div>
                <div className="text-[12px] text-[#6B7280]" style={POPPINS}>
                  Last changed: {passwordChangedAt ? new Date(passwordChangedAt).toLocaleDateString() : "—"}
                </div>
              </div>
              <Link to="/resetpassword" className="text-[13px]" style={{ color: "#1A52A0", ...POPPINS }}>
                Change password
              </Link>
            </div>

            <div
              className="rounded-lg bg-white px-3 py-3 flex flex-col gap-3"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[#1A1A2E]" style={POPPINS}>Two-factor authentication</span>
                <Toggle checked={twoFactorEnabled} onChange={setTwoFactorEnabled} />
              </div>
              {twoFactorEnabled && (
                <SelectField
                  label="Method"
                  value={twoFactorMethod}
                  onChange={setTwoFactorMethod}
                  options={[
                    { value: "Authenticator app", label: "Authenticator app" },
                    { value: "SMS", label: "SMS" },
                  ]}
                />
              )}
            </div>

            <div
              className="flex items-center justify-between rounded-lg bg-white px-3 py-3"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED" }}
            >
              <div>
                <div className="text-[14px] text-[#1A1A2E]" style={POPPINS}>Active sessions</div>
                <div className="text-[12px] text-[#6B7280]" style={POPPINS}>{activeSessions} device signed in</div>
              </div>
            </div>

            <div
              className="flex items-center justify-between rounded-lg bg-white px-3 py-3"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED" }}
            >
              <span className="text-[14px] text-[#1A1A2E]" style={POPPINS}>Login alerts</span>
              <Toggle checked={loginAlerts} onChange={setLoginAlerts} />
            </div>
          </div>
        </AccordionCard>

        {/* Integrations */}
        <AccordionCard sectionKey="integrations" isOpen={expanded.integrations} onToggle={() => toggleSection("integrations")}>
          <div className="flex flex-col gap-3">
            <Link
              to="/calendarsync"
              className="flex items-center gap-3 rounded-lg bg-white px-3 py-3 hover:bg-[#F8F9FB]"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED" }}
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 36, height: 36, backgroundColor: "#E8F0FE" }}
              >
                <CalendarIcon size={20} color="#4285F4" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-[#1A1A2E]" style={POPPINS}>Google Calendar</div>
                <div className="text-[12px] text-[#6B7280]" style={POPPINS}>
                  Two-way sync your DSM schedule with Google Calendar
                </div>
              </div>
            </Link>

            <Link
              to="/calendarsync"
              className="flex items-center gap-3 rounded-lg bg-white px-3 py-3 hover:bg-[#F8F9FB]"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED" }}
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 36, height: 36, backgroundColor: "#F3F4F6" }}
              >
                <Apple size={20} color="#000000" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-[#1A1A2E]" style={POPPINS}>Apple Calendar</div>
                <div className="text-[12px] text-[#6B7280]" style={POPPINS}>
                  Subscribe to your DSM schedule on iPhone
                </div>
              </div>
            </Link>
          </div>
        </AccordionCard>

        {/* Danger zone */}
        <AccordionCard sectionKey="danger" isOpen={expanded.danger} onToggle={() => toggleSection("danger")}>
          <div className="flex flex-col gap-4">
            <div
              className="rounded-lg p-3 flex items-center justify-between"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#FCD34D", backgroundColor: "#FFFBEB" }}
            >
              <div>
                <div className="text-[14px] font-medium text-[#92400E]" style={POPPINS}>Deactivate account</div>
                <div className="text-[12px] text-[#92400E]" style={POPPINS}>
                  Temporarily disable your account. You can sign back in to reactivate.
                </div>
              </div>
              <button
                type="button"
                onClick={deactivate}
                className="text-[13px] font-medium px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#D97706", color: "#FFFFFF", ...POPPINS }}
              >
                Deactivate
              </button>
            </div>

            <div
              className="rounded-lg p-3"
              style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" }}
            >
              <div className="text-[14px] font-medium text-[#991B1B]" style={POPPINS}>Delete account</div>
              <div className="text-[12px] text-[#991B1B] mb-2" style={POPPINS}>
                Permanently delete your account and data. Type DELETE to confirm.
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type DELETE"
                  className="flex-1 h-10 rounded-lg bg-white px-3 text-[14px] outline-none"
                  style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#FCA5A5", ...POPPINS }}
                />
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleteConfirm !== "DELETE"}
                  className="text-[13px] font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: "#DC2626", color: "#FFFFFF", ...POPPINS }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </AccordionCard>
      </div>
    </div>
  );
}
