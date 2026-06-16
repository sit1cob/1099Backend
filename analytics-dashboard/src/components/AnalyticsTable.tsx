import { format } from 'date-fns';
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
            <th className="px-4 py-3">Request Body</th>
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
                {record.userId && <div>user: {record.userId}</div>}
                {record.vendorId && <div>vendor: {record.vendorId}</div>}
                {!record.userId && !record.vendorId && <div className="text-slate-400">anonymous</div>}
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
              <td className="px-4 py-3 max-w-xs">
                {record.requestBody && Object.keys(record.requestBody).length > 0 ? (
                  <details className="cursor-pointer">
                    <summary className="text-xs font-medium text-brand-600 hover:text-brand-700">
                      View body ({Object.keys(record.requestBody).length} fields)
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px] text-slate-700">
                      {JSON.stringify(record.requestBody, null, 2)}
                    </pre>
                  </details>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                <div className="font-medium">{format(new Date(record.createdAt), 'MMM dd, yyyy')}</div>
                <div className="text-slate-500">{format(new Date(record.createdAt), 'hh:mm a')}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

