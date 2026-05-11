import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchAnalytics } from '../services/api';
import { LatencyTrend } from './LatencyTrend';
import type { ApiAnalyticsRecord } from '../types';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

function getStatusStyle(code: number) {
  if (code >= 200 && code < 300) return 'text-emerald-600';
  if (code >= 300 && code < 400) return 'text-blue-500';
  if (code >= 400 && code < 500) return 'text-amber-600';
  return 'text-red-600';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function EventRow({ event }: { event: ApiAnalyticsRecord }) {
  const [expanded, setExpanded] = useState(false);
  const methodColor = METHOD_COLORS[event.method] || 'bg-slate-100 text-slate-700';

  return (
    <div className="border-b border-slate-700/30 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-800/40 transition text-left"
      >
        {/* Live dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.success ? 'bg-emerald-400' : 'bg-red-400'}`} />

        {/* Method badge */}
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${methodColor}`}>
          {event.method}
        </span>

        {/* URL */}
        <span className="flex-1 text-xs font-mono text-slate-400 truncate">{event.url}</span>

        {/* Status code */}
        <span className={`text-xs font-bold ${getStatusStyle(event.statusCode)}`}>
          {event.statusCode}
        </span>

        {/* Latency */}
        <span className="text-[11px] text-slate-400 w-16 text-right">
          {event.elapsedMs != null ? `${event.elapsedMs}ms` : '—'}
        </span>

        {/* Time */}
        <span className="text-[11px] text-slate-400 w-16 text-right">{timeAgo(event.createdAt)}</span>

        {/* Expand icon */}
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-3 pt-0 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] bg-slate-800/40 ml-5 mr-5 mb-2 rounded-lg p-3">
          {event.userId && (
            <div>
              <span className="text-slate-400">User: </span>
              <span className="font-medium text-slate-300">{event.userId}</span>
            </div>
          )}
          {event.vendorId && (
            <div>
              <span className="text-slate-400">Vendor: </span>
              <span className="font-medium text-slate-300">{event.vendorId}</span>
            </div>
          )}
          {event.ipAddress && (
            <div>
              <span className="text-slate-400">IP: </span>
              <span className="font-mono text-slate-400">{event.ipAddress}</span>
            </div>
          )}
          {event.userAgent && (
            <div className="col-span-2">
              <span className="text-slate-400">UA: </span>
              <span className="font-mono text-slate-400 break-all">{event.userAgent}</span>
            </div>
          )}
          <div>
            <span className="text-slate-400">Time: </span>
            <span className="text-slate-400">{new Date(event.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LiveEvents() {
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  const eventsQuery = useQuery({
    queryKey: ['live-events'],
    queryFn: () => fetchAnalytics({ limit: 100, page: 1 }),
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const events = eventsQuery.data?.data || [];
  const filteredEvents = methodFilter === 'ALL'
    ? events
    : events.filter((e) => e.method === methodFilter);

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  const successCount = events.filter((e) => e.success).length;
  const failCount = events.filter((e) => !e.success).length;
  const avgLatency = events.length
    ? Math.round(events.reduce((s, e) => s + (e.elapsedMs || 0), 0) / events.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Live Events</h2>
          <p className="text-sm text-slate-500">Real-time API activity — auto-refreshes every 5s</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Live</span>
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#131b30] rounded-xl border border-slate-700/40 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Events</p>
          <p className="text-2xl font-bold text-white">{events.length}</p>
        </div>
        <div className="bg-[#131b30] rounded-xl border border-slate-700/40 px-4 py-3">
          <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Successful</p>
          <p className="text-2xl font-bold text-emerald-400">{successCount}</p>
        </div>
        <div className="bg-[#131b30] rounded-xl border border-slate-700/40 px-4 py-3">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Failed</p>
          <p className="text-2xl font-bold text-red-400">{failCount}</p>
        </div>
        <div className="bg-[#131b30] rounded-xl border border-slate-700/40 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</p>
          <p className="text-2xl font-bold text-white">{avgLatency}<span className="text-sm font-normal text-slate-400">ms</span></p>
        </div>
      </div>

      {/* Latency Trend Graph */}
      <LatencyTrend data={events} />

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Filter:</span>
        {methods.map((m) => (
          <button
            key={m}
            onClick={() => setMethodFilter(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
              methodFilter === m
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            {m}
          </button>
        ))}
        <span className="flex-1" />
        <span className="text-[11px] text-slate-400">
          {filteredEvents.length} events
        </span>
      </div>

      {/* Events table */}
      <div className="bg-[#131b30] rounded-xl border border-slate-700/40 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-800/50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700/30">
          <span className="w-2" />
          <span className="w-14">Method</span>
          <span className="flex-1">Endpoint</span>
          <span className="w-12 text-right">Status</span>
          <span className="w-16 text-right">Latency</span>
          <span className="w-16 text-right">Time</span>
          <span className="w-3.5" />
        </div>

        {/* Events list */}
        {eventsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting to live feed...
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-slate-400">No events found</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {filteredEvents.map((event) => (
              <EventRow key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
