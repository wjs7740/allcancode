function CodiumLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="allCanCodeMarkBlue" x1="42" y1="42" x2="218" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2E8FB0" />
          <stop offset="1" stopColor="#145A78" />
        </linearGradient>
        <linearGradient id="allCanCodeMarkGreen" x1="74" y1="168" x2="220" y2="206" gradientUnits="userSpaceOnUse">
          <stop stopColor="#68B45C" />
          <stop offset="1" stopColor="#2E7D3D" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="60" fill="#071214" />
      <rect x="18" y="18" width="220" height="220" rx="50" fill="#F4FBF8" fillOpacity="0.96" />
      <rect x="18.5" y="18.5" width="219" height="219" rx="49.5" stroke="#7AD17B" strokeOpacity="0.18" />
      <path
        d="M44 188L91 117C107 92 116 74 136 74C151 74 162 84 173 104L184 122C194 103 214 92 239 92H249L229 122H189C166 122 153 137 153 158C153 168 157 176 164 184H118L91 142L58 188H44Z"
        fill="url(#allCanCodeMarkBlue)"
      />
      <path d="M98 174H229L211 204H74L98 174Z" fill="url(#allCanCodeMarkGreen)" />
    </svg>
  );
}

export default CodiumLogo;
