import clsx from 'clsx';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, current and nearby pages
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{startRecord}</span> to{' '}
          <span className="font-semibold text-slate-900">{endRecord}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalRecords}</span> results
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Per page:</label>
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={clsx(
            'rounded-lg px-3 py-1 text-sm font-medium transition',
            currentPage === 1
              ? 'cursor-not-allowed text-slate-300'
              : 'text-slate-700 hover:bg-slate-100'
          )}
        >
          Previous
        </button>

        <div className="flex gap-1">
          {getPageNumbers().map((page, idx) =>
            typeof page === 'number' ? (
              <button
                key={idx}
                onClick={() => onPageChange(page)}
                className={clsx(
                  'min-w-[32px] rounded-lg px-2 py-1 text-sm font-medium transition',
                  currentPage === page
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="px-2 py-1 text-sm text-slate-400">
                {page}
              </span>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={clsx(
            'rounded-lg px-3 py-1 text-sm font-medium transition',
            currentPage === totalPages
              ? 'cursor-not-allowed text-slate-300'
              : 'text-slate-700 hover:bg-slate-100'
          )}
        >
          Next
        </button>
      </div>
    </div>
  );
}
