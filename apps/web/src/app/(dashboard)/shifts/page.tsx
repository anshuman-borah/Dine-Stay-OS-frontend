'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import {
  Wallet, CheckCircle, Clock, Receipt, 
  IndianRupee, AlertTriangle, Printer, History, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { printHtml } from '@/lib/printer';

type TabView = 'current' | 'history';

// ─── Ultimate Extractors (Defeats the Nested Data Trap) ──────────────────
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

const extractShiftObject = (obj: any): any => {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj.length > 0 ? extractShiftObject(obj[0]) : null;
  if (obj.data) return extractShiftObject(obj.data);
  if (obj.id || obj.shiftNumber || obj.shiftId) return obj;
  return null;
};

const fetchSafeArray = async (url: string) => {
  try {
    const r = await apiFetch(url);
    const payload = r?.data?.data !== undefined ? r.data.data : r?.data;
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
};

export default function ShiftPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<TabView>('current');
  
  // Forms state
  const [openingCash, setOpeningCash] = useState<string>('');
  const [closingCash, setClosingCash] = useState<string>('');
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────────
  
  // 1. Get the current active shift for this branch
  const { data: rawActiveShift, isLoading: shiftLoading } = useQuery({
    queryKey: ['active-shift'],
    queryFn: async () => {
      try {
        const r = await apiFetch('/api/v1/shifts/active');
        return r?.data?.data !== undefined ? r.data.data : r?.data;
      } catch (e: any) {
        if (e.response?.status === 404) return null; // No active shift
        throw e;
      }
    }
  });

  // Safely extract the shift object to render properties
  const activeShift = extractShiftObject(rawActiveShift);

  // 2. Get shift history
  const { data: shiftHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['shift-history'],
    queryFn: () => fetchSafeArray('/api/v1/shifts'),
    enabled: tab === 'history',
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const openShiftMutation = useMutation({
    mutationFn: () => apiPost('/api/v1/shifts/open', { openingCash: parseFloat(openingCash) || 0 }),
    onSuccess: () => {
      toast.success('Shift opened successfully');
      setOpeningCash('');
      qc.invalidateQueries({ queryKey: ['active-shift'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to open shift'),
  });

  const closeShiftMutation = useMutation({
    mutationFn: () => {
      const shiftId = extractId(rawActiveShift);
      console.log("Extracted Shift ID for Closing:", shiftId); // For debugging
      
      if (!shiftId) throw new Error("Invalid Shift ID. Please refresh the page.");
      
      return apiPost(`/api/v1/shifts/${shiftId}/close`, { 
        closingCash: parseFloat(closingCash) || 0 
      });
    },
    onSuccess: (res) => {
      toast.success('Shift closed successfully');
      setIsClosingModalOpen(false);
      setClosingCash('');
      qc.invalidateQueries({ queryKey: ['active-shift'] });
      qc.invalidateQueries({ queryKey: ['shift-history'] });
      
      // Auto-print Z-Report on close
      handlePrintZReport(extractShiftObject(res));
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to close shift'),
  });

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handlePrintZReport = (shiftData: any) => {
    if (!shiftData) return;
    try {
      printHtml({
        restaurantName: 'Dine&Stay Restaurant',
        billNumber: `Z-REPORT: ${shiftData.shiftNumber || 'N/A'}`,
        invoiceDate: dayjs().format('D MMM YYYY, h:mm A'),
        orderType: 'End of Day Summary',
        items: [
          { name: 'Total Sales', qty: shiftData.totalOrders || 0, rate: 0, amount: Number(shiftData.totalSales || 0) },
          { name: 'Cash Sales', qty: 1, rate: 0, amount: Number(shiftData.cashSales || 0) },
          { name: 'UPI Sales', qty: 1, rate: 0, amount: Number(shiftData.upiSales || 0) },
          { name: 'Card Sales', qty: 1, rate: 0, amount: Number(shiftData.cardSales || 0) },
        ],
        subtotal: Number(shiftData.totalSales || 0),
        totalTax: Number(shiftData.totalCgst || 0) + Number(shiftData.totalSgst || 0) + Number(shiftData.totalIgst || 0),
        grandTotal: Number(shiftData.totalSales || 0),
        payments: [
          { method: 'Opening Cash', amount: Number(shiftData.openingCash || 0) },
          { method: 'Expected Cash', amount: Number(shiftData.expectedCash || 0) },
          { method: 'Actual Cash', amount: Number(shiftData.closingCash || 0) },
        ],
        changeAmount: Number(shiftData.cashDifference || 0),
        gstSummary: [], // Z-reports usually skip detailed GST breakdowns unless requested
      });
    } catch (err) {
      toast.error('Print failed. Check console.');
    }
  };

  const fmt = (num: number) => `₹${Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // ── Render Helpers ──────────────────────────────────────────────────────────

  if (shiftLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Cash Register & Shifts</h1>
          <p className="text-sm text-slate-500">Manage your daily cash float and End-of-Day reports</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setTab('current')}
            className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition-all', tab === 'current' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400')}
          >
            Current Shift
          </button>
          <button
            onClick={() => setTab('history')}
            className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition-all', tab === 'history' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400')}
          >
            Shift History
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        
        {/* ════════ CURRENT SHIFT TAB ════════ */}
        {tab === 'current' && (
          <div className="max-w-3xl mx-auto">
            {!activeShift ? (
              /* NO ACTIVE SHIFT: Show Open Shift Form */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-6 mt-10">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                  <Wallet size={32} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Register is Closed</h2>
                  <p className="text-slate-500 mt-2">Open a new shift to start accepting POS orders.</p>
                </div>

                <div className="max-w-sm mx-auto text-left space-y-3">
                  <label className="label">Opening Cash Float (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      className="input pl-8 text-lg font-bold"
                      placeholder="e.g. 2000"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-slate-500">Count the physical cash in the drawer before starting.</p>
                  
                  <button
                    onClick={() => openShiftMutation.mutate()}
                    disabled={openShiftMutation.isPending || openingCash === ''}
                    className="btn-primary w-full py-3 mt-4 text-base"
                  >
                    {openShiftMutation.isPending ? 'Opening...' : 'Open Shift'}
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE SHIFT SUMMARY */
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      Shift {activeShift.shiftNumber || 'Active'} is Open
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Opened by {activeShift.cashierName || 'Staff'} • {activeShift.openedAt ? dayjs(activeShift.openedAt).format('h:mm A') : ''}
                    </p>
                  </div>
                  <button onClick={() => setIsClosingModalOpen(true)} className="btn-danger flex items-center gap-2 px-6">
                    <Lock size={16} /> Close Register
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase">Opening Cash</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-400 mt-1">{fmt(activeShift.openingCash)}</p>
                  </div>
                  <div className="card bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-500 uppercase">Cash Sales</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-400 mt-1">{fmt(activeShift.cashSales)}</p>
                  </div>
                  <div className="card col-span-2 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50 flex flex-col justify-center items-center border-dashed border-2">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-500 uppercase tracking-widest">Expected Cash in Drawer</p>
                    <p className="text-4xl font-black text-blue-900 dark:text-blue-400 mt-1">
                      {fmt(Number(activeShift.openingCash || 0) + Number(activeShift.cashSales || 0))}
                    </p>
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                    Other Sales Methods
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">UPI</p>
                      <p className="text-lg font-bold">{fmt(activeShift.upiSales)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Card</p>
                      <p className="text-lg font-bold">{fmt(activeShift.cardSales)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Billed Revenue</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(activeShift.totalSales)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ HISTORY TAB ════════ */}
        {tab === 'history' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Shift</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium text-right">Expected</th>
                  <th className="px-6 py-3 font-medium text-right">Actual</th>
                  <th className="px-6 py-3 font-medium text-right">Discrepancy</th>
                  <th className="px-6 py-3 font-medium text-right">Total Revenue</th>
                  <th className="px-6 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {shiftHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No shift history found</td>
                  </tr>
                ) : (
                  shiftHistory.map((shift: any) => {
                    const diff = Number(shift.cashDifference || 0);
                    const isShort = diff < 0;
                    const isOver = diff > 0;
                    
                    return (
                      <tr key={shift.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{shift.shiftNumber}</div>
                          <div className="text-xs text-slate-500">{shift.cashierName}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                          <div>{dayjs(shift.openedAt).format('D MMM, HH:mm')}</div>
                          <div>{shift.closedAt ? dayjs(shift.closedAt).format('D MMM, HH:mm') : <span className="text-emerald-500">Active now</span>}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">{fmt(shift.expectedCash)}</td>
                        <td className="px-6 py-4 text-right font-mono">{shift.status === 'closed' ? fmt(shift.closingCash) : '—'}</td>
                        <td className="px-6 py-4 text-right">
                          {shift.status === 'open' ? '—' : diff === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold">
                              <CheckCircle size={12}/> Exact
                            </span>
                          ) : isShort ? (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold">
                              <AlertTriangle size={12}/> {fmt(diff)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold">
                              +{fmt(diff)} Over
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold">{fmt(shift.totalSales)}</td>
                        <td className="px-6 py-4 text-center">
                          {shift.status === 'closed' && (
                            <button 
                              onClick={() => handlePrintZReport(shift)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 transition-colors"
                              title="Reprint Z-Report"
                            >
                              <Printer size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Closing Shift Modal ──────────────────────────────────────────────── */}
      {isClosingModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Close Shift</h2>
            
            {/* The Blind Close Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs p-3 rounded-xl mb-5">
              Count the physical cash in your drawer and enter the exact amount below. Discrepancies will be logged automatically.
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Actual Cash in Drawer (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                  <input
                    type="number"
                    min={0}
                    className="input pl-8 text-2xl font-black py-4 text-center"
                    placeholder="0.00"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => { setIsClosingModalOpen(false); setClosingCash(''); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => closeShiftMutation.mutate()}
                  disabled={closeShiftMutation.isPending || closingCash === ''}
                  className="btn-danger flex-1"
                >
                  {closeShiftMutation.isPending ? 'Closing...' : 'Close & Print'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}