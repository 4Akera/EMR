export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Minimal heartbeat line design */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      
      {/* Rounded square background */}
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="20"
        fill="url(#logoGradient)"
      />
      
      {/* Heartbeat/ECG line */}
      <path
        d="M 20 50 L 35 50 L 40 35 L 45 65 L 50 50 L 65 50 L 70 40 L 75 50 L 80 50"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Small plus sign (medical symbol) */}
      <line x1="70" y1="25" x2="70" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="30" x2="75" y2="30" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Just the heartbeat line - for favicon */}
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      
      <rect width="100" height="100" rx="20" fill="url(#iconGradient)" />
      <path
        d="M 15 50 L 30 50 L 37 30 L 44 70 L 50 50 L 65 50 L 72 35 L 77 50 L 85 50"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

