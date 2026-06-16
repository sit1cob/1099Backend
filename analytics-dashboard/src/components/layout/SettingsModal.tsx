import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

export type DashboardSettings = {
  theme: 'dark' | 'light';
  startDate: string;
  endDate: string;
  exportFormat: 'CSV' | 'JSON';
  refreshInterval: '30s' | '1 minute' | '5 minutes' | '10 minutes';
  showLastLogin: boolean;
  showUsername: boolean;
  showVendorId: boolean;
};

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: DashboardSettings;
  onSave: (settings: DashboardSettings) => void;
};

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [local, setLocal] = useState<DashboardSettings>(settings);
  const { theme: currentTheme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isOpen) setLocal(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (local.theme !== currentTheme) {
      toggleTheme();
    }
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--card)', border: '1px solid var(--border-2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-bold" style={{ color: 'var(--tx1)' }}>Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg transition" style={{ color: 'var(--tx3)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* APPEARANCE */}
        <Section title="APPEARANCE">
          <Row label="Theme" sub="Dark or light interface">
            <Select
              value={local.theme}
              onChange={(v) => setLocal({ ...local, theme: v as 'dark' | 'light' })}
              options={['Dark', 'Light']}
            />
          </Row>
        </Section>

        {/* DATE RANGE */}
        <Section title="DATE RANGE">
          <Row label="From">
            <label className="rounded-lg px-3 py-1.5 text-[13px] relative inline-flex items-center cursor-pointer" style={{ background: 'var(--app-bg)', border: '1px solid var(--border)', color: 'var(--tx2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{format(new Date(local.startDate + 'T00:00:00'), 'MMM dd, yyyy')}</span>
              <input type="date" value={local.startDate} onChange={(e) => setLocal({ ...local, startDate: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
          </Row>
          <Row label="To">
            <label className="rounded-lg px-3 py-1.5 text-[13px] relative inline-flex items-center cursor-pointer" style={{ background: 'var(--app-bg)', border: '1px solid var(--border)', color: 'var(--tx2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{format(new Date(local.endDate + 'T00:00:00'), 'MMM dd, yyyy')}</span>
              <input type="date" value={local.endDate} onChange={(e) => setLocal({ ...local, endDate: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
          </Row>
        </Section>

        {/* EXPORT */}
        <Section title="EXPORT">
          <Row label="Default format" sub="Used when clicking Export">
            <Select
              value={local.exportFormat}
              onChange={(v) => setLocal({ ...local, exportFormat: v as 'CSV' | 'JSON' })}
              options={['CSV', 'JSON']}
            />
          </Row>
        </Section>

        {/* DATA REFRESH */}
        <Section title="DATA REFRESH">
          <Row label="Refresh interval" sub="Live events polling frequency">
            <Select
              value={local.refreshInterval}
              onChange={(v) => setLocal({ ...local, refreshInterval: v as DashboardSettings['refreshInterval'] })}
              options={['30s', '1 minute', '5 minutes', '10 minutes']}
            />
          </Row>
        </Section>

        {/* COLUMN VISIBILITY */}
        <Section title="COLUMN VISIBILITY">
          <Row label="Show Last Login" sub="Vendor directory table">
            <Toggle checked={local.showLastLogin} onChange={(v) => setLocal({ ...local, showLastLogin: v })} />
          </Row>
          <Row label="Show Username" sub="Vendor directory table">
            <Toggle checked={local.showUsername} onChange={(v) => setLocal({ ...local, showUsername: v })} />
          </Row>
          <Row label="Show Vendor ID" sub="All tables">
            <Toggle checked={local.showVendorId} onChange={(v) => setLocal({ ...local, showVendorId: v })} />
          </Row>
        </Section>

        {/* Footer buttons */}
        <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-5 py-2 text-[13px] font-medium rounded-lg transition"
            style={{ color: 'var(--tx2)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.6px] mb-2" style={{ color: 'var(--tx3)' }}>{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
      <div>
        <p className="text-[14px] font-medium" style={{ color: 'var(--tx1)' }}>{label}</p>
        {sub && <p className="text-[12px]" style={{ color: 'var(--tx3)' }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-3 py-1.5 text-[13px] focus:outline-none appearance-none pr-8 cursor-pointer"
      style={{ background: 'var(--app-bg)', border: '1px solid var(--border)', color: 'var(--tx2)', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px' }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-600'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}
