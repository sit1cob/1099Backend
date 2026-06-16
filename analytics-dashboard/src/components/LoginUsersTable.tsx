import { format } from 'date-fns';
import type { LoginUserSummary } from '../types';

type LoginUsersTableProps = {
  data: LoginUserSummary[];
  isLoading?: boolean;
};

export function LoginUsersTable({ data, isLoading }: LoginUsersTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700/40 bg-[#131b30]">
        <p className="text-sm text-slate-500">Loading users...</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700/40 bg-[#131b30]">
        <p className="text-sm text-slate-500">No login users yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/40 bg-[#131b30] shadow-sm">
      <table className="min-w-full divide-y divide-slate-700/30 text-left text-sm">
        <thead className="bg-slate-800/50 font-semibold text-[11px] text-[#82889e] uppercase tracking-[0.4px]">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Total logins</th>
            <th className="px-4 py-3">Last login</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {data.map((row) => (
            <tr key={row.userId || row.username || String(row.lastLoginAt)} className="hover:bg-slate-800/40 transition">
              <td className="px-4 py-3">
                <p className="text-[13px] font-semibold text-[#e6edf8]">{row.username || row.userId || 'unknown'}</p>
                <p className="text-[11px] text-[#82889e] font-mono">
                  {row.email ? row.email : row.userId ? `id: ${row.userId}` : '—'}
                </p>
              </td>
              <td className="px-4 py-3 text-[13px] font-semibold text-white font-mono">{row.totalLogins}</td>
              <td className="px-4 py-3 text-[13px] text-[#8498b7] font-mono">
                {row.lastLoginAt ? format(new Date(row.lastLoginAt), 'MMM dd, yyyy hh:mm a') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
