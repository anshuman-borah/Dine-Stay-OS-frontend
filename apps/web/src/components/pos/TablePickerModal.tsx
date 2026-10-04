'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cacheTables, getCachedTables } from '@/lib/offline';
import { usePosStore } from '@/store/pos.store';
import { useAuthStore } from '@/store/auth.store';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  available: 'border-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 hover:border-emerald-500',
  occupied: 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:border-red-400 cursor-pointer',
  reserved: 'border-amber-600 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 hover:border-amber-500',
  cleaning: 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-400 opacity-50 cursor-not-allowed',
};

interface TablePickerModalProps {
  onClose: () => void;
  onLoadOrder: (order: any) => Promise<void>;
  loadingOrderId?: string | null;
}

export function TablePickerModal({ onClose, onLoadOrder, loadingOrderId }: TablePickerModalProps) {
  const { tableId, setTable } = usePosStore();
  const { branchId } = useAuthStore();

  // 1. Fetch tables
  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: ['tables'],
    networkMode: 'always',
    queryFn: async () => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Offline');
        const r = await apiFetch('/api/v1/tables');
        await cacheTables(r.data);
        return r.data;
      } catch (err) {
        return getCachedTables();
      }
    },
  });

  // 2. Fetch open orders to find which order belongs to the occupied table
  const { data: openOrders } = useQuery({
    queryKey: ['open-orders-pos', branchId],
    networkMode: 'always',
    queryFn: () => apiFetch('/api/v1/orders?status=draft,placed,confirmed,preparing,ready,served&limit=50').then((r) => r.data || []),
    staleTime: 5000,
  });

  const handleSelect = async (table: any) => {
    if (table.status === 'cleaning') return;

    if (table.status === 'occupied') {
      // Find the active open order for this table
      const activeOrder = openOrders?.find((o: any) => o.tableId === table.id);
      if (activeOrder) {
        await onLoadOrder(activeOrder);
        onClose();
      } else {
        // Fallback: If table is occupied but no order loaded on server, allow taking a new order
        setTable(table.id, table.name);
        onClose();
      }
      return;
    }

    // Available or Reserved
    setTable(table.id, table.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Table</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>
        
        {isLoadingTables ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Loading tables...
          </div>
        ) : (
          <div className="p-4 grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {tables?.map((t: any) => {
              const isThisLoading = loadingOrderId && openOrders?.find((o: any) => o.tableId === t.id)?.id === loadingOrderId;

              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  disabled={t.status === 'cleaning' || loadingOrderId !== null}
                  className={cn(
                    'relative rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all active:scale-95 disabled:opacity-60',
                    STATUS_STYLES[t.status] || STATUS_STYLES.available,
                    tableId === t.id && 'ring-2 ring-amber-400'
                  )}
                >
                  {isThisLoading ? (
                    <Loader2 size={12} className="absolute top-1.5 right-1.5 animate-spin text-amber-500" />
                  ) : tableId === t.id ? (
                    <CheckCircle size={12} className="absolute top-1.5 right-1.5 text-amber-600 dark:text-amber-400" />
                  ) : null}
                  <span className="font-bold text-sm">{t.name}</span>
                  <span className="text-xs opacity-70 capitalize">{t.status}</span>
                  <span className="text-xs opacity-60">{t.capacity} seats</span>
                </button>
              );
            })}
          </div>
        )}
        
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex gap-3 text-xs text-slate-900 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Available (Create order)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Occupied (Load open order)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Reserved</span>
        </div>
      </div>
    </div>
  );
}