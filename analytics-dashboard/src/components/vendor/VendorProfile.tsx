export function VendorProfile() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-white text-lg font-bold">
            BH
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Blum HVAC and Appliance</h1>
            <p className="text-xs text-slate-500">ID: 15 &middot; BLUM_Appliance</p>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                1 technician
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                2125557788
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                blumhvac@outlook.com
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last active: Apr 27
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            &#9733; 3.6 KAIros score
          </span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200">
            &#8987; Pending
          </span>
          <button className="px-3 py-1 text-xs font-semibold rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
            + Export
          </button>
        </div>
      </div>
    </div>
  );
}
