/** Inline demo abdominal radiograph (bundled). */
export default function XrayScissorsDemo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 480 560"
      role="img"
      aria-label="Demo abdominal X-ray showing retained surgical scissors"
      className={className}
    >
      <defs>
        <radialGradient id="xrd-vignette" cx="50%" cy="48%" r="72%">
          <stop offset="55%" stopColor="#2a2a2a" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.92" />
        </radialGradient>
        <linearGradient id="xrd-film" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="50%" stopColor="#242424" />
          <stop offset="100%" stopColor="#181818" />
        </linearGradient>
        <linearGradient id="xrd-bone" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="100%" stopColor="#b8b8b8" />
        </linearGradient>
        <linearGradient id="xrd-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#c8c8c8" />
        </linearGradient>
        <filter id="xrd-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="8" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.12 0" result="grain" />
          <feBlend in="SourceGraphic" in2="grain" mode="overlay" />
        </filter>
        <filter id="xrd-soften" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
        <filter id="xrd-metal-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Film base */}
      <rect width="480" height="560" fill="url(#xrd-film)" />
      <rect width="480" height="560" fill="url(#xrd-vignette)" />

      <g filter="url(#xrd-grain)" opacity="0.95">
        {/* Soft-tissue envelope */}
        <ellipse cx="240" cy="280" rx="168" ry="210" fill="#3d3d3d" opacity="0.55" filter="url(#xrd-soften)" />

        {/* Bowel gas lucencies */}
        <ellipse cx="195" cy="248" rx="42" ry="28" fill="#141414" opacity="0.65" />
        <ellipse cx="285" cy="272" rx="36" ry="22" fill="#121212" opacity="0.55" />
        <ellipse cx="220" cy="318" rx="48" ry="26" fill="#101010" opacity="0.5" />
        <ellipse cx="300" cy="210" rx="28" ry="18" fill="#161616" opacity="0.45" />

        {/* Diaphragm / lung bases */}
        <path
          d="M88 118 Q240 72 392 118 L392 145 Q240 108 88 145 Z"
          fill="#4a4a4a"
          opacity="0.35"
        />

        {/* Ribs — bilateral arcs */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
          const y = 130 + i * 22;
          const spread = 155 - i * 6;
          return (
            <g key={i} opacity={0.5 + (8 - i) * 0.04}>
              <path
                d={`M${240 - spread} ${y} Q${240 - spread * 0.35} ${y - 14} ${240 - 28} ${y + 6}`}
                fill="none"
                stroke="url(#xrd-bone)"
                strokeWidth={2.2 - i * 0.12}
                strokeLinecap="round"
              />
              <path
                d={`M${240 + spread} ${y} Q${240 + spread * 0.35} ${y - 14} ${240 + 28} ${y + 6}`}
                fill="none"
                stroke="url(#xrd-bone)"
                strokeWidth={2.2 - i * 0.12}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Spine — vertebral column */}
        <g opacity="0.72">
          {Array.from({ length: 14 }, (_, i) => {
            const y = 108 + i * 24;
            const w = 20 - Math.abs(i - 7) * 0.8;
            return (
              <rect
                key={i}
                x={240 - w / 2}
                y={y}
                width={w}
                height={16}
                rx={3}
                fill="url(#xrd-bone)"
                opacity={0.55 + (i % 2) * 0.15}
              />
            );
          })}
          <rect x="232" y="100" width="16" height="340" fill="#9a9a9a" opacity="0.12" rx="4" />
        </g>

        {/* Pelvis */}
        <path
          d="M128 380 Q128 430 168 468 Q240 498 312 468 Q352 430 352 380 Q312 360 240 372 Q168 360 128 380 Z"
          fill="none"
          stroke="url(#xrd-bone)"
          strokeWidth="3.5"
          opacity="0.65"
        />
        <path
          d="M168 400 Q240 420 312 400 Q280 455 240 462 Q200 455 168 400 Z"
          fill="#5a5a5a"
          opacity="0.35"
        />
        <ellipse cx="240" cy="408" rx="22" ry="14" fill="url(#xrd-bone)" opacity="0.4" />

        {/* Operating scissors at pivot — rings, shanks, crossed blades */}
        <g transform="translate(270 205) rotate(12)" filter="url(#xrd-metal-glow)">
          <ellipse cx="-4" cy="0" rx="28" ry="54" fill="#000" opacity="0.14" />

          <g transform="translate(-5 2)" opacity="0.97">
            {/* Lower handle + blade arm */}
            <g transform="rotate(34)">
              <path
                fill="url(#xrd-metal)"
                d="M -4.5 10 L 4.5 10 L 5.5 24 L -5.5 24 Z"
              />
              <ellipse cx="0" cy="31" rx="11" ry="13" fill="url(#xrd-metal)" />
              <ellipse cx="0" cy="31" rx="6.5" ry="8" fill="#161616" />
              <path
                fill="url(#xrd-metal)"
                d="M -3.5 0 L 3.5 0 L 2 -4 L 0 -46 L -6 -50 L -8 -44 L -4 -2 Z"
              />
            </g>

            {/* Upper handle + blade arm */}
            <g transform="rotate(-34)">
              <path
                fill="url(#xrd-metal)"
                d="M -4.5 -10 L 4.5 -10 L 5.5 -24 L -5.5 -24 Z"
              />
              <ellipse cx="0" cy="-31" rx="11" ry="13" fill="url(#xrd-metal)" />
              <ellipse cx="0" cy="-31" rx="6.5" ry="8" fill="#161616" />
              <path
                fill="url(#xrd-metal)"
                d="M -3.5 0 L 3.5 0 L 4 2 L 8 44 L 6 50 L 0 48 L -2 4 Z"
              />
            </g>

            {/* Pivot */}
            <circle r="6" fill="#d4d4d4" />
            <circle r="3" fill="#555" />
            <circle r="1.2" fill="#888" />
          </g>
        </g>
      </g>

      {/* Film markers (subtle, like clinical overlay) */}
      <text x="28" y="32" fill="#6b6b6b" fontFamily="ui-monospace, monospace" fontSize="9" opacity="0.7">
        AP ABDOMEN
      </text>
      <text x="28" y="46" fill="#555" fontFamily="ui-monospace, monospace" fontSize="8" opacity="0.55">
        24-JUN-2026 · DEMO
      </text>
      <text x="428" y="36" fill="#7a7a7a" fontFamily="ui-monospace, monospace" fontSize="14" fontWeight="600" opacity="0.5">
        R
      </text>
      <text x="28" y="536" fill="#4a4a4a" fontFamily="ui-monospace, monospace" fontSize="8" opacity="0.45">
        Synthetic radiograph — not for clinical use
      </text>
    </svg>
  );
}
