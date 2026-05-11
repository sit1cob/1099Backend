const data = [
  { name: 'Laundry', pct: 38, count: 40, color: '#3b82f6' },
  { name: 'Refrigerator', pct: 28, count: 30, color: '#10b981' },
  { name: 'Cooking', pct: 18, count: 19, color: '#f59e0b' },
  { name: 'Dishwasher', pct: 16, count: 17, color: '#8b5cf6' },
];

export function ApplianceMix() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Appliance mix</h3>
        <p className="text-[11px] text-slate-400">by job volume</p>
      </div>

      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-7 mb-3">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ width: `${item.pct}%`, backgroundColor: item.color }}
          >
            {item.pct}%
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-slate-600">
              {item.name} <span className="font-semibold">{item.pct}%</span>
              <span className="text-slate-400"> ({item.count})</span>
            </span>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="bg-slate-50 rounded-lg px-3 py-2">
        <p className="text-[11px] text-slate-500">
          106 total jobs · Consider specializing in top-performing categories.
        </p>
      </div>
    </div>
  );
}
