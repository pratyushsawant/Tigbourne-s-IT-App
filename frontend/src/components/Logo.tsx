export function Mark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <img
      src="/tigbourne-mark.png"
      alt="Tigbourne Capital"
      className={`${className} object-contain`}
      draggable={false}
    />
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
      <Mark className="h-8 w-8" />
      <span
        className={`text-[17px] font-semibold tracking-tight ${
          tone === 'light' ? 'text-white' : 'text-ink'
        }`}
      >
        Tigbourne
        <span className="font-normal text-gold-500"> · </span>
        <span className={tone === 'light' ? 'text-white/70' : 'text-ink-muted'}>OFI</span>
      </span>
    </span>
  )
}
