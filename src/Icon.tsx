export type IconName = 'grid' | 'bell' | 'sliders' | 'arrow' | 'download' | 'play' | 'pause' | 'search' | 'check' | 'close' | 'info' | 'layers' | 'plus' | 'chevron' | 'shield' | 'clock';
const paths: Record<IconName, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  sliders: <><path d="M4 7h5m4 0h7M4 17h10m4 0h2"/><circle cx="11" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>,
  arrow: <><path d="M5 12h14m-5-5 5 5-5 5"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  play: <path d="m8 4 12 8-12 8Z"/>,
  pause: <><path d="M8 5v14M16 5v14"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  layers: <><path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
};
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Mark() { return <svg viewBox="0 0 32 32" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" aria-hidden="true"><path d="M6 12h20M6 20h20M11 6v20M21 6v20"/></svg>; }
export function Ethereum() { return <svg width="16" height="23" viewBox="0 0 18 28" aria-hidden="true"><path d="M9 0 0 15l9 5 9-5Z" fill="currentColor" opacity=".8"/><path d="m0 17 9 11 9-11-9 5Z" fill="currentColor"/></svg>; }
