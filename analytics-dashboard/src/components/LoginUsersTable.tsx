import { format } from 'date-fns';
import type { LoginUserSummary } from '../types';

type LoginUsersTableProps = {
  data: LoginUserSummary[];
  isLoading?: boolean;
};

export function LoginUsersTable({ data, isLoading }: LoginUsersTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
        <p className="text-sm text-slate-500">Loading users...</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
        <p className="text-sm text-slate-500">No login users yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 font-semibold text-slate-500">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Total logins</th>
            <th className="px-4 py-3">Last login</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row) => (
            <tr key={row.userId || row.username || String(row.lastLoginAt)} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{row.username || row.userId || 'unknown'}</p>
                <p className="text-xs text-slate-500">
                  {row.email ? row.email : row.userId ? `id: ${row.userId}` : '—'}
                </p>
              </td>
              <td className="px-4 py-3 font-semibold text-slate-900">{row.totalLogins}</td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {row.lastLoginAt ? format(new Date(row.lastLoginAt), 'MMM dd, yyyy HH:mm:ss') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
