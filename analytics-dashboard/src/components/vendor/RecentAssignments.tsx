type Assignment = {
  soNumber: string;
  appliance: string;
  status: string;
  statusColor: string;
  duration: string;
  durationColor?: string;
  date: string;
};

const assignments: Assignment[] = [
  { soNumber: 'SO-12383118', appliance: 'Refrigerator', status: 'Completed', statusColor: 'bg-green-100 text-green-700', duration: '47 min', date: 'Apr 28, 2026' },
  { soNumber: 'SO-12100688', appliance: 'Washer', status: 'Completed', statusColor: 'bg-green-100 text-green-700', duration: '85 min', durationColor: 'text-red-500', date: 'Apr 27, 2026' },
  { soNumber: 'SO-12596036', appliance: 'Dryer', status: 'Completed', statusColor: 'bg-green-100 text-green-700', duration: '75 min', durationColor: 'text-red-500', date: 'Apr 26, 2026' },
  { soNumber: 'SO-12373449', appliance: 'Dishwasher', status: 'Completed', statusColor: 'bg-green-100 text-green-700', duration: '51 min', date: 'Apr 25, 2026' },
  { soNumber: 'SO-12453666', appliance: 'HVAC', status: 'Completed', statusColor: 'bg-green-100 text-green-700', duration: '83 min', durationColor: 'text-red-500', date: 'Apr 24, 2026' },
  { soNumber: 'SO-12900360', appliance: 'Microwave', status: 'Completed', statusColor: 'bg-green-100 text-green-700', duration: '49 min', date: 'Apr 23, 2026' },
  { soNumber: 'SO-12802872', appliance: 'Refrigerator', status: 'Completed', statusColor: 'bg-green-100 text-green-700', duration: '81 min', durationColor: 'text-red-500', date: 'Apr 22, 2026' },
  { soNumber: 'SO-12914991', appliance: 'Washer', status: 'Cancelled', statusColor: 'bg-red-100 text-red-700', duration: '84 min', durationColor: 'text-red-500', date: 'Apr 21, 2026' },
];

export function RecentAssignments() {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Recent assignments</h3>
          <p className="text-[11px] text-slate-400">Last 10 jobs for this vendor</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            <tr>
              <th className="px-5 py-3">SO Number</th>
              <th className="px-5 py-3">Appliance</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Duration</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {assignments.map((item) => (
              <tr key={item.soNumber} className="hover:bg-slate-50/50 transition">
                <td className="px-5 py-3 font-medium text-slate-700">{item.soNumber}</td>
                <td className="px-5 py-3 text-slate-600">{item.appliance}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.statusColor}`}>
                    {item.status}
                  </span>
                </td>
                <td className={`px-5 py-3 ${item.durationColor || 'text-slate-600'}`}>
                  {item.duration}
                </td>
                <td className="px-5 py-3 text-slate-500">{item.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
