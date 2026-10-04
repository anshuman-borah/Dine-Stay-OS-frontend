'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { api, apiFetch } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import {
  ShoppingCart, Layout, BookOpen, Clock, Bell,
  CheckCircle2, UtensilsCrossed, ChefHat, Package,
  ArrowRight, Loader2, Volume2, VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Link from 'next/link';
import toast from 'react-hot-toast';

dayjs.extend(relativeTime);

// ─── Safe Fetch Helper ────────────────────────────────────────────────────────
// This guarantees we always get an Array, even if Spring Boot wraps it 
// in an ApiResponse or a Page<T> object with a "content" field!
const fetchSafeArray = async (url: string) => {
  try {
    const r = await apiFetch(url);
    const d1 = r?.data;
    const d2 = d1?.data !== undefined ? d1.data : d1;
    const arr = d2?.content !== undefined ? d2.content : d2;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export default function WaiterDashboardPage() {
  const { user, branchId } = useAuthStore();
  const qc = useQueryClient();
  const [soundEnabled,   setSoundEnabled]   = useState(true);
  const [flashOrderId,   setFlashOrderId]   = useState<string | null>(null);
  const [servingOrderId, setServingOrderId] = useState<string | null>(null);

  /* ── Fetch READY orders ─────────────────────────────────────────── */
  const { data: readyOrders = [], isLoading: loadingReady } = useQuery({
    queryKey: ['waiter-ready-orders', branchId],
    queryFn: () => fetchSafeArray('/api/v1/orders?status=ready&limit=50'),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  /* ── Fetch PREPARING orders ─────────────────────────────────────── */
  const { data: preparingOrders = [] } = useQuery({
    queryKey: ['waiter-preparing-orders', branchId],
    queryFn: () => fetchSafeArray('/api/v1/orders?status=preparing&limit=30'),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  /* ── Fetch PLACED orders ────────────────────────────────────────── */
  const { data: placedOrders = [] } = useQuery({
    queryKey: ['waiter-placed-orders', branchId],
    queryFn: () => fetchSafeArray('/api/v1/orders?status=placed&limit=30'),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  /* ── Mark order as SERVED + bump KDS ───────────────────────────── */
  const serveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.patch(`/api/v1/orders/${orderId}/status`, { status: 'served' });
      await api.patch(`/api/v1/kds/orders/${orderId}/bump`, {}).catch(() => {
        // Non-critical — KDS query also filters by order status
      });
    },
    onMutate: (orderId) => {
      setServingOrderId(orderId);
    },
    onSettled: () => {
      setServingOrderId(null);
    },
    onSuccess: () => {
      toast.success('Order served & cleared from kitchen!');
      qc.invalidateQueries({ queryKey: ['waiter-ready-orders'] });
      qc.invalidateQueries({ queryKey: ['waiter-preparing-orders'] });
      qc.invalidateQueries({ queryKey: ['waiter-placed-orders'] });
      qc.invalidateQueries({ queryKey: ['open-orders-pos'] });
      qc.invalidateQueries({ queryKey: ['kds-pending'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: () => {
      toast.error('Failed to update order');
    },
  });

  /* ── Socket: kitchen ready events ──────────────────────────────── */
  const handleKdsReady = useCallback((payload: any) => {
    qc.invalidateQueries({ queryKey: ['waiter-ready-orders'] });
    qc.invalidateQueries({ queryKey: ['waiter-preparing-orders'] });

    if (payload?.orderId) {
      setFlashOrderId(payload.orderId);
      setTimeout(() => setFlashOrderId(null), 3000);
    }

    if (soundEnabled) {
      try {
        const audio = new Audio('/sounds/bell.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    }

    toast.success(
      `🔔 Order ${payload?.orderNumber || ''} is ready for pickup!`,
      { duration: 5000 },
    );
  }, [qc, soundEnabled]);

  useSocket('order:statusChanged', useCallback((payload: any) => {
    if (payload?.status === 'ready')  handleKdsReady(payload);
    if (payload?.status === 'served') qc.invalidateQueries({ queryKey: ['waiter-ready-orders'] });
  }, [handleKdsReady, qc]));

  useSocket('kds:itemStatusChanged', useCallback(() => {
    qc.invalidateQueries({ queryKey: ['waiter-preparing-orders'] });
  }, [qc]));

  /* ── Counts ─────────────────────────────────────────────────────── */
  const readyCount     = readyOrders.length;
  const preparingCount = preparingOrders.length;
  const placedCount    = placedOrders.length;

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome, {user?.firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Service Dashboard • {dayjs().format('dddd, D MMMM YYYY')}
          </p>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            'btn-ghost flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors',
            soundEnabled ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 bg-slate-100 dark:bg-slate-800',
          )}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {soundEnabled ? 'Sound On' : 'Sound Off'}
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Placed */}
        <div className="rounded-xl border p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{placedCount}</div>
            <div className="text-xs font-medium text-blue-600/80 dark:text-blue-500/70">Waiting for Kitchen</div>
          </div>
        </div>

        {/* Preparing */}
        <div className="rounded-xl border p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <ChefHat size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{preparingCount}</div>
            <div className="text-xs font-medium text-amber-600/80 dark:text-amber-500/70">Being Prepared</div>
          </div>
        </div>

        {/* Ready */}
        <div className={cn(
          'rounded-xl border p-4 flex items-center gap-3 transition-all duration-300',
          'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
          'border-emerald-200 dark:border-emerald-800/50',
          readyCount > 0 && 'ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-lg shadow-emerald-500/20',
        )}>
          <div className="relative w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className={cn("text-emerald-600 dark:text-emerald-400", readyCount > 0 && "animate-[wiggle_1s_ease-in-out_infinite]")} />
            {readyCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                {readyCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{readyCount}</div>
            <div className="text-xs text-emerald-600/80 dark:text-emerald-500/70 font-bold tracking-wide uppercase">
              Ready for Pickup!
            </div>
          </div>
        </div>
      </div>

      {/* Ready for Pickup section */}
      {readyCount > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Ready for Pickup
            </h2>
            <span className="ml-auto text-xs font-medium text-slate-400 hidden sm:block">
              Tap &quot;Picked Up&quot; after serving to clear from kitchen display
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.map((order: any) => {
              const isThisServing = servingOrderId === order.id;
              const isAnyServing  = servingOrderId !== null;

              return (
                <div
                  key={order.id}
                  className={cn(
                    'rounded-xl border-2 p-4 transition-all duration-300 flex flex-col',
                    'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900',
                    'border-emerald-300 dark:border-emerald-700',
                    'hover:shadow-lg hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20',
                    flashOrderId === order.id && 'ring-4 ring-emerald-400 animate-pulse',
                    isThisServing && 'opacity-70 scale-[0.98]',
                  )}
                >
                  {/* Order header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        {order.orderNumber}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {order.table?.name ? (
                          <span className="flex items-center gap-1 font-medium text-xs text-emerald-600 dark:text-emerald-500">
                            <UtensilsCrossed size={10} /> {order.table.name}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                            {order.type === 'takeaway' ? '🥡 Takeaway' :
                             order.type === 'delivery' ? '🛵 Delivery' : '🍽️ Dine In'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px] font-bold tracking-wide uppercase text-emerald-700 dark:text-emerald-300">
                        Ready
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="flex-1 space-y-1 mb-4 bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                    {(order.items || []).slice(0, 5).map((item: any, idx: number) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 mr-1.5">
                            {Math.round(item.quantity)}×
                          </span>
                          {item.name || item.menuItem?.name || 'Item'}
                        </span>
                        {item.variationName && (
                          <span className="text-[10px] text-slate-500 ml-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {item.variationName}
                          </span>
                        )}
                      </div>
                    ))}
                    {(order.items || []).length > 5 && (
                      <div className="text-[11px] font-medium text-slate-500 pt-1 mt-1 border-t border-slate-200 dark:border-slate-700">
                        +{order.items.length - 5} more items
                      </div>
                    )}
                  </div>

                  {/* Serve button */}
                  <button
                    onClick={() => serveMutation.mutate(order.id)}
                    disabled={isAnyServing}
                    className={cn(
                      'w-full py-2.5 rounded-lg font-bold text-sm transition-all',
                      'flex items-center justify-center gap-2',
                      'active:scale-95 shadow-sm',
                      'disabled:cursor-not-allowed',
                      isThisServing
                        ? 'bg-emerald-400 dark:bg-emerald-500 text-white opacity-80'
                        : isAnyServing
                          ? 'bg-emerald-200 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-600'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-md hover:shadow-emerald-500/20',
                    )}
                  >
                    {isThisServing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Serving...
                      </>
                    ) : (
                      <>
                        <Package size={14} />
                        Picked Up &amp; Served
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No ready orders */}
      {!loadingReady && readyCount === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 p-10 text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle2 size={32} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">
            No orders ready for pickup
          </h3>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            You&apos;ll get a notification with a sound ping as soon as the kitchen marks an order as ready.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="pt-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/pos"
            className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center gap-4 p-5 hover:shadow-lg hover:shadow-amber-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <ShoppingCart size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Take Order</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Open POS to punch new orders</p>
            </div>
            <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/tables"
            className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-pointer flex items-center gap-4 p-5 hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Layout size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Tables</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">View & manage table statuses</p>
            </div>
            <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/menu"
            className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer flex items-center gap-4 p-5 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <BookOpen size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Digital Menu</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Browse items & check availability</p>
            </div>
            <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Shift Info */}
      <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left mt-8">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <Clock size={24} />
        </div>
        <div>
          <h3 className="text-slate-900 dark:text-white font-bold text-base">Have a great shift!</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Ready orders appear here automatically. Tap <span className="font-bold text-slate-600 dark:text-slate-300">"Picked Up & Served"</span> after
            delivering food to clear them from the kitchen display.
          </p>
        </div>
      </div>
    </div>
  );
}