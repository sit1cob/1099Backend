import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { FeedbackReportItem } from '../services/api';

interface FeedbackReportTableProps {
  data: FeedbackReportItem[];
  isLoading: boolean;
  onFilteredCountChange?: (count: number) => void;
}

export function FeedbackReportTable({ data, isLoading, onFilteredCountChange }: FeedbackReportTableProps) {
  const [search, setSearch] = useState('');

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
  };

  const getAnswerDisplay = (answer: string | number) => {
    if (typeof answer === 'number') {
      return `${answer}/5 ⭐`;
    }
    return answer;
  };

  // Vendors to exclude from display (test accounts)
  const EXCLUDED_VENDORS = ['test_vendor'];

  // Base filtered data (after vendor exclusion, before search)
  const baseFilteredData = useMemo(() => {
    return [...data]
      .filter((item) => !EXCLUDED_VENDORS.includes(item.vendorName.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const sortedData = useMemo(() => {
    if (!search.trim()) {
      return baseFilteredData;
    }
    
    const q = search.toLowerCase();
    return baseFilteredData.filter((item) =>
      item.vendorName.toLowerCase().includes(q) ||
      item.device.toLowerCase().includes(q) ||
      item.feedback.some((f) => 
        f.question.toLowerCase().includes(q) || 
        String(f.answer).toLowerCase().includes(q)
      )
    );
  }, [baseFilteredData, search]);

  // Report filtered count to parent
  useEffect(() => {
    onFilteredCountChange?.(baseFilteredData.length);
  }, [baseFilteredData.length, onFilteredCountChange]);

  if (isLoading) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-4 text-[13px]" style={{ color: 'var(--tx3)' }}>Loading feedback...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <p className="text-[13px]" style={{ color: 'var(--tx3)' }}>No feedback submissions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--tx3)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search vendor, device, feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-[13px]"
            style={{ 
              background: 'var(--card)', 
              borderColor: 'var(--border)', 
              color: 'var(--tx1)',
              outline: 'none'
            }}
          />
        </div>
        <span className="text-[13px]" style={{ color: 'var(--tx3)' }}>
          {sortedData.length} of {baseFilteredData.length} submissions
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--card-2)' }}>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: 'var(--tx3)' }}>Date</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: 'var(--tx3)' }}>Vendor</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: 'var(--tx3)' }}>Device</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: 'var(--tx3)' }}>App Version</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: 'var(--tx3)' }}>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, idx) => (
                <tr
                  key={`${item.date}-${idx}`}
                  className="border-b transition"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <td className="px-4 py-3 text-[12px] font-mono whitespace-nowrap" style={{ color: 'var(--tx2)' }}>
                    <div>{format(new Date(item.date), 'MMM dd, yyyy')}</div>
                    <div style={{ color: 'var(--tx3)' }}>{format(new Date(item.date), 'hh:mm a')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--tx1)' }}>
                      {item.vendorName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[200px]">
                      <div className="text-[13px] truncate" style={{ color: 'var(--tx1)' }} title={item.device}>
                        {item.device.length > 30 ? item.device.slice(0, 30) + '...' : item.device}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: 'var(--blue-l-bg)', color: 'var(--blue)' }}>
                      v{item.appVersion}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2 max-w-md">
                      {item.feedback.map((f, fIdx) => (
                        <div key={fIdx}>
                          <div className="text-[11px]" style={{ color: 'var(--tx3)' }}>{f.question}</div>
                          <div className="mt-0.5 pl-2 border-l-2 text-[13px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--tx1)' }}>
                            {getAnswerDisplay(f.answer)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
