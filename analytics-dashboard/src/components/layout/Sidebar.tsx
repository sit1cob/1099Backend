type BadgeStyle = 'red' | 'blue' | 'green-dot' | 'green';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeStyle?: BadgeStyle;
};

type SidebarProps = {
  activeItem: string;
  onNavigate: (label: string) => void;
  feedbackCount?: number;
};

export function Sidebar({ activeItem, onNavigate, feedbackCount }: SidebarProps) {
  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: 'OPERATIONS',
      items: [
        {
          label: 'Overview',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
        {
          label: 'Operations',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
        {
          label: 'Quality',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          ),
        },
        {
          label: 'Parts',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        },
        {
          label: 'Live Events',
          badgeStyle: 'green-dot',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'INSIGHTS',
      items: [
        {
          label: 'Feedback',
          badge: feedbackCount ?? 0,
          badgeStyle: 'green',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
        {
          label: 'Unique Users',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'ADMIN',
      items: [
        {
          label: 'System Health',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
      ],
    },
  ];

  const getBadge = (item: NavItem) => {
    if (!item.badge && item.badgeStyle !== 'green-dot') return null;

    if (item.badgeStyle === 'green-dot') {
      return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />;
    }
    if (item.badgeStyle === 'red') {
      return (
        <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      );
    }
    if (item.badgeStyle === 'blue') {
      return (
        <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      );
    }
    if (item.badgeStyle === 'green') {
      return (
        <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      );
    }
    return null;
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[236px] bg-[var(--sidebar)] flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <circle cx="17.5" cy="17.5" r="3.5" />
          </svg>
        </div>
        <div>
          <p className="text-[15px] font-bold text-white leading-tight">Sears KAIros</p>
          <p className="text-[11px] text-[var(--txw3)]">1099 Operations</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t" style={{ borderColor: 'rgba(255,255,255,.08)' }} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-3 text-[11px] font-semibold tracking-[0.6px] text-[var(--txw3)] uppercase">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => onNavigate(item.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                      activeItem === item.label
                        ? 'bg-blue-600/90 text-white font-semibold shadow-lg shadow-blue-600/20'
                        : 'text-[var(--txw2)] font-medium hover:bg-[rgba(255,255,255,.06)] hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {getBadge(item)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom user section */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-[var(--txw3)] font-mono">Live &middot; 0s ago</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
            SD
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-white leading-tight">S. Dangir</p>
            <p className="text-[11px] text-[var(--txw3)]">Operations Lead</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
