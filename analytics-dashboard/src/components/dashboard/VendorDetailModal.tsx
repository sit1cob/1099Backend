import type { StatusCounts } from '../../services/dashboardApi';

type Props = {
  vendorId: number;
  vendorName?: string;
  data: { statusCounts: StatusCounts; partOrders: unknown[] } | undefined;
  isLoading: boolean;
  onClose: () => void;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  JOB_CLAIMED: { label: 'Claimed', color: 'text-blue-700' },
  JOB_STARTED: { label: 'Started', color: 'text-cyan-700' },
  JOB_ARRIVED: { label: 'Arrived', color: 'text-amber-700' },
  JOB_COMPLETED: { label: 'Completed', color: 'text-emerald-700' },
  JOB_RESCHEDULED: { label: 'Rescheduled', color: 'text-orange-700' },
  PART_ORDER_SUBMITTED: { label: 'Part Orders', color: 'text-purple-700' },
};

export function VendorDetailModal({ vendorId, vendorName, data, isLoading, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {vendorName ?? `Vendor #${vendorId}`}
            </h3>
            <p className="text-xs text-slate-400">Vendor ID: {vendorId}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-2">
            {Object.entries(data.statusCounts).map(([key, count]) => {
              const cfg = STATUS_LABELS[key];
              if (!cfg) return null;
              return (
                <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
                  <span className="text-sm text-slate-600">{cfg.label}</span>
                  <span className={`text-sm font-bold ${cfg.color}`}>{(count as number).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No data available</p>
        )}
      </div>
    </div>
  );
}
