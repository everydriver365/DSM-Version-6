import React from "react";

export const NAVY = "#0B1F3A";
export const HAIRLINE = "#E4E8EF";
export const FONT = "Poppins, sans-serif";

export const fieldCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  border: `1px solid ${HAIRLINE}`,
  padding: "10px 14px",
  boxShadow: "0 1px 2px rgba(11,31,58,0.04)",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: FONT,
  fontSize: 15,
  color: NAVY,
};

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#6B7686",
          marginBottom: 6,
          fontFamily: FONT,
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: 11.5, color: "#8A93A3", marginTop: 4, fontFamily: FONT }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  inputMode?: "text" | "tel" | "email" | "decimal" | "numeric";
}) {
  return (
    <Field label={label} hint={hint}>
      <div style={fieldCard}>
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, height: 26 }}
        />
      </div>
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <div style={{ ...fieldCard, padding: "12px 14px" }}>
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
    </Field>
  );
}

export function SelectField({
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
    <Field label={label}>
      <div style={fieldCard}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, height: 26 }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </Field>
  );
}

export function PillGroup({
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
    <Field label={label}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                flex: "1 1 0",
                minWidth: 90,
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${active ? "#1877D6" : HAIRLINE}`,
                background: active ? "#EAF3FD" : "#fff",
                color: active ? "#1877D6" : NAVY,
                fontFamily: FONT,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function SheetFooter({
  onCancel,
  onSave,
  saving,
  disabled,
  saveLabel = "Save",
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
  saveLabel?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="active:opacity-90"
        style={{
          width: "100%",
          height: 52,
          background: "#1877D6",
          color: "#fff",
          borderRadius: 20,
          fontSize: 15,
          fontWeight: 700,
          border: "none",
          fontFamily: FONT,
          boxShadow: "0 3px 0 #0F52A8",
          opacity: saving || disabled ? 0.5 : 1,
        }}
      >
        {saving ? "Saving…" : saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          width: "100%",
          height: 44,
          background: "transparent",
          color: NAVY,
          borderRadius: 20,
          fontSize: 14,
          fontWeight: 600,
          border: "none",
          fontFamily: FONT,
        }}
      >
        Cancel
      </button>
    </div>
  );
}
