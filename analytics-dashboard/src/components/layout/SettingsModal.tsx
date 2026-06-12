import { useState } from 'react';

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

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0f1b2e] border border-slate-700/50 rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-bold text-[#e6edf8]">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition">
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
            <input
              type="date"
              value={local.startDate}
              onChange={(e) => setLocal({ ...local, startDate: e.target.value })}
              className="bg-[#1a2740] border border-slate-600/50 rounded-lg px-3 py-1.5 text-[13px] text-slate-300 focus:outline-none focus:border-blue-500"
            />
          </Row>
          <Row label="To">
            <input
              type="date"
              value={local.endDate}
              onChange={(e) => setLocal({ ...local, endDate: e.target.value })}
              className="bg-[#1a2740] border border-slate-600/50 rounded-lg px-3 py-1.5 text-[13px] text-slate-300 focus:outline-none focus:border-blue-500"
            />
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
        <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-slate-700/40">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[13px] font-medium text-slate-300 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 transition"
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
      <p className="text-[11px] font-semibold text-[#82889e] uppercase tracking-[0.6px] mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-[#131b30] border border-slate-700/30 rounded-xl px-4 py-3">
      <div>
        <p className="text-[14px] font-medium text-[#e6edf8]">{label}</p>
        {sub && <p className="text-[12px] text-[#82889e]">{sub}</p>}
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
      className="bg-[#1a2740] border border-slate-600/50 rounded-lg px-3 py-1.5 text-[13px] text-slate-300 focus:outline-none focus:border-blue-500 appearance-none pr-8 cursor-pointer"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px' }}
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
