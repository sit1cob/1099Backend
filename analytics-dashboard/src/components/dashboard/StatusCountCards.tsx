import type { StatusCounts } from '../../services/dashboardApi';

type Props = {
  data: StatusCounts | undefined;
  isLoading: boolean;
  vendorCount?: number;
  completedOverall?: number;
};

const STATUS_CONFIG: { key: keyof StatusCounts; label: string; color: string; bg: string }[] = [
  { key: 'JOB_CLAIMED', label: 'Claimed', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { key: 'JOB_ARRIVED', label: 'Arrived', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { key: 'JOB_COMPLETED', label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'JOB_RESCHEDULED', label: 'Rescheduled', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  { key: 'PART_ORDER_SUBMITTED', label: 'Part Orders', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
];

export function StatusCountCards({ data, isLoading, vendorCount, completedOverall }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {vendorCount !== undefined && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Vendors</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">{vendorCount.toLocaleString()}</p>
        </div>
      )}
      {completedOverall !== undefined && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Total Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{completedOverall.toLocaleString()}</p>
        </div>
      )}
      {STATUS_CONFIG.map(({ key, label, color, bg }) => (
        <div key={key} className={`rounded-2xl border p-4 shadow-sm ${bg}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${color}`}>{label}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>
            {data?.[key]?.toLocaleString() ?? '—'}
          </p>
        </div>
      ))}
    </div>
  );
}
