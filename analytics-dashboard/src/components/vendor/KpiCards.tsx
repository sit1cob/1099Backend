type KpiCardProps = {
  title: string;
  value: string;
  subtitle: string;
  footnote?: string;
  footnoteColor?: string;
  borderColor: string;
};

function KpiCard({ title, value, subtitle, footnote, footnoteColor, borderColor }: KpiCardProps) {
  return (
    <div className={`bg-white rounded-xl border-t-[3px] ${borderColor} border-x border-b border-slate-200 p-4 flex flex-col justify-between min-h-[120px]`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {footnote && (
        <p className={`text-[10px] mt-2 font-medium ${footnoteColor || 'text-slate-400'}`}>{footnote}</p>
      )}
    </div>
  );
}

export function KpiCards() {
  return (
    <div className="grid grid-cols-6 gap-3">
      <KpiCard
        title="Completion Rate"
        value="70%"
        subtitle="80 completed"
        footnote="&#9650; Below 75% target"
        footnoteColor="text-green-600"
        borderColor="border-t-green-500"
      />
      <KpiCard
        title="Total Jobs"
        value="106"
        subtitle="this period"
        borderColor="border-t-blue-500"
      />
      <KpiCard
        title="Avg Duration"
        value="48min"
        subtitle="Fleet avg: 45 min"
        footnote="&#9650; 3 min slower"
        footnoteColor="text-orange-500"
        borderColor="border-t-orange-400"
      />
      <KpiCard
        title="Kairos Score"
        value="&#9733; 3.6"
        subtitle="out of 5.0"
        footnote="completion · photos · reliability"
        footnoteColor="text-slate-400"
        borderColor="border-t-yellow-400"
      />
      <KpiCard
        title="Photo Compliance"
        value="70%"
        subtitle="Fleet avg: 53%"
        footnote="&#9650; Above fleet avg"
        footnoteColor="text-green-600"
        borderColor="border-t-purple-500"
      />
      <KpiCard
        title="Parts Wait"
        value="8"
        subtitle="jobs blocked"
        footnote="6% of total jobs"
        footnoteColor="text-slate-400"
        borderColor="border-t-red-400"
      />
    </div>
  );
}
