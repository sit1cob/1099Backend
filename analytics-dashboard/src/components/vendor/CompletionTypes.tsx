const data = [
  { name: 'Completed', value: 80, pct: 85, color: '#eab308' },
  { name: 'Customer Not Home', value: 2, pct: 11, color: '#f59e0b' },
  { name: 'Cancel at Door', value: 2, pct: 8, color: '#f97316' },
  { name: 'Estimate Declined', value: 2, pct: 7, color: '#3b82f6' },
  { name: 'Rescheduled', value: 0, pct: 1, color: '#3b82f6' },
];

export function CompletionTypes() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Completion types</h3>
        <p className="text-[11px] text-slate-400">how jobs were closed</p>
      </div>

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-600">{item.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{item.value}</span>
                <span className="text-[10px] text-slate-400">{item.pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${item.pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
