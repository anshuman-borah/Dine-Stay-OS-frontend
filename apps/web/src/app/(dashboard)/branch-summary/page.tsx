'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  IndianRupee, ShoppingCart, BedDouble, Key, LogOut, AlertTriangle,
  Clock, Users, SprayCan, Activity, Banknote, CreditCard, Smartphone,
  Wallet, RefreshCw, TrendingUp, Package, CheckCircle2, ChefHat,
  Download, BarChart3, Calendar, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  cash: Banknote, card: CreditCard, upi: Smartphone, wallet: Wallet,
};

// ── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color = 'text-slate-400', warn = false, delayClass
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string; warn?: boolean; delayClass?: string;
}) {
  return (
    <div className={cn(
      'bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative z-10',
      'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-none group cursor-default',
      'animate-in fade-in zoom-in-95 duration-500 fill-mode-both',
      warn ? 'border-red-300 dark:border-red-800/60 hover:shadow-red-500/20' : 'border-slate-200 dark:border-slate-800 hover:shadow-slate-200/50',
      delayClass
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={cn("p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110", warn ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-50 dark:bg-slate-800")}>
          <Icon size={14} className={warn ? 'text-red-500' : color.replace('text-', 'text-')} style={!warn ? { color: color.includes('text-') ? undefined : color } : {}} />
        </div>
      </div>
      <div>
        <div className={cn('text-2xl font-black tracking-tight', warn ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white')}>
          {value}
        </div>
        {sub && <div className="text-[11px] font-medium text-slate-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, delayClass }: { title: string; icon: React.ElementType; children: React.ReactNode; delayClass?: string }) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative z-10",
      "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both",
      delayClass
    )}>
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="p-1.5 bg-amber-500/10 rounded-lg">
          <Icon size={16} className="text-amber-500" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BranchSummaryPage() {
  const { user, branchId } = useAuthStore();
  const [from, setFrom] = useState(monthStart());
  const [to,   setTo]   = useState(today());

  const { data: s, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['branch-summary', branchId, from, to],
    queryFn: () =>
      apiFetch(`/api/v1/reports/branch-summary?branchId=${branchId}&from=${from}&to=${to}`).then((r) => r.data?.data || r.data),
    refetchInterval: 60_000,
    enabled: !!branchId,
  });

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!s) return;

    const rows: string[][] = [
      ['Branch Summary Report'],
      [`Period: ${from} to ${to}`],
      [''],
      ['REVENUE'],
      ['Metric', 'Value'],
      ['Total Revenue',       fmt(s.revenue?.total      || 0)],
      ['Restaurant Revenue',  fmt(s.revenue?.restaurant || 0)],
      ['Hotel Revenue',       fmt(s.revenue?.hotel      || 0)],
      ['Monthly Revenue',     fmt(s.revenue?.month      || 0)],
      ['Total Bills',         String(s.revenue?.totalBills || 0)],
      [''],
      ['RESTAURANT'],
      ['Metric', 'Value'],
      ['Orders (Period)',     String(s.restaurant?.ordersToday   || 0)],
      ['Billed Orders',       String(s.restaurant?.billedOrders  || 0)],
      ['Pending Orders',      String(s.restaurant?.pendingOrders || 0)],
      ['Bills',               String(s.restaurant?.billsToday    || 0)],
      ['Avg Order Value',     fmt(s.restaurant?.avgOrderValue    || 0)],
      ['Open Shifts',         String(s.restaurant?.openShifts    || 0)],
      ['Low Stock Items',     String(s.restaurant?.lowStockItems || 0)],
      [''],
      ['HOTEL (Live)'],
      ['Metric', 'Value'],
      ['Reservations Today',  String(s.hotel?.reservationsToday  || 0)],
      ['Check-ins Today',     String(s.hotel?.checkinsToday      || 0)],
      ['Check-outs Today',    String(s.hotel?.checkoutsToday     || 0)],
      ['In-House',            String(s.hotel?.inHouse            || 0)],
      ['Available Rooms',     String(s.hotel?.availableRooms     || 0)],
      ['Total Rooms',         String(s.hotel?.totalRooms         || 0)],
      ['Occupancy %',         `${s.hotel?.occupancyPct || 0}%`],
      ['HK Pending',          String(s.hotel?.housekeepingPending || 0)],
      [''],
      ['STAFF (Live)'],
      ['Role', 'Count'],
      ['Total',        String(s.staff?.total        || 0)],
      ['Cashiers',     String(s.staff?.cashiers     || 0)],
      ['Waiters',      String(s.staff?.waiters      || 0)],
      ['Kitchen',      String(s.staff?.kitchen      || 0)],
      ['Receptionist', String(s.staff?.receptionist || 0)],
      ['Housekeeping', String(s.staff?.housekeeping || 0)],
      [''],
      ['PAYMENTS (Period)'],
      ['Method', 'Amount', 'Transactions'],
      ...(s.paymentBreakdown || []).map((p: any) => [p.method, fmt(p.total), String(p.txns)]),
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `branch-summary-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-500 animate-pulse">
          <Activity className="animate-spin text-amber-500" size={32} />
          <p className="text-sm font-medium">Loading branch summary…</p>
        </div>
      </div>
    );
  }

  const totalRev     = Number(s?.revenue?.total      || 0);
  const restaurantRev = Number(s?.revenue?.restaurant || 0);
  const hotelRev     = Number(s?.revenue?.hotel       || 0);
  const posShare     = totalRev > 0 ? Math.round((restaurantRev / totalRev) * 100) : 0;
  const hotelShare   = totalRev > 0 ? 100 - posShare : 0;
  const hasAlerts    = (s?.alerts?.lowStock || 0) + (s?.alerts?.openShifts || 0) + (s?.alerts?.housekeepingPending || 0) > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-6 lg:px-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 relative z-20">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl relative z-20">
              <Building2 size={26} className="text-amber-500 relative z-20" />
            </div>
            <span className="relative z-20">Branch Summary</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 pl-14 relative z-20">
            {dayjs().format('dddd, MMMM D, YYYY')} ·{' '}
            <span className="text-amber-600 dark:text-amber-400 font-bold relative z-20">
              {user?.firstName} {user?.lastName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-right-4 duration-500 relative z-30">
          {/* Date range picker */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm relative z-30 pointer-events-auto">
            <div className="flex items-center pl-3 pr-1 text-slate-400"><Calendar size={14} /></div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="text-sm bg-transparent text-slate-700 dark:text-slate-300 outline-none px-2 py-1.5 font-medium cursor-pointer relative z-30 [color-scheme:light] dark:[color-scheme:dark]" />
            <span className="text-slate-300 dark:text-slate-700 font-bold px-1">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="text-sm bg-transparent text-slate-700 dark:text-slate-300 outline-none px-2 py-1.5 font-medium cursor-pointer relative z-30 [color-scheme:light] dark:[color-scheme:dark]" />
          </div>

          {/* Quick ranges */}
          <div className="flex gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl relative z-30 pointer-events-auto">
            {[
              { label: 'Today',  f: today(),      t: today() },
              { label: 'Month',  f: monthStart(), t: today() },
            ].map(({ label, f, t }) => (
              <button key={label}
                onClick={() => { setFrom(f); setTo(t); }}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm relative z-30',
                  from === f && to === t
                    ? 'bg-amber-500 text-slate-900 shadow-amber-500/20'
                    : 'bg-transparent text-slate-500 hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400 shadow-none',
                )}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-amber-500 hover:border-amber-500/30 transition-all shadow-sm relative z-30 pointer-events-auto"
            title="Refresh">
            <RefreshCw size={16} className={isFetching ? 'animate-spin text-amber-500' : ''} />
          </button>

          <button onClick={handleExport} disabled={!s}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-bold transition-all shadow-sm disabled:opacity-50 relative z-30 pointer-events-auto">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── Alerts Banner ───────────────────────────────────────────────────── */}
      {hasAlerts && (
        <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl px-5 py-4 flex flex-wrap gap-6 items-center shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-lg">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-500" />
            </div>
            <span className="font-bold text-red-900 dark:text-red-400 text-sm tracking-wide uppercase">Action Required</span>
          </div>
          
          {(s?.alerts?.lowStock || 0) > 0 && (
            <span className="text-sm text-red-700 dark:text-red-300 font-semibold flex items-center gap-1.5 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg">
              <Package size={14}/> Low Inventory: {s.alerts.lowStock} items
            </span>
          )}
          {(s?.alerts?.openShifts || 0) > 0 && (
            <span className="text-sm text-red-700 dark:text-red-300 font-semibold flex items-center gap-1.5 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg">
              <Clock size={14}/> Open Shifts: {s.alerts.openShifts}
            </span>
          )}
          {(s?.alerts?.housekeepingPending || 0) > 0 && (
            <span className="text-sm text-red-700 dark:text-red-300 font-semibold flex items-center gap-1.5 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg">
              <SprayCan size={14}/> HK Pending: {s.alerts.housekeepingPending} tasks
            </span>
          )}
        </div>
      )}

      {/* ── Revenue Hero ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both z-10">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500 opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-500 opacity-10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8 pointer-events-none">
          <div className="pointer-events-auto">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-500" />
              <div className="text-xs font-bold text-amber-500/90 uppercase tracking-widest">
                Total Revenue
              </div>
            </div>
            <div className="text-5xl font-black text-white tracking-tight">
              {fmt(totalRev)}
            </div>
            <div className="text-sm text-slate-400 font-medium mt-3">
              {s?.revenue?.totalBills || 0} bills generated · MTD Revenue: <span className="text-white">{fmtShort(s?.revenue?.month || 0)}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 pointer-events-auto">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 relative z-10">
        {/* ── Left 2/3: Main KPIs + Chart ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Restaurant */}
          <SectionCard title="Restaurant Overview" icon={ShoppingCart} delayClass="delay-150">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <KpiCard icon={ShoppingCart} label="Orders"       value={s?.restaurant?.ordersToday   || 0}  sub={`${s?.restaurant?.pendingOrders || 0} pending`} color="#60a5fa" delayClass="delay-75" />
              <KpiCard icon={IndianRupee}  label="Bills"        value={s?.restaurant?.billsToday    || 0}  color="#60a5fa" delayClass="delay-100" />
              <KpiCard icon={TrendingUp}   label="Avg Order"    value={fmtShort(s?.restaurant?.avgOrderValue || 0)} color="#f59e0b" delayClass="delay-150" />
              <KpiCard icon={CheckCircle2} label="Billed"       value={s?.restaurant?.billedOrders  || 0}  sub="Completed" color="#34d399" delayClass="delay-200" />
              <KpiCard icon={Clock}        label="Open Shifts"  value={s?.restaurant?.openShifts    || 0}  warn={s?.restaurant?.openShifts > 0} delayClass="delay-250" />
              <KpiCard icon={Package}      label="Low Stock"    value={s?.restaurant?.lowStockItems || 0}  warn={s?.restaurant?.lowStockItems > 0} sub="Items" delayClass="delay-300" />
            </div>
          </SectionCard>

          {/* Hotel (always live) */}
          <SectionCard title="Hotel Operations (Live)" icon={BedDouble} delayClass="delay-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <KpiCard icon={BedDouble}   label="Reservations"  value={s?.hotel?.reservationsToday   || 0}  sub="Today" color="#c084fc" delayClass="delay-75" />
              <KpiCard icon={Key}         label="Check-ins"     value={s?.hotel?.checkinsToday       || 0}  sub="Today" color="#34d399" delayClass="delay-100" />
              <KpiCard icon={LogOut}      label="Check-outs"    value={s?.hotel?.checkoutsToday       || 0}  sub="Today" color="#60a5fa" delayClass="delay-150" />
              <KpiCard icon={Activity}    label="Occupancy"     value={`${s?.hotel?.occupancyPct || 0}%`}   sub={`${s?.hotel?.inHouse || 0} in-house`} color="#f59e0b" delayClass="delay-200" />
              <KpiCard icon={BedDouble}   label="Available"     value={s?.hotel?.availableRooms       || 0}  sub={`of ${s?.hotel?.totalRooms || 0}`} color="#94a3b8" delayClass="delay-250" />
              <KpiCard icon={SprayCan}    label="HK Pending"    value={s?.hotel?.housekeepingPending  || 0}  warn={s?.hotel?.housekeepingPending > 0} sub="Today" delayClass="delay-300" />
            </div>
          </SectionCard>

          {/* Revenue Chart */}
          <SectionCard title="Daily Revenue Split" icon={BarChart3} delayClass="delay-500">
            {(!s?.weeklyChart?.length) ? (
              <div className="h-[220px] flex items-center justify-center text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl relative z-10">
                No chart data for selected period
              </div>
            ) : (
              <div className="h-[280px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.weeklyChart} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-10" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={fmtShort} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '13px', fontWeight: 500, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(v: number, name: string) => [fmt(v), name === 'pos' ? 'Restaurant' : 'Hotel']}
                    />
                    <Legend 
                      formatter={(v) => <span className="text-slate-600 dark:text-slate-300 font-medium ml-1">{v === 'pos' ? 'Restaurant' : 'Hotel'}</span>} 
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                    <Bar dataKey="pos"   stackId="r" fill="#3b82f6" maxBarSize={50} />
                    <Bar dataKey="hotel" stackId="r" fill="#10b981" maxBarSize={50} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Right 1/3: Staff + Payments ─────────────────────────── */}
        <div className="space-y-6 relative z-10">

          {/* Payments */}
          <SectionCard title="Collections" icon={Wallet} delayClass="delay-300">
            {(!s?.paymentBreakdown?.length) ? (
              <p className="text-sm font-medium text-slate-400 py-6 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl">No payments for selected period</p>
            ) : (
              <div className="space-y-4">
                {s.paymentBreakdown.map((p: any) => {
                  const Icon = PAYMENT_ICONS[p.method] || Wallet;
                  const pct  = totalRev > 0 ? Math.round((p.total / totalRev) * 100) : 0;
                  return (
                    <div key={p.method} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 group-hover:text-amber-600 transition-colors">
                            <Icon size={14} />
                          </div>
                          <span className="capitalize font-semibold group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{p.method}</span>
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">({p.txns})</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{fmt(p.total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Total Collected</span>
                  <span className="font-black text-slate-900 dark:text-white text-base">
                    {fmt(s.paymentBreakdown.reduce((a: number, p: any) => a + Number(p.total), 0))}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Staff (always live) */}
          <SectionCard title="Active Staff (Live)" icon={Users} delayClass="delay-500">
            <div className="space-y-1">
              {[
                { label: 'Total Active',  value: s?.staff?.total        || 0, icon: Users,        bold: true  },
                { label: 'Cashiers',      value: s?.staff?.cashiers     || 0, icon: IndianRupee,  bold: false },
                { label: 'Waiters',       value: s?.staff?.waiters      || 0, icon: ChefHat,      bold: false },
                { label: 'Kitchen',       value: s?.staff?.kitchen      || 0, icon: ChefHat,      bold: false },
                { label: 'Receptionist',  value: s?.staff?.receptionist || 0, icon: Key,          bold: false },
                { label: 'Housekeeping',  value: s?.staff?.housekeeping || 0, icon: SprayCan,     bold: false },
              ].map(({ label, value, icon: Icon, bold }) => (
                <div key={label} className={cn(
                  'flex items-center justify-between py-2 px-3 rounded-lg transition-colors',
                  bold ? 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-2' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}>
                  <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <Icon size={14} className={bold ? "text-amber-500" : "text-slate-400"} />
                    <span className={bold ? 'font-bold text-slate-900 dark:text-white' : 'font-medium'}>{label}</span>
                  </div>
                  <span className={cn('font-bold', bold ? 'text-slate-900 dark:text-white text-lg' : 'text-slate-700 dark:text-slate-300')}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Period info Footer */}
          <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-xs text-slate-500 space-y-2 animate-in fade-in duration-500 delay-700 fill-mode-both relative z-10">
            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3 uppercase tracking-wider">Report Context</div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-medium">Selected Period</span>
              <span className="text-slate-800 dark:text-white font-bold">{dayjs(from).format('MMM D')} – {dayjs(to).format('MMM D, YYYY')}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium italic">
              Note: Hotel status (rooms, in-house) and Staff counts are always shown as current live state, regardless of the date range selected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}