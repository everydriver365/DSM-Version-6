import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../components/dsm/Input";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My profile — DSM by EveryDriver" }] }),
  component: ProfilePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

function initials(name: string, email: string) {
  const src = name.trim() || email.split("@")[0] || "";
  const parts = src.split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

function ProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const { data: inst } = await supabase
        .from("instructors")
        .select("name, phone, bio, car_make, car_model, profile_image_url")
        .eq("id", user.id)
        .maybeSingle();
      if (inst) {
        setName(inst.name ?? "");
        setPhone(inst.phone ?? "");
        setBio(inst.bio ?? "");
        setCarMake(inst.car_make ?? "");
        setCarModel(inst.car_model ?? "");
        setImageUrl(inst.profile_image_url ?? null);
      }
    })();
  }, [navigate]);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !userId) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
      toast.error("Use a PNG or JPG image");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const ext = f.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, f, { contentType: f.type, upsert: true });
    if (upErr) {
      console.error("[profile] avatar upload", upErr);
      toast.error("Couldn't upload photo");
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setImageUrl(pub.publicUrl);
    setUploading(false);
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("instructors").upsert({
      id: userId,
      name: name.trim() || email.split("@")[0],
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      car_make: carMake.trim() || null,
      car_model: carModel.trim() || null,
      profile_image_url: imageUrl,
    });
    setSaving(false);
    if (error) {
      console.error("[profile] save", error);
      toast.error("Couldn't save profile");
      return;
    }
    toast.success("Saved");
  }

  return (
    <div className="min-h-screen bg-white" style={POPPINS}>
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
          onClick={save}
          disabled={saving}
          className="text-[14px] font-medium text-white disabled:opacity-50 px-2"
          style={POPPINS}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="px-4 pb-12">
        {/* Avatar */}
        <div className="mt-4 flex flex-col items-center">
          <div
            className="rounded-full overflow-hidden flex items-center justify-center text-[24px] font-semibold text-white"
            style={{ width: 80, height: 80, backgroundColor: "#1A52A0", ...POPPINS }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{initials(name, email)}</span>
            )}
          </div>
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
            className="mt-2 text-[13px] disabled:opacity-50"
            style={{ color: "#1A52A0", ...POPPINS }}
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
        </div>

        <SectionHeader>PERSONAL DETAILS</SectionHeader>
        <div className="flex flex-col gap-3">
          <Input
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07…"
            inputMode="tel"
          />
          <div className="w-full">
            <label
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={POPPINS}
            >
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
        </div>

        <SectionHeader>VEHICLE</SectionHeader>
        <div className="flex flex-col gap-3">
          <Input
            label="Car make"
            value={carMake}
            onChange={(e) => setCarMake(e.target.value)}
            placeholder="e.g. Vauxhall"
          />
          <Input
            label="Car model"
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            placeholder="e.g. Corsa"
          />
        </div>

        <SectionHeader>ACCOUNT</SectionHeader>
        <div
          className="bg-[#F8F9FB] rounded-xl px-4 py-3 flex items-center justify-between"
          style={{
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#E2E6ED",
          }}
        >
          <span className="text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
            Email
          </span>
          <span className="text-[14px] text-[#0F2044] truncate ml-3" style={POPPINS}>
            {email || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
