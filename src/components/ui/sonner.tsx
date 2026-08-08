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
        background: '#0B1F3A',
        color: '#ffffff',
        border: 'none',
        borderRadius: 16,
        padding: '12px 14px',
        boxShadow: '0 4px 24px rgba(11,31,58,0.35)',
        fontFamily: 'Poppins, sans-serif',
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 280,
        maxWidth: 'calc(100vw - 32px)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      },
      classNames: {
        toast: 'dsm-toast',
        title: '!text-white !font-semibold !text-[13px]',
        description: '!text-white/55 !text-[11px]',
        success: '!border-l-4 !border-l-[#15803D]',
        error: '!border-l-4 !border-l-[#CC2229]',
        info: '!border-l-4 !border-l-[#1877D6]',
        warning: '!border-l-4 !border-l-[#F59E0B]',
        closeButton: '!bg-white/10 !text-white/50 !border-none',
      },
    }}
    closeButton
    {...props}
  />
);

export { Toaster };
