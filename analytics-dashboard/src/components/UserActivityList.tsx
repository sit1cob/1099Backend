import { formatDistanceToNow } from 'date-fns';
import type { ApiAnalyticsRecord } from '../types';
import clsx from 'clsx';

type UserActivityListProps = {
  records: ApiAnalyticsRecord[];
  onSelect?: (userId: string) => void;
  selectedUser?: string;
};

type UserSummary = {
  userId: string;
  total: number;
  success: number;
  lastSeen: string;
};

export function UserActivityList({ records, onSelect, selectedUser }: UserActivityListProps) {
  const summaries = aggregateUsers(records);

  if (!summaries.length) {
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
        {summaries.map((summary) => {
          const successRate = summary.total ? (summary.success / summary.total) * 100 : 0;
          const isSelected = summary.userId === selectedUser;

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
                  <span className="text-sm font-semibold text-slate-900">{summary.userId}</span>
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

function aggregateUsers(records: ApiAnalyticsRecord[]): UserSummary[] {
  const buckets = new Map<string, UserSummary>();

  records.forEach((record) => {
    const userId = record.userId || 'anonymous';
    const bucket = buckets.get(userId) || {
      userId,
      total: 0,
      success: 0,
      lastSeen: record.createdAt,
    };

    bucket.total += 1;
    if (record.success) bucket.success += 1;
    if (new Date(record.createdAt) > new Date(bucket.lastSeen)) {
      bucket.lastSeen = record.createdAt;
    }

    buckets.set(userId, bucket);
  });

  return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
}

