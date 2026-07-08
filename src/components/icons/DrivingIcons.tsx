import type React from "react";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const defaultProps = { size: 24, strokeWidth: 1.5 };

function wrap(
  children: React.ReactNode,
  { size = 24, color = "currentColor", strokeWidth = 1.5, className }: IconProps,
) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return wrap(
    <>
      {/* Steering wheel */}
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12v7" />
      <path d="M12 12l-5.5-3.5" />
      <path d="M12 12l5.5-3.5" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function PupilsIcon(props: IconProps) {
  return wrap(
    <>
      {/* Driver head + shoulders with L-plate badge */}
      <circle cx="12" cy="8" r="3" />
      <path d="M6 18c0-2.5 2.5-4.5 6-4.5s6 2 6 4.5" />
      <rect x="14" y="2" width="7" height="7" rx="1.5" />
      <path d="M17.5 4.5v2.5" />
      <path d="M15.5 5.75h4" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function ScheduleIcon(props: IconProps) {
  return wrap(
    <>
      {/* Calendar with a small route marker */}
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <path d="M9 14l2 2 4-4" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function MessagesIcon(props: IconProps) {
  return wrap(
    <>
      {/* Chat bubble with a tiny route pin */}
      <path d="M4 18V7a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-5 3v-2z" />
      <path d="M12 14V8" />
      <path d="M12 14l-2.5-2.5" />
      <path d="M12 14l2.5-2.5" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function PaymentsIcon(props: IconProps) {
  return wrap(
    <>
      {/* Wallet/card with a bold pound sign */}
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M12 11.5h3" />
      <path d="M13.5 11.5v4" />
      <path d="M12 13.5h2" />
    </>,
    { ...defaultProps, ...props },
  );
}


export function SettingsIcon(props: IconProps) {
  return wrap(
    <>
      {/* Wrench/spanner */}
      <path d="M14.7 6.3a6 6 0 00-8.5 8.5l-2.8 2.8a1.5 1.5 0 002.1 2.1l2.8-2.8a6 6 0 008.5-8.5" />
      <path d="M14.7 6.3L19 2" />
      <path d="M19 6l-4.3-3.7" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function CarIcon(props: IconProps) {
  return wrap(
    <>
      {/* Side-view car silhouette */}
      <path d="M3 15l1.5-5A2.5 2.5 0 017 8h10a2.5 2.5 0 012.5 2L21 15" />
      <path d="M3 15v3h18v-3" />
      <path d="M3 15h18" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="16.5" cy="18" r="1.5" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function PhoneIcon(props: IconProps) {
  return wrap(
    <>
      {/* Headset with driving mic */}
      <path d="M4 13v-1a8 8 0 0116 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19v1a2 2 0 01-2 2h-3" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function BellIcon(props: IconProps) {
  return wrap(
    <>
      {/* Dashboard warning bell */}
      <path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20a2 2 0 004 0" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function MenuIcon(props: IconProps) {
  return wrap(
    <>
      {/* Gear-stick style menu */}
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
      <circle cx="8" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function PoundIcon(props: IconProps) {
  return wrap(
    <>
      {/* Bold pound sign in a coin */}
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 8.5A2.5 2.5 0 0010 10v2H8.5" />
      <path d="M8.5 15.5h7" />
      <path d="M10 12h3" />
      <path d="M10 12v3.5" />
    </>,
    { ...defaultProps, ...props },
  );
}
