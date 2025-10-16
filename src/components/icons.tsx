type IconProps = React.SVGProps<SVGSVGElement>

export function TargetIcon(props: IconProps){
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="9" strokeOpacity=".35" />
    </svg>
  )
}

export function SearchIcon(props: IconProps){
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

export function UserIcon(props: IconProps){
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M20 21c0-3.866-3.582-7-8-7s-8 3.134-8 7" />
      <circle cx="12" cy="7.5" r="3.5" />
    </svg>
  )
}

export function CrownIcon(props: IconProps){
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 8l4 3 3-5 3 5 4-3 4 6v3H3v-3l0-6z" fill="currentColor" />
      <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor" />
    </svg>
  )
}

export function CoinIcon(props: IconProps){
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" strokeOpacity=".45" />
      <path d="M9 9c1.8 0 3 .8 3 2s-1.2 2-3 2-3 .8-3 2" strokeOpacity=".6" />
    </svg>
  )
}

export function ChatIcon(props: IconProps){
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M21 15a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3l4-2h10l4 2v-3Z" />
      <path d="M7 7h10" strokeOpacity=".7" />
    </svg>
  )
}