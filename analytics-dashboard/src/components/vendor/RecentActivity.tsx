import { useState } from 'react';

const tabs = ['All', 'Laundry', 'Refrigerator', 'Cooking', 'Dishwasher', 'HVAC'];

type Activity = {
  status: string;
  statusColor: string;
  appliance: string;
  soNumber: string;
  time: string;
};

const activities: Activity[] = [
  { status: 'Completed', statusColor: 'text-green-600', appliance: 'Refrigerator', soNumber: 'SO-12882415', time: '2h ago' },
  { status: 'Arrived', statusColor: 'text-green-600', appliance: 'Washer', soNumber: 'SO-12348239', time: '3h ago' },
  { status: 'Assigned', statusColor: 'text-orange-500', appliance: 'Dishwasher', soNumber: 'SO-12374797', time: '5h ago' },
  { status: 'Cancelled', statusColor: 'text-red-500', appliance: 'Dryer', soNumber: 'SO-12498498', time: '1d ago' },
  { status: 'Completed', statusColor: 'text-green-600', appliance: 'HVAC', soNumber: 'SO-12619788', time: '1d ago' },
  { status: 'Parts ordered', statusColor: 'text-purple-600', appliance: 'Refrigerator', soNumber: 'SO-12180033', time: '2d ago' },
];

export function RecentActivity() {
  const [activeTab, setActiveTab] = useState('All');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Recent activity</h3>
          <p className="text-[11px] text-slate-400">Last 6 events</p>
        </div>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition ${
                activeTab === tab
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {activities.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                item.status === 'Completed' ? 'bg-green-500' :
                item.status === 'Arrived' ? 'bg-green-500' :
                item.status === 'Assigned' ? 'bg-orange-500' :
                item.status === 'Cancelled' ? 'bg-red-500' :
                'bg-purple-500'
              }`} />
              <span className={`text-xs font-medium ${item.statusColor} w-24`}>{item.status}</span>
              <div>
                <p className="text-xs font-medium text-slate-700">{item.appliance}</p>
                <p className="text-[10px] text-slate-400">{item.soNumber}</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
