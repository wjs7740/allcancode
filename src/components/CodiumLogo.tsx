function CodiumLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="allCanCodeMarkGold" x1="46" y1="42" x2="211" y2="218" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF2B8" />
          <stop offset="0.55" stopColor="#D9B95F" />
          <stop offset="1" stopColor="#8F6C25" />
        </linearGradient>
        <filter id="allCanCodeMarkGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="18" y="18" width="220" height="220" rx="58" fill="#080907" />
      <rect x="18.5" y="18.5" width="219" height="219" rx="57.5" stroke="#E8CB76" strokeOpacity="0.32" />
      <path d="M128 44L212 204H177L160 169H96L79 204H44L128 44ZM109 140H147L128 99L109 140Z" fill="url(#allCanCodeMarkGold)" filter="url(#allCanCodeMarkGlow)" />
      <path
        d="M181 75C202 87 216 107 216 130C216 161 191 186 160 186H137V156H160C175 156 186 145 186 130C186 115 175 104 160 104H146L161 75H181Z"
        fill="#F9E9A7"
        fillOpacity="0.9"
      />
    </svg>
  );
}

export default CodiumLogo;
