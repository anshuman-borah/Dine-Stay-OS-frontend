'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  IndianRupee, TrendingUp, ShoppingCart, BedDouble, Key, LogOut,
  AlertTriangle, Clock, Activity, CreditCard, Banknote, Smartphone,
  Wallet, ArrowRight, Building2, RefreshCw, Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/auth.store';

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  cash: Banknote, card: CreditCard, upi: Smartphone, wallet: Wallet,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000)    return `₹${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
};

function today()      { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="min-h-screen p-4 lg:p-8 space-y-6 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col gap-3 animate-pulse mb-8">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>
      <div className="h-48 w-full bg-slate-200/60 dark:bg-slate-800/60 rounded-3xl animate-pulse"></div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-28 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl animate-pulse"></div>)}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, color = 'text-slate-400', warn = false, delayClass
}: {
  icon: React.ElementType; label: string; value: string | number; color?: string; warn?: boolean; delayClass?: string;
}) {
  const isWarning = warn && Number(value) > 0;

  return (
    <div className={cn(
      'bg-white dark:bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between shadow-sm',
      'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-none group cursor-default',
      'animate-in fade-in zoom-in-95 duration-500 fill-mode-both',
      isWarning ? 'border-red-300 dark:border-red-800/60 hover:shadow-red-500/20' : 'border-slate-200 dark:border-slate-800 hover:shadow-slate-200/50',
      delayClass
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={cn("p-2 rounded-lg transition-transform duration-300 group-hover:scale-110", isWarning ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-50 dark:bg-slate-800")}>
          <Icon size={16} className={isWarning ? 'text-red-500' : color.replace('text-', 'text-')} style={!isWarning ? { color: color.includes('text-') ? undefined : color } : {}} />
        </div>
      </div>
      <div className={cn('text-2xl font-black tracking-tight', isWarning ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white')}>
        {value}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerDashboardPage() {
  const { user, branchId } = useAuthStore();
  
  // 🟢 FIX: Default to Month Start
  const [from, setFrom] = useState(monthStart());
  const [to,   setTo]   = useState(today());

  const { data: s, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['branch-summary', branchId, from, to],
    queryFn: () => {
      const url = branchId 
        ? `/api/v1/reports/branch-summary?branchId=${branchId}&from=${from}&to=${to}`
        : `/api/v1/reports/branch-summary?from=${from}&to=${to}`;
      return apiFetch(url).then((r) => r.data?.data || r.data);
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  const totalRev      = Number(s?.revenue?.total || 0);
  const restaurantRev = Number(s?.revenue?.restaurant || 0);
  const hotelRev      = Number(s?.revenue?.hotel || 0);
  const posShare      = totalRev > 0 ? Math.round((restaurantRev / totalRev) * 100) : 0;
  const hotelShare    = totalRev > 0 ? 100 - posShare : 0;
  
  const hasAlerts     = (s?.alerts?.lowStock || 0) + (s?.alerts?.openShifts || 0) + (s?.alerts?.housekeepingPending || 0) > 0;
  const isGlobal      = user?.role === 'owner' && !branchId;

  return (
    <div className="min-h-screen overflow-y-auto p-4 lg:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Building2 size={28} className="text-amber-500" />
            </div>
            {isGlobal ? 'Executive Dashboard' : 'Branch Summary'}
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 pl-14">
            {dayjs().format('dddd, D MMMM YYYY')} · {isGlobal ? 'Global overview' : 'Location overview'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <div className="flex items-center pl-3 pr-1 text-slate-400"><Calendar size={14} /></div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="text-sm bg-transparent text-slate-700 dark:text-slate-300 outline-none px-2 py-1.5 font-medium cursor-pointer" />
            <span className="text-slate-300 dark:text-slate-700 font-bold px-1">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="text-sm bg-transparent text-slate-700 dark:text-slate-300 outline-none px-2 py-1.5 font-medium cursor-pointer" />
          </div>

          <div className="flex gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
            {[
              { label: 'Today',  f: today(),      t: today() },
              { label: 'Month',  f: monthStart(), t: today() },
            ].map(({ label, f, t }) => (
              <button key={label} onClick={() => { setFrom(f); setTo(t); }}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm',
                  from === f && to === t ? 'bg-amber-500 text-slate-900 shadow-amber-500/20' : 'bg-transparent text-slate-500 hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400 shadow-none'
                )}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => refetch()} disabled={isFetching} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-amber-600 hover:border-amber-500/30 transition-all shadow-sm">
            <RefreshCw size={16} className={isFetching ? 'animate-spin text-amber-500' : ''} />
          </button>
        </div>
      </div>

      {/* ── Total Revenue Hero Card ─────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500 opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-500 opacity-10 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-500" />
              <div className="text-xs font-bold text-amber-500/90 uppercase tracking-widest">
                Period Revenue
              </div>
            </div>
            <div className="text-5xl lg:text-6xl font-black text-white tracking-tight">
              {fmt(totalRev)}
            </div>
            <div className="text-sm text-slate-400 font-medium mt-3">
              {s?.revenue?.totalBills || 0} bills generated · Monthly: <span className="text-white">{fmtShort(Number(s?.revenue?.month || 0))}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 min-w-[160px] transition-transform hover:scale-105">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                <ShoppingCart size={14} className="text-blue-400" /> Restaurant
              </div>
              <div className="text-2xl font-bold text-white mb-1">{fmt(restaurantRev)}</div>
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> {posShare}% of total
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 min-w-[160px] transition-transform hover:scale-105">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                <BedDouble size={14} className="text-emerald-400" /> Hotel
              </div>
              <div className="text-2xl font-bold text-white mb-1">{fmt(hotelRev)}</div>
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> {hotelShare}% of total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerts Banner ───────────────────────────────────────────────────── */}
      {hasAlerts && (
        <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl px-5 py-4 flex flex-wrap gap-6 items-center shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-lg">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-500" />
            </div>
            <span className="font-bold text-red-900 dark:text-red-400 text-sm tracking-wide uppercase">Action Required</span>
          </div>
          {(s?.alerts?.lowStock || 0) > 0 && (
            <span className="text-sm text-red-700 dark:text-red-300 font-semibold bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg">
              Low Inventory: {s.alerts.lowStock} items
            </span>
          )}
          {(s?.alerts?.openShifts || 0) > 0 && (
            <span className="text-sm text-red-700 dark:text-red-300 font-semibold bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg">
              Open Shifts: {s.alerts.openShifts}
            </span>
          )}
          {(s?.alerts?.housekeepingPending || 0) > 0 && (
            <span className="text-sm text-red-700 dark:text-red-300 font-semibold bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg">
              HK Pending: {s.alerts.housekeepingPending} tasks
            </span>
          )}
        </div>
      )}

      {/* ── Quick Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
        <KpiCard label="Active Orders" value={s?.restaurant?.pendingOrders || 0} icon={Clock} color="#60a5fa" delayClass="delay-75" />
        <KpiCard label="Check-ins Today" value={s?.hotel?.checkinsToday || 0} icon={Key} color="#34d399" delayClass="delay-100" />
        <KpiCard label="Occupancy" value={`${s?.hotel?.occupancyPct || 0}%`} icon={BedDouble} color="#c084fc" delayClass="delay-150" />
        <KpiCard label="Avg Order Val" value={fmtShort(Number(s?.restaurant?.avgOrderValue || 0))} icon={IndianRupee} color="#f59e0b" delayClass="delay-200" />
        <KpiCard label="Low Stock" value={s?.alerts?.lowStock || 0} icon={AlertTriangle} color="#f87171" warn={true} delayClass="delay-250" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

        {/* ── Revenue Chart (Stacked POS + Hotel) ──────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:col-span-2 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Daily Revenue Breakdown</h2>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          
          {(!s?.weeklyChart || s.weeklyChart.length === 0) ? (
            <div className="h-[220px] flex items-center justify-center text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
              No chart data for selected period
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.weeklyChart} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-10" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={fmtShort} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '13px', fontWeight: 500, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: any, name: string) => [fmt(Number(v)), name === 'pos' ? 'Restaurant' : 'Hotel']}
                  />
                  <Legend
                    formatter={(value) => <span className="text-slate-600 dark:text-slate-300 font-medium ml-1">{value === 'pos' ? 'Restaurant' : 'Hotel'}</span>}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  <Bar dataKey="pos" stackId="rev" fill="#3b82f6" maxBarSize={60} />
                  <Bar dataKey="hotel" stackId="rev" fill="#10b981" maxBarSize={60} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Payment Collection Breakdown ──────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Collections Overview</h2>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
              <IndianRupee size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          {(!s?.paymentBreakdown || s.paymentBreakdown.length === 0) ? (
            <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
              No payments recorded
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {s.paymentBreakdown.map((p: any) => {
                const Icon = PAYMENT_ICONS[p.method] || Wallet;
                const pct = totalRev > 0 ? Math.round((Number(p.total) / totalRev) * 100) : 0;
                return (
                  <div key={p.method} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 group-hover:text-amber-600 transition-colors">
                          <Icon size={14} />
                        </div>
                        <span className="capitalize font-semibold group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{p.method}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{fmt(Number(p.total))}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 flex overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Collected</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {fmt(s?.paymentBreakdown?.reduce((a: number, p: any) => a + Number(p.total), 0) || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Branch Comparison (Global Mode Only) ──────────────── */}
      {isGlobal && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700 fill-mode-both">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Branch Performance (Period)</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Comparing total revenue across all active locations</p>
            </div>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
              <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          
          {(!s?.branchComparison || s.branchComparison.length === 0) ? (
            <div className="h-[200px] flex items-center justify-center text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
              No branch data available
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.branchComparison} margin={{ top: 0, right: 20, bottom: 0, left: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} className="dark:opacity-10" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={fmtShort} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '13px', fontWeight: 500, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: any) => [fmt(Number(v)), 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={32}>
                    {s.branchComparison.map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? '#f59e0b' : '#3b82f6'} className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Links ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {[
          { href: '/dashboard', label: 'Restaurant Dashboard', desc: 'Shifts, orders, hourly sales', color: 'hover:border-blue-500/50 hover:shadow-blue-500/10' },
          { href: '/hotel/dashboard', label: 'Hotel Dashboard', desc: 'ADR, occupancy, revenue', color: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10' },
          { href: '/billing', label: 'POS Bills', desc: 'Restaurant billing history', color: 'hover:border-amber-500/50 hover:shadow-amber-500/10' },
          { href: '/hotel/billing', label: 'Hotel Bills', desc: 'Hotel billing history', color: 'hover:border-purple-500/50 hover:shadow-purple-500/10' },
        ].map(({ href, label, desc, color }, i) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between group transition-all duration-300',
              'hover:-translate-y-1 hover:shadow-lg',
              color,
              `animate-in fade-in slide-in-from-bottom-4 delay-[${800 + (i * 100)}ms] fill-mode-both`
            )}
          >
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{label}</div>
              <div className="text-[11px] font-medium text-slate-500 mt-1">{desc}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors">
              <ArrowRight size={14} className="text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}