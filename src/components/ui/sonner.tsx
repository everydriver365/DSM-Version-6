import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      toastOptions={{
        style: {
          background: "#0B1F3A",
          color: "#ffffff",
          border: "none",
          borderLeft: "3px solid #1877D6",
          borderRadius: "12px",
          fontFamily: "Inter, sans-serif",
          boxShadow: "0 10px 30px -10px rgba(11, 31, 58, 0.4)",
        },
        classNames: {
          toast: "group toast",
          description: "text-white/70",
          actionButton: "!bg-[#1877D6] !text-white",
          cancelButton: "!bg-white/10 !text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
