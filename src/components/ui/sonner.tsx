import { tokens } from "@/lib/tokens";
import { Toaster as Sonner } from "sonner";
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

const ICON_CONFIG: Record<
  ToastVariant,
  { Icon: typeof CheckCircle2; color: string; bg: string }
> = {
  success: { Icon: CheckCircle2, color: tokens.green, bg: tokens.statusSuccessBg },
  error: { Icon: XCircle, color: tokens.red, bg: tokens.statusDangerBg },
  info: { Icon: Info, color: tokens.blue, bg: tokens.statusInfoBg },
  warning: { Icon: AlertTriangle, color: tokens.amber, bg: tokens.statusWarningBg },
};

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const { Icon, color, bg } = ICON_CONFIG[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 10,
        background: bg,
        color,
        flexShrink: 0,
      }}
    >
      <Icon size={18} strokeWidth={2.5} />
    </span>
  );
}

const toastOffset = "calc(var(--dsm-header-h, 64px) + 12px)";

const Toaster = ({ ...props }) => (
  <Sonner
    position="top-center"
    offset={{ top: toastOffset }}
    mobileOffset={{ top: toastOffset }}
    gap={10}
    duration={4000}
    swipeDirections={["top" as const]}
    style={{ zIndex: 9999 }}
    icons={{
      success: <VariantIcon variant="success" />,
      error: <VariantIcon variant="error" />,
      info: <VariantIcon variant="info" />,
      warning: <VariantIcon variant="warning" />,
    }}
    toastOptions={{
      unstyled: false,
      style: {
        background: "rgba(255,255,255,0.94)",
        color: tokens.textPrimary,
        border: "1px solid rgba(11,31,58,0.08)",
        borderRadius: 20,
        padding: "12px 16px",
        boxShadow: "0 20px 50px rgba(11,31,58,0.18), 0 8px 16px rgba(11,31,58,0.08)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        fontFamily: tokens.fontFamily,
        fontSize: tokens.fontSize.base,
        fontWeight: tokens.fontWeight.medium,
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 300,
        maxWidth: "min(420px, calc(100vw - 32px))",
      },
      classNames: {
        toast: "dsm-toast",
        title: "!text-[#0B1F3A] !font-semibold !text-[13px]",
        description: "!text-[#6B7686] !text-[11px]",
        success: "!border-l-4 !border-l-[#15803D]",
        error: "!border-l-4 !border-l-[#CC2229]",
        info: "!border-l-4 !border-l-[#1877D6]",
        warning: "!border-l-4 !border-l-[#D68A1B]",
        closeButton:
          "!bg-[#EEF2F7]/80 !text-[#0B1F3A]/60 !border-[#E4E8EF] hover:!bg-[#E4E8EF] hover:!text-[#0B1F3A]",
        actionButton:
          "!bg-[#1877D6] !text-white !rounded-full !px-3 !py-1 !text-[11px] !font-semibold hover:!bg-[#1568B8]",
      },
    }}
    closeButton
    {...props}
  />
);

export { Toaster };
