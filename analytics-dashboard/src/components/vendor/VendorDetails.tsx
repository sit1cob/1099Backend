export function VendorDetails() {
  const details = [
    { label: 'Technicians', value: '1 active', valueColor: 'text-green-600' },
    { label: 'Reschedule rate', value: '1%', subtext: 'Normal', valueColor: 'text-green-600' },
    { label: 'Email', value: 'blumhvac@outlook.com', valueColor: 'text-slate-700 font-mono text-[11px]' },
    { label: 'Phone', value: '2125557788', valueColor: 'text-slate-700 font-mono text-[11px]' },
    { label: 'Username', value: 'BLUM_Appliance', valueColor: 'text-slate-700 font-mono text-[11px]' },
    { label: 'KAIros score', value: '+ 3.6 / 5.0', subtext: 'Average', valueColor: 'text-green-600' },
    { label: 'Payment', value: 'Pending', valueColor: 'text-red-500 font-semibold' },
    { label: 'Last active', value: 'Apr 27, 2026 14:02 PM', valueColor: 'text-slate-700 text-[11px]' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Vendor details</h3>
        <p className="text-[11px] text-slate-400">contact & performance</p>
      </div>

      <div className="space-y-3">
        {details.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
            <span className="text-xs text-slate-500">{item.label}</span>
            <div className="text-right">
              <span className={`text-xs ${item.valueColor}`}>{item.value}</span>
              {item.subtext && (
                <p className="text-[10px] text-slate-400">{item.subtext}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
