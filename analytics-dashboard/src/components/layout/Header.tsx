import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';

type HeaderProps = {
  activePage?: string;
  onSettingsClick?: () => void;
  onExportClick?: () => void;
  onNavigate?: (page: string) => void;
};

const SEARCH_PAGES = [
  { label: 'Overview', sub: 'Job board summary', icon: 'grid' },
  { label: 'Operations', sub: 'Vendor performance & dispatch', icon: 'clipboard' },
  { label: 'Quality', sub: 'Job outcomes & reschedules', icon: 'star' },
  { label: 'Parts', sub: 'Stockouts & ordering pipeline', icon: 'box' },
  { label: 'Live Events', sub: 'Real-time event stream', icon: 'bolt' },
  { label: 'Feedback', sub: 'User submissions', icon: 'chat' },
  { label: 'Unique Users', sub: 'Lifetime login activity', icon: 'users' },
];

const PageIcon = ({ type }: { type: string }) => {
  const props = { width: 16, height: 16, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'grid': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case 'clipboard': return <svg {...props}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
    case 'star': return <svg {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
    case 'box': return <svg {...props}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>;
    case 'bolt': return <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
    case 'chat': return <svg {...props}><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>;
    case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
    default: return null;
  }
};

export function Header({ activePage = 'Overview', onSettingsClick, onExportClick, onNavigate }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [cmdIdx, setCmdIdx] = useState(0);
  const cmdRef = useRef<HTMLDivElement>(null);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  const filtered = SEARCH_PAGES.filter(
    (p) =>
      p.label.toLowerCase().includes(cmdQuery.toLowerCase()) ||
      p.sub.toLowerCase().includes(cmdQuery.toLowerCase()),
  );


  const openCmd = useCallback(() => {
    setCmdOpen(true);
    setCmdQuery('');
    setCmdIdx(0);
    setTimeout(() => cmdInputRef.current?.focus(), 50);
  }, []);

  const closeCmd = useCallback(() => {
    setCmdOpen(false);
    setCmdQuery('');
    setCmdIdx(0);
  }, []);

  const selectItem = useCallback(
    (label: string) => {
      onNavigate?.(label);
      closeCmd();
    },
    [onNavigate, closeCmd],
  );

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        cmdOpen ? closeCmd() : openCmd();
      }
      if (e.key === 'Escape' && cmdOpen) closeCmd();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, openCmd, closeCmd]);

  // Click outside to close
  useEffect(() => {
    if (!cmdOpen) return;
    const handler = (e: MouseEvent) => {
      if (cmdRef.current && !cmdRef.current.contains(e.target as Node)) closeCmd();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [cmdOpen, closeCmd]);

  // Keyboard navigation inside palette
  const handleCmdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCmdIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCmdIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[cmdIdx]) { selectItem(filtered[cmdIdx].label); }
  };

  return (
    <header className="h-[52px] bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-5 sticky top-0 z-[100]">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] font-medium text-[var(--tx2)] whitespace-nowrap">{activePage}</h2>
        <span className="text-[var(--tx3)] text-[13px]">/</span>
        <div
          className="relative flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer"
          style={{ background: 'var(--app-bg)', border: '1px solid var(--border)', minWidth: '200px', maxWidth: '320px', flex: 1 }}
          onClick={openCmd}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-[13px] text-[var(--tx3)]" style={{ fontFamily: 'var(--font-sans)' }}>
            Search... (⌘K)
          </span>
        </div>
      </div>

      {/* Command Palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            ref={cmdRef}
            className="relative w-full max-w-[540px] rounded-xl border overflow-hidden"
            style={{ background: 'var(--card)', borderColor: 'var(--border-2)', boxShadow: 'var(--sh-dropdown)' }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={cmdInputRef}
                type="text"
                value={cmdQuery}
                onChange={(e) => { setCmdQuery(e.target.value); setCmdIdx(0); }}
                onKeyDown={handleCmdKeyDown}
                placeholder="Search pages..."
                className="flex-1 bg-transparent border-none outline-none text-[14px]"
                style={{ color: 'var(--tx1)', fontFamily: 'var(--font-sans)' }}
              />
              <kbd className="px-1.5 py-0.5 text-[11px] rounded border" style={{ color: 'var(--tx3)', borderColor: 'var(--border)', background: 'var(--app-bg)' }}>ESC</kbd>
            </div>
            <div className="px-2 py-2 max-h-[320px] overflow-y-auto">
              {filtered.length > 0 && (
                <>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>Pages</p>
                  {filtered.map((item, i) => (
                    <button
                      key={item.label}
                      onClick={() => selectItem(item.label)}
                      onMouseEnter={() => setCmdIdx(i)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={{
                        background: i === cmdIdx ? 'var(--blue-l-bg)' : 'transparent',
                        color: i === cmdIdx ? 'var(--blue)' : 'var(--tx2)',
                      }}
                    >
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--app-bg)', border: '1px solid var(--border)' }}>
                        <PageIcon type={item.icon} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--tx1)' }}>{item.label}</p>
                        <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>{item.sub}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {filtered.length === 0 && cmdQuery.length > 0 && (
                <p className="px-2 py-4 text-[13px] text-center" style={{ color: 'var(--tx3)' }}>No results found</p>
              )}
            </div>
            <div className="flex items-center gap-4 px-4 py-2 border-t text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--tx3)' }}>
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>ESC close</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        {/* Notifications — hidden until functional */}
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
