import type { CSSProperties } from 'react';

export type IconName = 'refresh' | 'arrow' | 'copy' | 'check' | 'info' | 'chevron' | 'blocks' | 'token' | 'nft' | 'shield' | 'pause';

const paths: Record<IconName, React.ReactNode> = {
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 11.5-1L20 9M4 15l2.5 3A7 7 0 0 0 18 17"/></>,
  arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  blocks: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3ZM4 7.5l8 4.5 8-4.5M12 12v9"/></>,
  token: <><circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9M12 6v2m0 8v2"/></>,
  nft: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m7 16 4-4 3 3 2-2 4 4"/><circle cx="9" cy="8" r="1"/></>,
  shield: <><path d="M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></>,
  pause: <><path d="M9 5v14M15 5v14"/></>,
};

export function Icon({ name, className = '', style }: { name: IconName; className?: string; style?: CSSProperties }) {
  return <svg className={`icon ${className}`} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function HamsterMark() {
  return <svg width="38" height="38" viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect width="64" height="64" rx="18" fill="currentColor"/><g stroke="#252a24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 26c-8-14 6-19 11-7m15 7c8-14-6-19-11-7"/><path d="M48 33c0 12-7 18-16 18s-16-6-16-18c0-11 7-17 16-17s16 6 16 17Z"/><path d="m29 39 3 3 3-3m-3 3v4"/></g><circle cx="25" cy="32" r="2.5" fill="#252a24"/><circle cx="39" cy="32" r="2.5" fill="#252a24"/></svg>;
}

/** Decorative illustration, not a measurement of wheel activity. */
export function WheelIllustration() {
  return <svg className="wheel-illustration" viewBox="0 0 180 180" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.2"><circle cx="90" cy="79" r="66"/><circle cx="90" cy="79" r="59"/><path d="m67 143-9 23h64l-9-23M90 13v16m0 100v16M24 79h16m100 0h16M43 32l12 12m70 70 12 12M43 126l12-12m70-70 12-12"/><circle cx="90" cy="79" r="5"/><path d="m43 109 94 0"/></g>
    <g fill="#e6ddbb" stroke="#252a24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M64 99c-6-4-7-11-4-14 4-3 7 2 9 5 1-13 8-27 25-27 7-12 20-7 18 5 12 3 19 13 18 23 0 7-6 11-15 12l-5 5H69l-5-9Z"/><path d="M86 87c-9 2-12 10-8 17m23 0 8-9" fill="none"/><path d="m126 89 5 2-5 2"/><circle cx="117" cy="82" r="2.2" fill="#252a24" stroke="none"/><path d="M101 66c3-4 9-3 9 3" fill="none"/></g>
    <path d="M37 154h16m74 0h16" stroke="currentColor" strokeWidth="1.2"/>
  </svg>;
}
