'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { 
  TrendingUp, IndianRupee, BedDouble, CalendarDays, 
  Key, LogOut, Activity, BarChart3, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid 
} from 'recharts';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

// ─── Sub-Components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, delayClass }: {
  label: string; value: string | number; icon: React.ElementType; color: string; delayClass?: string;
}) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm",
      "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none group cursor-default",
      "animate-in fade-in slide-in-from-bottom-4 fill-mode-both",
      delayClass
    )}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={cn("p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", color)}>
          <Icon size={20} />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function HotelDashboardPage() {
  const { data: summary, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['hotel-dashboard-summary'],
    queryFn: () => apiFetch('/api/v1/reports/hotel-dashboard').then((r) => r.data?.data || r.data),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-500 animate-pulse">
          <Activity className="animate-spin text-amber-500" size={32} /> 
          <p className="text-sm font-medium">Loading hotel analytics...</p>
        </div>
      </div>
    );
  }

  const todayStr = dayjs().format('dddd, MMMM D, YYYY');

  return (
    <div className="min-h-screen overflow-y-auto p-4 lg:p-8 bg-slate-50/50 dark:bg-slate-950">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <BarChart3 size={28} className="text-amber-500" />
            </div>
            Hotel Performance
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 pl-14">
            {todayStr} · Live operational metrics
          </p>
        </div>

        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:border-amber-500/30 transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin text-amber-500' : ''} />
            <span className="text-sm font-medium pr-1">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Primary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard 
          label="Today's Revenue" 
          value={`₹${Number(summary?.todaySales || 0).toLocaleString('en-IN')}`} 
          icon={IndianRupee} 
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-inner" 
          delayClass="duration-500 delay-75"
        />
        <KpiCard 
          label="Check-ins" 
          value={summary?.todayCheckins || 0} 
          icon={Key} 
          color="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 shadow-inner" 
          delayClass="duration-500 delay-100"
        />
        <KpiCard 
          label="Check-outs" 
          value={summary?.todayCheckouts || 0} 
          icon={LogOut} 
          color="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 shadow-inner" 
          delayClass="duration-500 delay-150"
        />
        <KpiCard 
          label="Occupancy Rate" 
          value={`${summary?.occupancyRate || 0}%`} 
          icon={BedDouble} 
          color="bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 shadow-inner" 
          delayClass="duration-500 delay-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Weekly Sales Chart ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:col-span-2 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">7-Day Revenue Trend</h2>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.weeklyChart || []} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-10" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tickFormatter={(v) => `₹${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '13px', fontWeight: 500, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#fbbf24' }}
                  formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {(summary?.weeklyChart || []).map((_: any, i: number) => (
                    // Highlight the last bar (Today) with Amber, make past days Slate
                    <Cell key={i} fill={i === (summary?.weeklyChart?.length - 1) ? '#f59e0b' : '#94a3b8'} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Weekly Summary & ADR ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">7-Day Total Revenue</h2>
              <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                <IndianRupee size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              ₹{Number(summary?.weekSales || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
              <CalendarDays size={14} /> Trailing 7 days
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Avg Daily Rate</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                ₹{Number(summary?.adr || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Today's Bills</div>
              <div className="text-xl font-bold text-blue-500 dark:text-blue-400">
                {summary?.todayBills || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Room Status Breakdown ── */}
      <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700 fill-mode-both">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <BedDouble size={20} className="text-amber-500" /> Live Room Status
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Available', value: summary?.roomStats?.available || 0, color: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400' },
            { label: 'Occupied', value: summary?.roomStats?.occupied || 0, color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400' },
            { label: 'Reserved', value: summary?.roomStats?.reserved || 0, color: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400' },
            { label: 'Cleaning', value: summary?.roomStats?.cleaning || 0, color: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400' },
            { label: 'Maintenance', value: summary?.roomStats?.maintenance || 0, color: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn(
              "border rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm", 
              "transition-transform hover:scale-105 duration-300",
              color
            )}>
              <div className="text-3xl font-black mb-1">{value}</div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}