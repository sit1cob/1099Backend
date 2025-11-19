import { format } from 'date-fns';
import type { AnalyticsFilter } from '../types';

type FiltersPanelProps = {
  value: AnalyticsFilter;
  onChange: (next: AnalyticsFilter) => void;
};

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function FiltersPanel({ value, onChange }: FiltersPanelProps) {
  const handleChange = (patch: Partial<AnalyticsFilter>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Search</label>
        <input
          type="search"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          placeholder="Route, user id, vendor id..."
          value={value.search ?? ''}
          onChange={(e) => handleChange({ search: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">User ID</label>
        <input
          type="text"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          placeholder="Filter by user id"
          value={value.userId ?? ''}
          onChange={(e) => handleChange({ userId: e.target.value || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Method</label>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={value.method ?? ''}
          onChange={(e) => handleChange({ method: e.target.value || undefined })}
        >
          <option value="">All</option>
          {methods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Status</label>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={value.success ?? 'all'}
          onChange={(e) => handleChange({ success: e.target.value as AnalyticsFilter['success'] })}
        >
          <option value="all">All</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">From</label>
          <input
            type="date"
            max={value.to ?? format(new Date(), 'yyyy-MM-dd')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={value.from ?? ''}
            onChange={(e) => handleChange({ from: e.target.value || undefined })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">To</label>
          <input
            type="date"
            min={value.from}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={value.to ?? ''}
            onChange={(e) => handleChange({ to: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}

