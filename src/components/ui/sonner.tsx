import { tokens } from "@/lib/tokens";
import { Toaster as Sonner } from 'sonner';

const Toaster = ({ ...props }) => (
  <Sonner
    position="top-center"
    offset={12}
    gap={8}
    duration={4000}
    swipeDirections={['top' as const]}
    toastOptions={{
      unstyled: false,
      style: {
        background: tokens.cardBg,
        color: tokens.textPrimary,
        border: `1px solid ${tokens.border}`,
        borderRadius: tokens.radiusCard,
        padding: '12px 14px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        boxShadow: '0 12px 40px rgba(11,31,58,0.18)',
        fontFamily: tokens.fontFamily,
        fontSize: tokens.fontSize.base,
        fontWeight: tokens.fontWeight.medium,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 280,
        maxWidth: 'calc(100vw - 32px)',
      },
      classNames: {
        toast: 'dsm-toast',
        title: '!text-[#0B1F3A] !font-semibold !text-[13px]',
        description: '!text-[#6B7686] !text-[11px]',
        success: '!border-l-4 !border-l-[#15803D]',
        error: '!border-l-4 !border-l-[#CC2229]',
        info: '!border-l-4 !border-l-[#1877D6]',
        warning: '!border-l-4 !border-l-[#F59E0B]',
        closeButton: '!bg-[#EEF2F7] !text-[#0B1F3A]/60 !border-[#E4E8EF] hover:!bg-[#E4E8EF] hover:!text-[#0B1F3A]',
        actionButton: '!bg-[#1877D6] !text-white !rounded-full !px-3 !py-1 !text-[11px] !font-semibold hover:!bg-[#1568B8]',
      },
    }}
    closeButton
    {...props}
  />
);

export { Toaster };
