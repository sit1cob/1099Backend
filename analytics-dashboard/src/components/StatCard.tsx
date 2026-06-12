type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  accent?: 'green' | 'red' | 'blue';
};

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-emerald-600 bg-emerald-50',
  red: 'text-rose-600 bg-rose-50',
};

export function StatCard({ label, value, helper, accent = 'blue' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-slate-900">{value}</span>
        {helper && (
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${accentClasses[accent]}`}>
            {helper}
          </span>
        )}
      </div>
    </div>
  );
}

