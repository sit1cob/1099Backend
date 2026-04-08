import { formatDistanceToNow } from 'date-fns';
import type { AnalyticsUserSummary } from '../types';
import clsx from 'clsx';

type UserActivityListProps = {
  users: AnalyticsUserSummary[];
  onSelect?: (userId: string) => void;
  selectedUser?: string;
};

export function UserActivityList({ users, onSelect, selectedUser }: UserActivityListProps) {
  if (!users.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        No user activity yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Active users</p>
        <p className="text-xs text-slate-500">Click a user row to filter analytics.</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {users.map((summary) => {
          const successRate = summary.total ? (summary.success / summary.total) * 100 : 0;
          const isSelected = summary.userId === selectedUser;
          const displayName = summary.username || summary.userId;

          return (
            <li key={summary.userId}>
              <button
                className={clsx(
                  'flex w-full items-center gap-4 px-4 py-3 text-left',
                  'hover:bg-slate-50',
                  isSelected && 'bg-brand-50'
                )}
                onClick={() => onSelect?.(summary.userId)}
              >
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-slate-900">{displayName}</span>
                  <span className="text-xs text-slate-500">
                    Last hit {formatDistanceToNow(new Date(summary.lastSeen), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{summary.total} req</p>
                  <p className="text-xs text-emerald-600">{successRate.toFixed(0)}% success</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
