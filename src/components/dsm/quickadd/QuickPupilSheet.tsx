import { useState } from "react";
import { toast } from "@/lib/toast";
import { BottomSheet } from "../BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";
import { FONT, NAVY, TextField, SheetFooter } from "./fields";
import { AddressLookup } from "@/components/dsm/AddressLookup";
import { IconAddressBook, IconX } from "@tabler/icons-react";
import { Capacitor } from "@capacitor/core";

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export type QuickPupilDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  postcode: string;
};

export function QuickPupilSheet({
  open,
  onClose,
  onSaved,
  onOpenFullForm,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (pupilId: string) => void;
  onOpenFullForm?: (draft: QuickPupilDraft) => void;
}) {

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [contactsPickerOpen, setContactsPickerOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

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

  async function importFromContacts() {
    if (!Capacitor.isNativePlatform()) {
      toast.info("Only available on device");
      return;
    }
    try {
      const { Contacts } = await import("@capacitor-community/contacts");
      console.log("[contacts] plugin loaded");

      const permCheck = await Contacts.checkPermissions();
      console.log("[contacts] current permission:", JSON.stringify(permCheck));

      let permission = permCheck;
      if (permCheck.contacts !== "granted") {
        const permReq = await Contacts.requestPermissions();
        console.log("[contacts] after request:", JSON.stringify(permReq));
        permission = permReq;
      }
      if (permission.contacts !== "granted") {
        toast.error("Please allow contacts access in Settings → EveryDriver Pro → Contacts");
        return;
      }

      try {
        const result = await Contacts.pickContact({
          projection: {
            name: true,
            phones: true,
            postalAddresses: true,
          },
        });
        if (result?.contact) {
          fillFromContact(result.contact);
          return;
        }
        // Dismissed without selecting a contact — keep the form open.
        return;
      } catch (pickErr) {
        const errStr = String(pickErr);
        if (errStr.toLowerCase().includes("cancel")) {
          console.log("[contacts] pickContact cancelled by user");
          return;
        }
        console.log("[contacts] pickContact failed:", pickErr);
      }

      const { contacts } = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          postalAddresses: true,
        },
      });

      if (!contacts?.length) {
        toast.info("No contacts found");
        return;
      }

      setContactsList(contacts);
      setContactsPickerOpen(true);
    } catch (err) {
      console.error("[contacts] error:", err);
      if (String(err).includes("cancelled") || String(err).includes("cancel")) return;
      toast.error("Could not access contacts");
    }
  }

  function fillFromContact(contact: any) {
    const given = contact.name?.given ?? "";
    const family = contact.name?.family ?? "";
    const phone = contact.phones?.[0]?.number ?? "";
    const address = contact.postalAddresses?.[0];
    const addressStr = [address?.street, address?.city, address?.postcode]
      .filter(Boolean)
      .join(", ");

    if (given) setFirstName(given);
    if (family) setLastName(family);
    if (phone) setPhone(phone.replace(/\s/g, ""));
    if (addressStr) setAddress(addressStr);

    toast.success("Contact imported");
  }

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
    <>
      <BottomSheet
        title="Add pupil"
        subtitle="The essentials — you can add more later"
        onClose={close}
        footer={<SheetFooter onCancel={close} onSave={handleSave} saving={saving} saveLabel="Add pupil" />}
      >
        <div style={{ fontFamily: FONT }}>
          {Capacitor.isNativePlatform() && (
            <button
              type="button"
              onClick={importFromContacts}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#F4F6F8",
                border: "0.5px solid #E4E8EF",
                borderRadius: 10,
                padding: "11px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#0B2341",
                cursor: "pointer",
                marginBottom: 12,
                fontFamily: FONT,
              }}
            >
              <IconAddressBook size={18} color="#2C97DE" />
              Import from contacts
            </button>
          )}
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

      {contactsPickerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,31,58,0.35)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={() => setContactsPickerOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px 20px 0 0",
              maxHeight: "75vh",
              display: "flex",
              flexDirection: "column",
              fontFamily: FONT,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Choose contact</span>
              <button
                type="button"
                onClick={() => setContactsPickerOpen(false)}
                style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
              >
                <IconX size={22} color="#536579" />
              </button>
            </div>

            <div style={{ padding: "0 16px 8px" }}>
              <input
                type="text"
                placeholder="Search..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "#F4F6F8",
                  borderRadius: 10,
                  padding: "10px 14px",
                  border: "0.5px solid #E4E8EF",
                  fontSize: 13,
                  fontFamily: FONT,
                  color: NAVY,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {contactsList
                .filter((c) => {
                  const term = contactSearch.toLowerCase();
                  const display = (c.name?.display ?? "").toLowerCase();
                  const given = (c.name?.given ?? "").toLowerCase();
                  const family = (c.name?.family ?? "").toLowerCase();
                  return !term || display.includes(term) || given.includes(term) || family.includes(term);
                })
                .map((contact, idx) => {
                  const name =
                    contact.name?.display ||
                    `${contact.name?.given ?? ""} ${contact.name?.family ?? ""}`.trim() ||
                    "Unknown";
                  const phone = contact.phones?.[0]?.number ?? "";
                  return (
                    <button
                      key={contact.contactId || idx}
                      type="button"
                      onClick={() => {
                        fillFromContact(contact);
                        setContactsPickerOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        borderBottom: "0.5px solid #F4F6F8",
                        background: "#fff",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#EAF5FC",
                          display: "grid",
                          placeItems: "center",
                          color: "#2C97DE",
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#0B2341",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {name}
                        </div>
                        {phone && <div style={{ fontSize: 11, color: "#536579", marginTop: 2 }}>{phone}</div>}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default QuickPupilSheet;
