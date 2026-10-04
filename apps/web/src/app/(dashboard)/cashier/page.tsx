'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch, apiPost } from '@/lib/api';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { printHtml } from '@/lib/printer';
import { ShoppingCart, Receipt, Layout, ChefHat, Play, Square, X, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Link from 'next/link';

dayjs.extend(relativeTime);

// ─── Ultimate ID Extractor (Defeats the Nested Data Trap) ──────────────
const extractId = (obj: any): string | null => {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  if (obj.id) return obj.id;
  if (obj.shiftId) return obj.shiftId;
  if (obj.shift_id) return obj.shift_id;
  if (obj.data) return extractId(obj.data);
  if (Array.isArray(obj) && obj.length > 0) return extractId(obj[0]);
  return null;
};

// ─── Open Shift Modal ────────────────────────────────────────────────────────

function OpenShiftModal({ onClose, onOpened }: { onClose: () => void; onOpened: () => void }) {
  const isOnline = useOnlineStatus();
  const [openingCash, setOpeningCash] = useState('0');
  
  const mutation = useMutation({
    mutationFn: () => apiPost('/api/v1/shifts/open', { openingCash: parseFloat(openingCash) || 0 }),
    onSuccess: () => { toast.success('Shift opened'); onOpened(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to open shift'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Open Shift</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X size={16} /></button>
        </div>

        {!isOnline && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-400">
            <WifiOff size={14} className="mt-0.5 flex-shrink-0" />
            <p>You are offline. An internet connection is required to open a new shift and sync with the server.</p>
          </div>
        )}

        <div>
          <label className="label">Opening Cash in Drawer (₹)</label>
          <input
            className="input text-xl font-bold"
            type="number" min="0" step="0.50"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            disabled={!isOnline}
            autoFocus
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {[0, 500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setOpeningCash(String(v))}
                disabled={!isOnline}
                className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-50"
              >
                ₹{v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !isOnline}
            className="btn-primary flex-1"
          >
            <Play size={14} /> {mutation.isPending ? 'Opening...' : 'Open Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Close Shift Modal ───────────────────────────────────────────────────────

function CloseShiftModal({
  shiftRaw, onClose, onClosed,
}: { shiftRaw: any; onClose: () => void; onClosed: () => void }) {
  const isOnline = useOnlineStatus();
  const [closingCash, setClosingCash] = useState('0');
  const [notes, setNotes]             = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const shiftId = extractId(shiftRaw);
      if (!shiftId) throw new Error("Invalid Shift ID. Please refresh the page.");
      
      return apiPost(`/api/v1/shifts/${shiftId}/close`, {
        closingCash: parseFloat(closingCash) || 0,
        notes,
      });
    },
    onSuccess: (res) => { 
      toast.success('Shift closed successfully'); 
      
      const shiftData = res.data?.data || res.data;
      if (shiftData) {
        try {
          printHtml({
            restaurantName: 'Dine&Stay Restaurant',
            billNumber: `Z-REPORT: ${shiftData.shiftNumber}`,
            invoiceDate: dayjs().format('D MMM YYYY, h:mm A'),
            orderType: 'End of Day Summary',
            items: [
              { name: 'Total Sales', qty: shiftData.totalOrders, rate: 0, amount: Number(shiftData.totalSales) },
              { name: 'Cash Sales', qty: 1, rate: 0, amount: Number(shiftData.cashSales) },
              { name: 'UPI Sales', qty: 1, rate: 0, amount: Number(shiftData.upiSales) },
              { name: 'Card Sales', qty: 1, rate: 0, amount: Number(shiftData.cardSales) },
            ],
            subtotal: Number(shiftData.totalSales),
            totalTax: Number(shiftData.totalCgst || 0) + Number(shiftData.totalSgst || 0) + Number(shiftData.totalIgst || 0),
            grandTotal: Number(shiftData.totalSales),
            payments: [
              { method: 'Opening Cash', amount: Number(shiftData.openingCash) },
              { method: 'Expected Cash', amount: Number(shiftData.expectedCash) },
              { method: 'Actual Cash', amount: Number(shiftData.closingCash || 0) },
            ],
            changeAmount: Number(shiftData.cashDifference || 0),
            gstSummary: [],
          });
        } catch (err) {
          toast.error('Failed to print Z-Report.');
        }
      }

      onClosed(); 
      onClose(); 
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to close shift'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Close Shift</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X size={16} /></button>
        </div>

        {!isOnline && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-400">
            <WifiOff size={14} className="mt-0.5 flex-shrink-0" />
            <p>You are offline. Reconnect to the internet to close your shift and generate the final Z-Report.</p>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs p-3 rounded-xl">
          Count the physical cash in your drawer and enter the exact amount below. Discrepancies will be logged.
        </div>

        <div>
          <label className="label">Closing Cash Count (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
            <input
              className="input pl-8 text-2xl font-black py-4 text-center"
              type="number" min="0" step="0.50"
              placeholder="0.00"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              disabled={!isOnline}
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input" rows={2}
            placeholder="Any handover notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isOnline}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !isOnline || closingCash === ''}
            className="btn-danger flex-1"
          >
            <Square size={14} /> {mutation.isPending ? 'Closing...' : 'Close & Print'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function CashierDashboardPage() {
  const qc                                        = useQueryClient();
  const { branchId, user }                        = useAuthStore();
  const isOnline                                  = useOnlineStatus();
  const [openShiftModal,  setOpenShiftModal]      = useState(false);
  const [closeShiftModal, setCloseShiftModal]     = useState(false);

  // Use /active to match the manager's logic which correctly returns 404 if closed
  const { data: shiftRaw, refetch: refetchShift } = useQuery({
    queryKey: ['active-shift', branchId],
    queryFn: async () => {
      try {
        const r = await apiFetch('/api/v1/shifts/active');
        return r?.data?.data !== undefined ? r.data.data : r?.data;
      } catch (e: any) {
        if (e.response?.status === 404) return null;
        throw e;
      }
    },
    refetchInterval: 60_000,
  });

  // Extract inner data & strictly check that it is STILL OPEN
  const parsedData = Array.isArray(shiftRaw) ? shiftRaw[0] : (shiftRaw?.data || shiftRaw);
  const shift = (parsedData && parsedData.status === 'open') ? parsedData : null;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome, {user?.firstName}
          </h1>
          <p className="text-sm text-slate-500">
            Cashier Dashboard • {dayjs().format('dddd, D MMMM YYYY')}
          </p>
        </div>
        
        {/* Persistent Offline Warning */}
        {!isOnline && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium">
            <WifiOff size={16} />
            Operating in Offline Mode
          </div>
        )}
      </div>

      {/* Shift Status */}
      <div className="card border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Your Shift Status
        </h2>
        {shift ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <ChefHat size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-300 font-bold text-lg">
                    Shift is Open
                  </span>
                </div>
                <p className="text-sm text-emerald-600 mt-1">
                  {shift.shiftNumber || 'Active'} · Started {shift.openedAt ? dayjs(shift.openedAt).fromNow() : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCloseShiftModal(true)}
              className="flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-900/30 hover:bg-red-600 hover:text-white border border-red-300 dark:border-red-800 hover:border-red-500 rounded-lg px-6 py-3 transition-all font-medium"
            >
              <Square size={16} /> Close Shift
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-slate-600 flex-shrink-0" />
              <div>
                <div className="text-slate-600 dark:text-slate-300 font-bold text-lg">
                  No Active Shift
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  You must open a shift to process transactions.
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpenShiftModal(true)}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 border border-amber-600 rounded-lg px-6 py-3 text-sm transition-all font-bold"
            >
              <Play size={16} /> Open Shift
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-2">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/pos"
          className="group card hover:border-amber-500 transition-all cursor-pointer flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShoppingCart size={32} />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">New Order (POS)</h3>
          <p className="text-xs text-slate-500">Take orders and process payments</p>
        </Link>

        <Link
          href="/billing"
          className="group card hover:border-blue-500 transition-all cursor-pointer flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Receipt size={32} />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Bills & Receipts</h3>
          <p className="text-xs text-slate-500">View and print past transactions</p>
        </Link>

        <Link
          href="/tables"
          className="group card hover:border-purple-500 transition-all cursor-pointer flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Layout size={32} />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Table Management</h3>
          <p className="text-xs text-slate-500">Manage dine-in customers</p>
        </Link>
      </div>

      {/* Modals */}
      {openShiftModal && (
        <OpenShiftModal
          onClose={() => setOpenShiftModal(false)}
          onOpened={() => {
            refetchShift();
            qc.invalidateQueries({ queryKey: ['active-shift'] });
          }}
        />
      )}
      {closeShiftModal && shiftRaw && (
        <CloseShiftModal
          shiftRaw={shiftRaw}
          onClose={() => setCloseShiftModal(false)}
          onClosed={() => {
            refetchShift();
            qc.invalidateQueries({ queryKey: ['active-shift'] });
          }}
        />
      )}
    </div>
  );
}