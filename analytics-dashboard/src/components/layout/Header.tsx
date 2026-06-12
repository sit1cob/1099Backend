import { useTheme } from '../../context/ThemeContext';

type HeaderProps = {
  activePage?: string;
  onSettingsClick?: () => void;
  onExportClick?: () => void;
};

export function Header({ activePage = 'Overview', onSettingsClick, onExportClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-[52px] bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-5 sticky top-0 z-[100]">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] font-medium text-[var(--tx2)] whitespace-nowrap">{activePage}</h2>
        <span className="text-[var(--tx3)] text-[13px]">/</span>
        <div className="relative flex items-center gap-2 px-2 py-1 rounded-md" style={{ background: 'var(--app-bg)', border: '1px solid var(--border)', minWidth: '200px', maxWidth: '320px', flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search... (⌘K)"
            className="border-none bg-transparent outline-none text-[var(--tx1)] text-[13px] w-full placeholder-[var(--tx3)]"
            style={{ fontFamily: 'var(--font-sans)' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button className="w-[34px] h-[34px] flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--tx2)] transition-all hover:bg-[var(--card-2)] hover:text-[var(--tx1)] hover:border-[var(--border-2)] relative" style={{ background: 'var(--app-bg)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="absolute top-[6px] right-[6px] w-[7px] h-[7px] rounded-full bg-[var(--red,#ef4444)]" style={{ border: '1.5px solid var(--card)' }} />
        </button>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle light/dark"
          className="w-[34px] h-[34px] flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--tx2)] transition-all hover:bg-[var(--card-2)] hover:text-[var(--tx1)] hover:border-[var(--border-2)]"
          style={{ background: 'var(--app-bg)' }}
        >
          {theme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
        {/* Settings */}
        <button onClick={onSettingsClick} className="w-[34px] h-[34px] flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--tx2)] transition-all hover:bg-[var(--card-2)] hover:text-[var(--tx1)] hover:border-[var(--border-2)]" style={{ background: 'var(--app-bg)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        {/* Export */}
        <button
          onClick={onExportClick}
          className="flex items-center gap-1 px-4 py-2 rounded-md border-none text-white text-[13px] font-medium transition-all"
          style={{ background: 'var(--blue, #3b82f6)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold ml-1 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0048BB, #010F43)' }}>
          SD
        </div>
      </div>
    </header>
  );
}
