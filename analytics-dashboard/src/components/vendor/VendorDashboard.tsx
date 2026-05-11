import { useState } from 'react';
import { VendorProfile } from './VendorProfile';
import { KpiCards } from './KpiCards';
import { AssignmentOutcomes } from './AssignmentOutcomes';
import { ApplianceMix } from './ApplianceMix';
import { CompletionTypes } from './CompletionTypes';
import { RecentActivity } from './RecentActivity';
import { VendorDetails } from './VendorDetails';
import { RecentAssignments } from './RecentAssignments';

const periods = ['This Week', 'This Month', 'Last 3 Months', 'Year to Date', 'All Time'];

export function VendorDashboard() {
  const [activePeriod, setActivePeriod] = useState('All Time');

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="text-xs text-slate-500">
        <span className="hover:text-slate-700 cursor-pointer">Overview</span>
        <span className="mx-1.5">&rsaquo;</span>
        <span className="hover:text-slate-700 cursor-pointer">Operations</span>
        <span className="mx-1.5">&rsaquo;</span>
        <span className="text-slate-800 font-medium">Blum HVAC and Appliance</span>
      </div>

      {/* Vendor Profile Card */}
      <VendorProfile />

      {/* Period Tabs */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-1">Period:</span>
        {periods.map((period) => (
          <button
            key={period}
            onClick={() => setActivePeriod(period)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
              activePeriod === period
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <KpiCards />

      {/* Charts Row: Assignment Outcomes + Appliance Mix + Completion Types */}
      <div className="grid grid-cols-3 gap-4">
        <AssignmentOutcomes />
        <ApplianceMix />
        <CompletionTypes />
      </div>

      {/* Recent Activity + Vendor Details */}
      <div className="grid grid-cols-[1fr_380px] gap-4">
        <RecentActivity />
        <VendorDetails />
      </div>

      {/* Recent Assignments Table */}
      <RecentAssignments />
    </div>
  );
}
