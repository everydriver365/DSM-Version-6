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
      {/* Driver silhouette with L-plate */}
      <circle cx="12" cy="8" r="3" />
      <path d="M6 18c0-3 3-5 6-5s6 2 6 5" />
      <rect x="14" y="3" width="6" height="6" rx="1" />
      <path d="M17 4.5v4" />
      <path d="M15 6.5h4" />
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
      {/* Chat bubble with a tiny car */}
      <path d="M4 18V7a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-5 3v-2z" />
      <path d="M13 10h-2l-1 1.5h4l-1-1.5z" />
      <circle cx="8.5" cy="13.5" r="0.8" />
      <circle cx="15.5" cy="13.5" r="0.8" />
    </>,
    { ...defaultProps, ...props },
  );
}

export function PaymentsIcon(props: IconProps) {
  return wrap(
    <>
      {/* Card with pound sign */}
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M12 12.5c0 .8-.7 1.5-1.5 1.5" />
      <path d="M11 12.5h2.5" />
      <path d="M10.5 14v2" />
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
