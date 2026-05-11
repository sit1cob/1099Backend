import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Completed', value: 80, color: '#10b981' },
  { name: 'Cancelled', value: 6, color: '#ef4444' },
  { name: 'Waiting parts', value: 8, color: '#f59e0b' },
  { name: 'In progress', value: 7, color: '#3b82f6' },
  { name: 'Rejected', value: 5, color: '#8b5cf6' },
];

export function AssignmentOutcomes() {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const completionPct = 70;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-slate-800">Assignment outcomes</h3>
        <p className="text-[11px] text-slate-400">{total} total &middot; all time</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut chart */}
        <div className="relative w-[140px] h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-slate-900">{completionPct}%</span>
            <span className="text-[10px] text-green-600">completion</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-600">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">{item.value}</span>
                <span className="text-[10px] text-slate-400">{Math.round((item.value / total) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
