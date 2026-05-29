export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="goldg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e9c877" />
          <stop offset="55%" stopColor="#d4a749" />
          <stop offset="100%" stopColor="#b07523" />
        </linearGradient>
      </defs>
      <path
        d="M32 8 L50 24 Q50 50 32 58 Q14 50 14 24 Z"
        fill="none"
        stroke="url(#goldg)"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="29" r="6.5" fill="url(#goldg)" />
      <path d="M32 35 L32 47" stroke="url(#goldg)" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({
  className = '',
  tone = 'dark',
}: {
  className?: string
  tone?: 'dark' | 'light'
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Mark className="h-7 w-7" />
      <span
        className={`text-[17px] font-semibold tracking-tight ${
          tone === 'light' ? 'text-white' : 'text-ink'
        }`}
      >
        Tigbourne
        <span className="font-normal text-gold-500">·</span>
        <span className={tone === 'light' ? 'text-white/70' : 'text-ink-muted'}>OFI</span>
      </span>
    </span>
  )
}
