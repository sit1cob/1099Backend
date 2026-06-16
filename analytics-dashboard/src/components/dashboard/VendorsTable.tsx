import { useState } from 'react';
import { format } from 'date-fns';
import type { Vendor, VendorsListResponse } from '../../services/dashboardApi';
import { fetchVendors } from '../../services/dashboardApi';

type Props = {
  data: VendorsListResponse['data'] | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

export function VendorsTable({ data, isLoading, onPageChange }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCsv = async () => {
    try {
      setDownloading(true);
      const totalPages = data?.pagination?.totalPages ?? 1;
      let allVendors: Vendor[] = [];

      for (let page = 1; page <= totalPages; page++) {
        const res = await fetchVendors(page, 100);
        allVendors = allVendors.concat(res.data.data);
      }

      const header = 'ID,Name,Username,Email,Phone,Last Login';
      const rows = allVendors.map((v) => {
        const lastLogin = v.lastLoginAt
          ? format(new Date(v.lastLoginAt), 'MMM dd, yyyy hh:mm a')
          : '';
        const esc = (s: string | null) => {
          if (!s) return '';
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return [v.id, esc(v.name), esc(v.username), esc(v.email), esc(v.phone), lastLogin].join(',');
      });

      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendors_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />;
  }

  const vendors: Vendor[] = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">All Vendors</h3>
          {pagination && (
            <p className="text-xs text-slate-400">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
          )}
        </div>
        <button
          onClick={handleDownloadCsv}
          disabled={downloading || !vendors.length}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
          </svg>
          {downloading ? 'Downloading...' : 'Download CSV'}
        </button>
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.map((v) => (
              <tr key={v.id} className="transition hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-400">{v.id}</td>
                <td className="px-4 py-2.5 font-medium text-slate-800">{v.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{v.username}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{v.email ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{v.phone}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">
                  {v.lastLoginAt
                    ? format(new Date(v.lastLoginAt), 'MMM dd, yyyy hh:mm a')
                    : <span className="text-slate-300">Never</span>}
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No vendors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <button
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
