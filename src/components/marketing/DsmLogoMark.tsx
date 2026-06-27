type Props = {
  size?: number;
  /** Color of the rounded square mark background */
  markColor?: string;
  /** Color of the letters inside the mark */
  letterColor?: string;
  /** Color of the wordmark text */
  wordColor?: string;
  /** Color of the "by EveryDriver" tagline */
  taglineColor?: string;
  /** Hide the wordmark and tagline (icon-only) */
  iconOnly?: boolean;
  /** Hide just the tagline */
  hideTagline?: boolean;
  className?: string;
};

/**
 * DSM brand mark — inline SVG so it scales crisply and inherits the
 * Checkfront-inspired navy + teal palette used across the marketing site.
 */
export function DsmLogoMark({
  size = 36,
  markColor = "#00B5A5",
  letterColor = "#FFFFFF",
  wordColor = "#1B2B4B",
  taglineColor = "#94A3B8",
  iconOnly = false,
  hideTagline = false,
  className = "",
}: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="10" fill={markColor} />
        {/* subtle inner highlight */}
        <rect
          x="0.5"
          y="0.5"
          width="39"
          height="39"
          rx="9.5"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
        />
        {/* steering-wheel-inspired arc + DSM monogram */}
        <path
          d="M20 8.5a11.5 11.5 0 0 1 11.2 8.9"
          stroke={letterColor}
          strokeOpacity="0.35"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <text
          x="20"
          y="26"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="900"
          fontSize="13"
          letterSpacing="0.5"
          fill={letterColor}
        >
          DSM
        </text>
      </svg>
      {!iconOnly && (
        <span className="flex items-baseline gap-1.5">
          <span
            className="font-black text-[15px] tracking-tight"
            style={{ color: wordColor }}
          >
            DSM
          </span>
          {!hideTagline && (
            <span
              className="text-[13px] font-medium hidden sm:inline"
              style={{ color: taglineColor }}
            >
              by EveryDriver
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export default DsmLogoMark;
