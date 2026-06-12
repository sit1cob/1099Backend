import { useState } from 'react';
import type { CompletedVendor } from '../../services/dashboardApi';

type Props = {
  data: CompletedVendor[] | undefined;
  overall: number | undefined;
  isLoading: boolean;
  onVendorClick?: (vendorId: number) => void;
};

export function CompletedByVendorTable({ data, overall, isLoading, onVendorClick }: Props) {
  const [search, setSearch] = useState('');

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />;
  }

  const filtered = (data ?? []).filter((v) =>
    v.vendorName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Completed Jobs by Vendor</h3>
          {overall !== undefined && (
            <p className="text-xs text-slate-400">
              Total: <span className="font-semibold text-emerald-600">{overall.toLocaleString()}</span>
            </p>
          )}
        </div>
        <input
          type="text"
          placeholder="Search vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-2">#</th>
              <th className="px-5 py-2">Vendor</th>
              <th className="px-5 py-2 text-right">Completed</th>
              <th className="px-5 py-2 text-right">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((v, idx) => (
              <tr
                key={v.vendorId}
                className="cursor-pointer transition hover:bg-slate-50"
                onClick={() => onVendorClick?.(v.vendorId)}
              >
                <td className="px-5 py-2.5 text-slate-400">{idx + 1}</td>
                <td className="px-5 py-2.5">
                  <div className="font-medium text-slate-800">{v.vendorName}</div>
                  <div className="text-xs text-slate-400">ID: {v.vendorId}</div>
                </td>
                <td className="px-5 py-2.5 text-right font-semibold text-emerald-600">
                  {v.completedCount.toLocaleString()}
                </td>
                <td className="px-5 py-2.5 text-right text-slate-500">
                  {overall ? `${((v.completedCount / overall) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                  No vendors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
