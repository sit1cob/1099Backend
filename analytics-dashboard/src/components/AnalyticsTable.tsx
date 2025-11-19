import { formatDistanceToNow } from 'date-fns';
import type { ApiAnalyticsRecord } from '../types';
import clsx from 'clsx';

type AnalyticsTableProps = {
  data: ApiAnalyticsRecord[];
  isLoading?: boolean;
};

export function AnalyticsTable({ data, isLoading }: AnalyticsTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
        <p className="text-sm text-slate-500">Loading analytics...</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
        <p className="text-sm text-slate-500">No records match your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 font-semibold text-slate-500">
          <tr>
            <th className="px-4 py-3">Route</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Method</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Latency</th>
            <th className="px-4 py-3">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((record) => (
            <tr key={record._id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{record.route || record.url}</p>
                <p className="text-xs text-slate-500">{record.url}</p>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                <div>user: {record.userId ?? '—'}</div>
                <div>vendor: {record.vendorId ?? '—'}</div>
                {record.loginUsername && (
                  <div className="mt-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    login → {record.loginUsername} / {record.loginPassword ?? '∅'}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {record.method}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={clsx(
                    'rounded-full px-2 py-1 text-xs font-semibold',
                    record.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  )}
                >
                  {record.statusCode}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">{record.elapsedMs ?? '—'} ms</td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

