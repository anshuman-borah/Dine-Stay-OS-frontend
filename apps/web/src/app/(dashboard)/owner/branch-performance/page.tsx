// 'use client';

// import { useState } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import {
//   Building2, TrendingUp, TrendingDown, ShoppingCart, BarChart3,
//   Trophy, Minus, RefreshCw, Download, Calendar,
// } from 'lucide-react';
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
//   ResponsiveContainer, Cell,
// } from 'recharts';
// import { apiFetch } from '@/lib/api';

// // ── helpers ─────────────────────────────────────────────────────────────────

// const fmt = (n: number) =>
//   new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// const fmtShort = (n: number) => {
//   if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
//   if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
//   return fmt(n);
// };

// function today() { return new Date().toISOString().slice(0, 10); }
// function monthStart() {
//   const d = new Date();
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
// }

// const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

// // ── sub-components ───────────────────────────────────────────────────────────

// function KpiCard({ icon: Icon, label, value, sub, color }: {
//   icon: React.ElementType; label: string; value: string; sub?: string; color: string;
// }) {
//   return (
//     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-start gap-4">
//       <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
//         <Icon size={20} className="text-white" />
//       </div>
//       <div>
//         <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
//         <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
//         {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
//       </div>
//     </div>
//   );
// }

// function GrowthBadge({ pct }: { pct: number | null }) {
//   if (pct === null) return <span className="text-slate-400 text-xs">—</span>;
//   if (pct === 0) return (
//     <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus size={12} />0%</span>
//   );
//   const up = pct > 0;
//   return (
//     <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full
//       ${up ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
//         : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
//       {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
//       {up ? '+' : ''}{pct}%
//     </span>
//   );
// }

// // ── page ─────────────────────────────────────────────────────────────────────

// export default function BranchPerformancePage() {
//   const [from, setFrom] = useState(monthStart());
//   const [to, setTo] = useState(today());

//   const { data, isLoading, refetch, isFetching } = useQuery({
//     queryKey: ['branch-performance', from, to],
//     queryFn: () =>
//       apiFetch(`/api/v1/reports/branch-performance?from=${from}&to=${to}`).then((r) => r.data),
//   });

//   const branches: any[] = data?.branches || [];
//   const top: any = data?.topBranch || null;

//   // CSV export
//   const handleExport = () => {
//     if (!branches.length) return;
//     const headers = ['Rank', 'Branch', 'Code', 'City', 'Revenue', 'POS Revenue', 'Hotel Revenue', 'Orders', 'Bills', 'Growth %'];
//     const rows = branches.map((b: any, i: number) => [
//       i + 1, b.branchName, b.branchCode, b.city || '',
//       b.revenue, b.posRevenue, b.hotelRevenue, b.orders, b.bills,
//       b.growthPct !== null ? `${b.growthPct}%` : 'N/A',
//     ]);
//     const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
//     const blob = new Blob([csv], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url; a.download = `branch-performance-${from}-${to}.csv`; a.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
//             <Building2 size={24} className="text-amber-500" />
//             Branch Performance
//           </h1>
//           <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
//             Cross-branch revenue &amp; orders overview
//           </p>
//         </div>

//         <div className="flex items-center gap-2 flex-wrap">
//           <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
//             <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
//               className="text-sm bg-transparent text-slate-900 dark:text-white outline-none" />
//             <span className="text-slate-400 text-sm">→</span>
//             <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
//               className="text-sm bg-transparent text-slate-900 dark:text-white outline-none" />
//           </div>
//           <button onClick={() => refetch()}
//             className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-amber-500 transition-colors"
//             title="Refresh">
//             <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
//           </button>
//           <button onClick={handleExport}
//             className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-semibold transition-colors">
//             <Download size={14} /> Export CSV
//           </button>
//         </div>
//       </div>

//       {isLoading ? (
//         <div className="flex items-center justify-center h-64">
//           <div className="text-slate-400 text-sm animate-pulse">Loading branch data…</div>
//         </div>
//       ) : (
//         <>
//           {/* KPI Cards */}
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//             <KpiCard icon={Building2} label="Total Branches" value={String(data?.totalBranches ?? 0)}
//               sub="Active branches" color="bg-amber-500" />
//             <KpiCard icon={BarChart3} label="Total Revenue" value={fmtShort(data?.totalRevenue ?? 0)}
//               sub={`${from} → ${to}`} color="bg-blue-500" />
//             <KpiCard icon={ShoppingCart} label="Total Orders" value={(data?.totalOrders ?? 0).toLocaleString('en-IN')}
//               sub={`${data?.totalBills ?? 0} bills`} color="bg-emerald-500" />
//             <KpiCard icon={TrendingUp} label="Avg Revenue / Branch" value={fmtShort(data?.avgRevenue ?? 0)}
//               sub="Per active branch" color="bg-violet-500" />
//           </div>

//           <div className="grid lg:grid-cols-3 gap-6">
//             {/* Left: Chart + Table */}
//             <div className="lg:col-span-2 space-y-6">
//               {/* Bar Chart */}
//               {branches.length > 0 && (
//                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
//                   <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Revenue by Branch</h2>
//                   <ResponsiveContainer width="100%" height={200}>
//                     <BarChart data={branches} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
//                       <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
//                       <XAxis dataKey="branchName" tick={{ fontSize: 11 }} />
//                       <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 11 }} width={60} />
//                       <Tooltip
//                         formatter={(v: number) => [fmt(v), 'Revenue']}
//                         contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
//                       />
//                       <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
//                         {branches.map((_: any, i: number) => (
//                           <Cell key={i} fill={COLORS[i % COLORS.length]} />
//                         ))}
//                       </Bar>
//                     </BarChart>
//                   </ResponsiveContainer>
//                 </div>
//               )}

//               {/* Ranking Table */}
//               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
//                 <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
//                   <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Branch Ranking</h2>
//                 </div>
//                 <div className="overflow-x-auto">
//                   <table className="w-full text-sm">
//                     <thead>
//                       <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wide">
//                         <th className="px-4 py-3 text-left font-semibold">#</th>
//                         <th className="px-4 py-3 text-left font-semibold">Branch</th>
//                         <th className="px-4 py-3 text-right font-semibold">Revenue</th>
//                         <th className="px-4 py-3 text-right font-semibold">Orders</th>
//                         <th className="px-4 py-3 text-right font-semibold">Bills</th>
//                         <th className="px-4 py-3 text-right font-semibold">Growth</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
//                       {branches.map((b: any, i: number) => (
//                         <tr key={b.branchId}
//                           className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
//                           <td className="px-4 py-3">
//                             {i === 0 ? (
//                               <span className="text-amber-500 text-base">🏆</span>
//                             ) : (
//                               <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs
//                                 flex items-center justify-center font-semibold">
//                                 {i + 1}
//                               </span>
//                             )}
//                           </td>
//                           <td className="px-4 py-3">
//                             <div className="font-medium text-slate-900 dark:text-white">{b.branchName}</div>
//                             <div className="text-xs text-slate-400">{b.city || b.branchCode}</div>
//                           </td>
//                           <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
//                             {fmt(b.revenue)}
//                             <div className="text-[10px] text-slate-400 font-normal">
//                               POS {fmtShort(b.posRevenue)} · Hotel {fmtShort(b.hotelRevenue)}
//                             </div>
//                           </td>
//                           <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
//                             {b.orders.toLocaleString('en-IN')}
//                           </td>
//                           <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
//                             {b.bills.toLocaleString('en-IN')}
//                           </td>
//                           <td className="px-4 py-3 text-right">
//                             <GrowthBadge pct={b.growthPct} />
//                           </td>
//                         </tr>
//                       ))}
//                       {branches.length === 0 && (
//                         <tr>
//                           <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
//                             No data for selected period
//                           </td>
//                         </tr>
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             </div>

//             {/* Right: Top Branch Spotlight */}
//             <div className="space-y-4">
//               {top && (
//                 <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white shadow-lg">
//                   <div className="flex items-center gap-2 mb-3">
//                     <Trophy size={18} />
//                     <span className="text-sm font-semibold opacity-90">Best Performing Branch</span>
//                   </div>
//                   <p className="text-2xl font-bold">{top.branchName}</p>
//                   {top.city && <p className="text-sm opacity-80 mt-0.5">{top.city}</p>}
//                   <div className="mt-4 space-y-2 text-sm">
//                     <div className="flex justify-between">
//                       <span className="opacity-75">Revenue</span>
//                       <span className="font-semibold">{fmt(top.revenue)}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="opacity-75">Orders</span>
//                       <span className="font-semibold">{top.orders.toLocaleString('en-IN')}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="opacity-75">POS</span>
//                       <span className="font-semibold">{fmt(top.posRevenue)}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="opacity-75">Hotel</span>
//                       <span className="font-semibold">{fmt(top.hotelRevenue)}</span>
//                     </div>
//                     {top.growthPct !== null && (
//                       <div className="flex justify-between pt-2 border-t border-white/20">
//                         <span className="opacity-75">vs Prior Period</span>
//                         <span className={`font-bold ${top.growthPct >= 0 ? 'text-white' : 'text-red-200'}`}>
//                           {top.growthPct >= 0 ? '+' : ''}{top.growthPct}%
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* Revenue Share donut-style list */}
//               {branches.length > 0 && data?.totalRevenue > 0 && (
//                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
//                   <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Revenue Share</h2>
//                   <div className="space-y-3">
//                     {branches.map((b: any, i: number) => {
//                       const pct = data.totalRevenue > 0
//                         ? Math.round((b.revenue / data.totalRevenue) * 100) : 0;
//                       return (
//                         <div key={b.branchId}>
//                           <div className="flex justify-between text-xs mb-1">
//                             <span className="text-slate-700 dark:text-slate-300 font-medium">{b.branchName}</span>
//                             <span className="text-slate-500">{pct}%</span>
//                           </div>
//                           <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
//                             <div
//                               className="h-full rounded-full transition-all duration-700"
//                               style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
//                             />
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               )}

//               {/* Period info */}
//               {data?.period && (
//                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-500 space-y-1">
//                   <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Period Info</div>
//                   <div>Current: <span className="text-slate-700 dark:text-white">{data.period.from} → {data.period.to}</span></div>
//                   <div>Compared to: <span className="text-slate-700 dark:text-white">{data.period.prevFrom} → {data.period.prevTo}</span></div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, TrendingUp, TrendingDown, ShoppingCart, BarChart3,
  Trophy, Minus, RefreshCw, Download, Calendar, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';


// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
};

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// Vibrant colors for the charts
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

// ── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color, delayClass }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; delayClass?: string;
}) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start gap-4",
      "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none group cursor-default",
      "animate-in fade-in slide-in-from-bottom-4 fill-mode-both",
      delayClass
    )}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", color)}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-400 text-xs font-medium">—</span>;
  if (pct === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"><Minus size={12} />0%</span>
  );
  const up = pct > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full tracking-wide",
      up ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
         : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
    )}>
      {up ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
      {Math.abs(pct)}%
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BranchPerformancePage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['branch-performance', from, to],
    queryFn: () =>
      apiFetch(`/api/v1/reports/branch-performance?from=${from}&to=${to}`).then((r) => r.data),
  });

  const branches: any[] = data?.branches || [];
  const top: any = data?.topBranch || null;

  // CSV export
  const handleExport = () => {
    if (!branches.length) return;
    const headers = ['Rank', 'Branch', 'Code', 'City', 'Revenue', 'POS Revenue', 'Hotel Revenue', 'Orders', 'Bills', 'Growth %'];
    const rows = branches.map((b: any, i: number) => [
      i + 1, b.branchName, b.branchCode, b.city || '',
      b.revenue, b.posRevenue, b.hotelRevenue, b.orders, b.bills,
      b.growthPct !== null ? `${b.growthPct}%` : 'N/A',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `branch-performance-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Building2 size={28} className="text-amber-500" />
            </div>
            Executive Dashboard
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 pl-14">
            Cross-branch performance & revenue analytics
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-right-4 duration-500">
          {/* Beautiful Date Range Picker */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <div className="flex items-center pl-3 pr-1 text-slate-400"><Calendar size={14} /></div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="text-sm bg-transparent text-slate-700 dark:text-slate-300 outline-none px-2 py-1.5 font-medium cursor-pointer" />
            <span className="text-slate-300 dark:text-slate-700 font-bold px-1">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="text-sm bg-transparent text-slate-700 dark:text-slate-300 outline-none px-2 py-1.5 font-medium cursor-pointer" />
          </div>

          <button onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-amber-500 hover:border-amber-500/30 transition-all shadow-sm"
            title="Refresh">
            <RefreshCw size={18} className={isFetching ? 'animate-spin text-amber-500' : ''} />
          </button>
          
          <button onClick={handleExport} disabled={!branches.length}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group">
            <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" /> 
            Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[400px] rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
            <div className="h-[400px] rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={Building2} label="Total Branches" value={String(data?.totalBranches ?? 0)}
              sub="Active operating branches" color="bg-amber-500 shadow-amber-500/30 shadow-lg" delayClass="duration-500 delay-75" />
            <KpiCard icon={BarChart3} label="Total Revenue" value={fmtShort(data?.totalRevenue ?? 0)}
              sub={`From ${dayjs(from).format('MMM D')} to ${dayjs(to).format('MMM D')}`} color="bg-blue-500 shadow-blue-500/30 shadow-lg" delayClass="duration-500 delay-100" />
            <KpiCard icon={ShoppingCart} label="Total Orders" value={(data?.totalOrders ?? 0).toLocaleString('en-IN')}
              sub={`Generated across ${data?.totalBills ?? 0} bills`} color="bg-emerald-500 shadow-emerald-500/30 shadow-lg" delayClass="duration-500 delay-150" />
            <KpiCard icon={TrendingUp} label="Avg Branch Revenue" value={fmtShort(data?.avgRevenue ?? 0)}
              sub="Per active location" color="bg-violet-500 shadow-violet-500/30 shadow-lg" delayClass="duration-500 delay-200" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* ── Left Column: Chart & Table ── */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Bar Chart */}
              {branches.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Revenue Comparison</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={branches} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-10" />
                      <XAxis dataKey="branchName" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        formatter={(v: number) => [fmt(v), 'Total Revenue']}
                        contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '13px', fontWeight: 500, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#fbbf24' }}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={60}>
                        {branches.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} className="hover:opacity-80 transition-opacity duration-300" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Ranking Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Detailed Branch Ranking</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4 text-left font-bold">Rank</th>
                        <th className="px-6 py-4 text-left font-bold">Branch Name</th>
                        <th className="px-6 py-4 text-right font-bold">Total Revenue</th>
                        <th className="px-6 py-4 text-right font-bold">Orders</th>
                        <th className="px-6 py-4 text-right font-bold">Bills</th>
                        <th className="px-6 py-4 text-right font-bold">Growth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {branches.map((b: any, i: number) => (
                        <tr key={b.branchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="px-6 py-4">
                            {i === 0 ? (
                              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shadow-inner">🏆</div>
                            ) : i === 1 ? (
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-sm font-bold shadow-inner">2</div>
                            ) : i === 2 ? (
                              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-bold shadow-inner">3</div>
                            ) : (
                              <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-400">{i + 1}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{b.branchName}</div>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">{b.city || b.branchCode}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-bold text-slate-900 dark:text-white text-base tracking-tight">{fmt(b.revenue)}</div>
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex flex-col items-end gap-0.5">
                              {b.posRevenue > 0 && <span>POS {fmtShort(b.posRevenue)}</span>}
                              {b.hotelRevenue > 0 && <span>Hotel {fmtShort(b.hotelRevenue)}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                            {b.orders.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                            {b.bills.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <GrowthBadge pct={b.growthPct} />
                          </td>
                        </tr>
                      ))}
                      {branches.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 text-sm font-medium">
                            No performance data available for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Right Column: Spotlight & Share ── */}
            <div className="space-y-6">
              
              {/* Premium Spotlight Card */}
              {top && (
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl shadow-orange-500/20 animate-in fade-in slide-in-from-right-4 duration-500 delay-300 fill-mode-both">
                  {/* Subtle Background Glow Elements */}
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-black opacity-10 blur-xl pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg">
                        <Trophy size={18} className="text-white" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-widest text-white/90 drop-shadow-sm">Top Performer</span>
                    </div>
                    
                    <p className="text-3xl font-black drop-shadow-md tracking-tight leading-none mb-1">{top.branchName}</p>
                    {top.city && <p className="text-sm font-medium text-white/80">{top.city}</p>}
                    
                    <div className="mt-6 space-y-3 text-sm bg-black/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white/80">Total Revenue</span>
                        <span className="font-black text-lg drop-shadow-sm">{fmt(top.revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white/80">Total Orders</span>
                        <span className="font-bold">{top.orders.toLocaleString('en-IN')}</span>
                      </div>
                      {top.growthPct !== null && (
                        <div className="flex justify-between items-center pt-3 border-t border-white/10 mt-1">
                          <span className="font-medium text-white/80">Growth (vs Prev)</span>
                          <span className={cn(
                            "font-bold px-2 py-0.5 rounded text-xs",
                            top.growthPct >= 0 ? "bg-emerald-500/40 text-white" : "bg-red-500/40 text-white"
                          )}>
                            {top.growthPct >= 0 ? '+' : ''}{top.growthPct}% <ArrowUpRight size={12} className="inline mb-0.5" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Share Donut/Progress */}
              {branches.length > 0 && data?.totalRevenue > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 delay-500 fill-mode-both">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-5">Revenue Distribution</h2>
                  <div className="space-y-5">
                    {branches.map((b: any, i: number) => {
                      const pct = data.totalRevenue > 0
                        ? Math.round((b.revenue / data.totalRevenue) * 100) : 0;
                      
                      return (
                        <div key={b.branchId} className="group">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-700 dark:text-slate-300 font-bold group-hover:text-amber-500 transition-colors">{b.branchName}</span>
                            <span className="text-slate-500 font-bold tabular-nums">{pct}%</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                              style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Period Context */}
              {data?.period && (
                <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-xs text-slate-500 space-y-2 animate-in fade-in duration-500 delay-700 fill-mode-both">
                  <div className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3 uppercase tracking-wider">Report Context</div>
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-medium">Selected Period</span>
                    <span className="text-slate-800 dark:text-white font-bold">{dayjs(data.period.from).format('MMM D, YYYY')} – {dayjs(data.period.to).format('MMM D, YYYY')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-medium">Compared Against</span>
                    <span className="text-slate-800 dark:text-white font-bold opacity-80">{dayjs(data.period.prevFrom).format('MMM D, YYYY')} – {dayjs(data.period.prevTo).format('MMM D, YYYY')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}