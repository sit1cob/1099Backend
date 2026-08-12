import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchVendorServiceOrders, type VendorServiceOrder } from '../../services/dashboardApi';

type Props = {
  vendorId: number;
  vendorName: string;
  startDate: string;
  endDate: string;
  onBack: () => void;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: 'rgba(74,222,128,0.12)', text: '#4ade80' },
  arrived: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
  claimed: { bg: 'rgba(84,132,209,0.15)', text: '#5484d1' },
  available: { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' },
  started: { bg: 'rgba(236,72,153,0.12)', text: '#ec4899' },
  in_progress: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
};

function getStatusStyle(status: string) {
  const s = status.toLowerCase().replace(/[\s-]/g, '_');
  return STATUS_COLORS[s] ?? { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' };
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return format(new Date(iso), 'MMM dd, yyyy');
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return format(new Date(iso), 'MMM dd, yyyy h:mm a');
}

export function VendorDetailPage({ vendorId, vendorName, startDate, endDate, onBack }: Props) {
  const [page, setPage] = useState(1);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['vendor-service-orders', vendorId, startDate, endDate, page],
    queryFn: () => fetchVendorServiceOrders({ vendorId, startDate, endDate, page, limit: 20 }),
    staleTime: 60000,
  });

  const jobs: VendorServiceOrder[] = query.data?.data?.jobs ?? [];
  const pagination = query.data?.data?.pagination;
  const counts = query.data?.data?.statusCounts;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: 'var(--tx2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--tx1)', margin: 0 }}>{vendorName}</h2>
          <p style={{ fontSize: '12px', color: 'var(--tx3)', margin: '2px 0 0' }}>
            Vendor ID: {vendorId} · {fmtDate(startDate)} – {fmtDate(endDate)}
          </p>
        </div>
      </div>

      {/* Status Summary Cards */}
      {counts && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div className="card-kairos" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Offered</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--tx1)', marginTop: '4px' }}>{counts.JOBS_OFFERED}</div>
          </div>
          <div className="card-kairos" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Claimed</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#5484d1', marginTop: '4px' }}>{counts.JOBS_CLAIMED}</div>
          </div>
          <div className="card-kairos" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>In Progress</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>{counts.JOBS_INPROGRESS}</div>
          </div>
          <div className="card-kairos" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Completed</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80', marginTop: '4px' }}>{counts.JOBS_COMPLETED}</div>
          </div>
          <div className="card-kairos" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Unclaimed</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#94a3b8', marginTop: '4px' }}>{counts.JOBS_UNCLAIMED}</div>
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <div className="card-kairos">
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--tx1)' }}>Service Orders</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '2px' }}>
              {pagination ? `${pagination.total} jobs found` : 'Loading...'}
            </div>
          </div>
        </div>

        <div className="card-scroll-wrap" style={{ maxHeight: '600px' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>SO #</th>
                <th style={{ width: '90px' }}>Status</th>
                <th>Customer</th>
                <th>Appliance</th>
                <th>Brand</th>
                <th style={{ width: '100px' }}>Scheduled</th>
                <th style={{ width: '30px' }}></th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--tx3)' }}>Loading...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: 'var(--fs-md)', color: 'var(--tx2)', fontWeight: 500 }}>No service orders found</p>
                  <p style={{ fontSize: 'var(--fs-base)', color: 'var(--tx3)' }}>Try widening the date range</p>
                </td></tr>
              ) : (
                jobs.map((job) => {
                  const statusStyle = getStatusStyle(job.status);
                  const isExpanded = expandedJob === job.id;
                  return (
                    <>
                      <tr
                        key={job.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                      >
                        <td className="font-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx1)', fontWeight: 600 }}>{job.soNumber}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            background: statusStyle.bg,
                            color: statusStyle.text,
                          }}>
                            {job.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 500, color: 'var(--tx1)' }}>{job.customerName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--tx3)' }}>{job.customerCity}, {job.customerZip}</div>
                        </td>
                        <td style={{ fontSize: 'var(--fs-base)', color: 'var(--tx2)' }}>{job.applianceType}</td>
                        <td style={{ fontSize: 'var(--fs-base)', color: 'var(--tx2)' }}>{job.manufacturerBrand}</td>
                        <td className="font-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx2)' }}>{fmtDate(job.scheduledDate)}</td>
                        <td style={{ color: 'var(--tx3)', fontSize: '12px' }}>{isExpanded ? '▾' : '▸'}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${job.id}-detail`}>
                          <td colSpan={7} style={{ padding: '0 18px 16px', background: 'var(--card-2, var(--card))' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', borderRadius: '8px', background: 'var(--app-bg)', border: '1px solid var(--border)' }}>
                              {/* Left column */}
                              <div>
                                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Job Details</h4>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Service Description</span>
                                    <span style={{ fontSize: '12px', color: 'var(--tx1)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{job.serviceDescription}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Customer Type</span>
                                    <span style={{ fontSize: '12px', color: 'var(--tx1)', fontWeight: 500 }}>{job.customerType}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Recall</span>
                                    <span style={{ fontSize: '12px', color: job.isRecall ? '#f87171' : 'var(--tx1)', fontWeight: 500 }}>{job.isRecall ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Created</span>
                                    <span style={{ fontSize: '12px', color: 'var(--tx1)', fontWeight: 500 }}>{fmtDateTime(job.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Right column - Assignment */}
                              <div>
                                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Assignment</h4>
                                {job.assignment ? (
                                  <div style={{ display: 'grid', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Status</span>
                                      <span style={{ fontSize: '12px', color: getStatusStyle(job.assignment.status).text, fontWeight: 600, textTransform: 'capitalize' }}>{job.assignment.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Assigned At</span>
                                      <span style={{ fontSize: '12px', color: 'var(--tx1)', fontWeight: 500 }}>{fmtDateTime(job.assignment.assignedAt)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Arrived At</span>
                                      <span style={{ fontSize: '12px', color: 'var(--tx1)', fontWeight: 500 }}>{fmtDateTime(job.assignment.arrivedAt)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Completed At</span>
                                      <span style={{ fontSize: '12px', color: 'var(--tx1)', fontWeight: 500 }}>{fmtDateTime(job.assignment.completedAt)}</span>
                                    </div>
                                    {job.assignment.completionType && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>Completion Type</span>
                                        <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 500 }}>{job.assignment.completionType}</span>
                                      </div>
                                    )}
                                    {job.assignment.completionNotes && (
                                      <div style={{ marginTop: '8px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>Completion Notes</span>
                                        <p style={{ fontSize: '12px', color: 'var(--tx2)', lineHeight: '1.5', margin: 0, maxHeight: '80px', overflow: 'auto' }}>{job.assignment.completionNotes}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p style={{ fontSize: '12px', color: 'var(--tx3)', fontStyle: 'italic' }}>Not yet assigned</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)' }}>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total} jobs
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="pbtn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >‹ Prev</button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pbtn ${page === pageNum ? 'on' : ''}`}
                    onClick={() => setPage(pageNum)}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >{pageNum}</button>
                );
              })}
              <button
                className="pbtn"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
