// 'use client';
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { apiFetch, apiPatch, apiPost } from '@/lib/api';
// import toast from 'react-hot-toast';
// import { printHtml } from '@/lib/printer';
// import { Search, Printer, XCircle, Mail, Loader2 } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import dayjs from 'dayjs';

// const STATUS_BADGE: Record<string, string> = {
//   issued: 'badge-blue', paid: 'badge-green', void: 'badge-red', draft: 'badge-slate', refunded: 'badge-yellow',
// };

// export default function BillingPage() {
//   const qc = useQueryClient();
//   const [from, setFrom] = useState(dayjs().format('YYYY-MM-DD'));
//   const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
//   const [search, setSearch] = useState('');
//   const [selectedBill, setSelectedBill] = useState<any>(null);
//   const [emailModal, setEmailModal] = useState<{ billId: string; billNumber: string } | null>(null);
//   const [emailInput, setEmailInput] = useState('');

//   const { data: bills, isLoading: isBillsLoading } = useQuery({
//     queryKey: ['bills', from, to],
//     queryFn: async () => {
//       try {
//         const fromIso = dayjs(from).startOf('day').toISOString();
//         const toIso = dayjs(to).endOf('day').toISOString();
        
//         const r = await apiFetch(`/api/v1/billing/bills?source=pos&from=${fromIso}&to=${toIso}&limit=200`);
        
//         // 🛡️ Broad payload extraction to handle any API wrapper shape
//         const payload = r?.data?.data || r?.data || r;
//         if (Array.isArray(payload)) return payload;
//         if (payload?.data && Array.isArray(payload.data)) return payload.data;
//         if (payload?.items && Array.isArray(payload.items)) return payload.items;
//         if (payload?.bills && Array.isArray(payload.bills)) return payload.bills;
        
//         return [];
//       } catch (error) {
//         console.error("Failed to load bills:", error);
//         return [];
//       }
//     },
//   });

//   const { data: billDetail, isLoading: isDetailLoading } = useQuery({
//     queryKey: ['billDetail', selectedBill?.id],
//     queryFn: async () => {
//       // 🛡️ BLOCK THE GHOST UUID EXPLICITLY
//       if (!selectedBill?.id || selectedBill.id === 'undefined') return null; 
//       try {
//         const r = await apiFetch(`/api/v1/billing/bills/${selectedBill.id}`);
//         return r?.data?.data !== undefined ? r.data.data : r?.data;
//       } catch (error) {
//         return null;
//       }
//     },
//     // 🛡️ PREVENT FETCH IF IT'S THE STRING "undefined"
//     enabled: !!selectedBill?.id && selectedBill.id !== 'undefined',
//   });

//   const voidMutation = useMutation({
//     mutationFn: ({ id, reason }: { id: string; reason: string }) => apiPatch(`/api/v1/billing/bills/${id}/void`, { reason }),
//     onSuccess: () => { 
//       toast.success('Bill voided and shift totals adjusted'); 
//       qc.invalidateQueries({ queryKey: ['bills'] }); 
//       setSelectedBill(null); 
//     },
//     onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to void bill'),
//   });

//   const reprintMutation = useMutation({
//     mutationFn: (id: string) => apiPost(`/api/v1/billing/bills/${id}/reprint`, {}),
//     onSuccess: (_, id) => {
//       toast.success('Reprint recorded');
//       qc.invalidateQueries({ queryKey: ['billDetail', id] });
//       if (billDetail) {
//         printHtml({
//           restaurantName: 'Dine&Stay Restaurant',
//           billNumber: billDetail.billNumber,
//           invoiceDate: dayjs(billDetail.createdAt).format('D MMM YYYY h:mm A'),
//           orderType: billDetail.order?.orderType || 'dine_in',
//           items: billDetail.order?.items?.map((i: any) => ({ name: i.menuItem?.name || i.name, qty: i.quantity, rate: i.unitPrice, amount: i.lineTotal })) || [],
//           subtotal: Number(billDetail.subtotal),
//           totalTax: Number(billDetail.totalTax),
//           grandTotal: Number(billDetail.grandTotal),
//           payments: billDetail.payments?.map((p: any) => ({ method: p.method, amount: Number(p.amount) })) || [],
//           gstSummary: billDetail.gstSummary,
//         });
//       }
//     },
//     onError: () => toast.error('Reprint failed'),
//   });

//   const emailMutation = useMutation({
//     mutationFn: ({ id, email }: { id: string; email: string }) => apiPost(`/api/v1/billing/bills/${id}/email`, { email }),
//     onSuccess: () => { 
//       toast.success('Bill emailed successfully'); 
//       setEmailModal(null); 
//       setEmailInput(''); 
//     },
//     onError: (e: any) => toast.error(e.response?.data?.message || 'Email failed'),
//   });

//   // 🛡️ Robust search filter (ignores case, never crashes)
//   const filtered = Array.isArray(bills) 
//     ? bills.filter((b: any) => {
//         if (!search) return true;
//         const s = search.toLowerCase();
//         const matchBill = String(b.billNumber || '').toLowerCase().includes(s);
//         const matchCustomer = String(b.customerName || '').toLowerCase().includes(s);
//         return matchBill || matchCustomer;
//       }) 
//     : [];

//   const totals = { 
//     gross: filtered.reduce((s: number, b: any) => s + Number(b.grandTotal || 0), 0), 
//     tax: filtered.reduce((s: number, b: any) => s + Number(b.totalTax || 0), 0), 
//     count: filtered.length 
//   };

//   return (
//     <div className="flex h-full">
//       {/* Bill List */}
//       <div className="flex-1 flex flex-col overflow-hidden">
//         <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
//           <div className="flex items-center gap-3 flex-wrap">
//             <div className="flex items-center gap-2 text-sm">
//               <input type="date" className="input py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} />
//               <span className="text-slate-900 dark:text-slate-500">to</span>
//               <input type="date" className="input py-1.5" value={to} onChange={(e) => setTo(e.target.value)} />
//             </div>
//             <div className="relative flex-1 min-w-40">
//               <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-400" />
//               <input className="input pl-8" placeholder="Bill # or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
//             </div>
//           </div>
//           <div className="flex gap-4 text-sm">
//             <span className="text-slate-900 dark:text-slate-400">{totals.count} bills</span>
//             <span className="text-amber-600 dark:text-amber-400 font-medium">₹{totals.gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
//             <span className="text-slate-900 dark:text-slate-500">GST: ₹{totals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto">
//           <table className="w-full text-sm">
//             <thead className="bg-slate-100/50 dark:bg-slate-800/50 sticky top-0 z-10">
//               <tr>
//                 <th className="th">Bill #</th>
//                 <th className="th">Time</th>
//                 <th className="th">Customer / Info</th>
//                 <th className="th text-right">Amount</th>
//                 <th className="th">Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {isBillsLoading ? (
//                 <tr>
//                   <td colSpan={5} className="text-center py-12 text-slate-500">
//                     <Loader2 className="animate-spin mx-auto mb-2" size={24} />
//                     Loading bills...
//                   </td>
//                 </tr>
//               ) : filtered.length > 0 ? (
//                 filtered.map((bill: any) => (
//                   <tr key={bill.id} onClick={() => setSelectedBill(bill)} className={cn('table-row cursor-pointer', selectedBill?.id === bill.id && 'bg-amber-100 dark:bg-amber-500/10')}>
//                     <td className="td font-medium text-amber-600 dark:text-amber-400">{bill.billNumber}</td>
//                     <td className="td text-slate-900 dark:text-slate-400 text-xs">{dayjs(bill.createdAt || bill.issuedAt).format('h:mm A')}</td>
//                     <td className="td">
//                       {bill.customerName ? (
//                         bill.customerName
//                       ) : bill.order?.table ? (
//                         <span className="text-slate-900 dark:text-slate-500 italic">Table {bill.order.table.tableNumber}</span>
//                       ) : bill.order?.orderType ? (
//                         <span className="text-slate-900 dark:text-slate-500 italic capitalize">{bill.order.orderType.replace('_', ' ')}</span>
//                       ) : (
//                         <span className="text-slate-900 dark:text-slate-500 italic">Walk-in</span>
//                       )}
//                     </td>
//                     <td className="td text-right font-bold">₹{Number(bill.grandTotal).toFixed(2)}</td>
//                     <td className="td"><span className={STATUS_BADGE[bill.status] || 'badge-slate'}>{bill.status}</span></td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={5} className="text-center py-12 text-slate-900 dark:text-slate-500">
//                     No bills found for this period
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Email Modal */}
//       {emailModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
//           <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-sm p-6 space-y-4">
//             <div className="flex items-center gap-2">
//               <Mail size={18} className="text-amber-600 dark:text-amber-400" />
//               <h3 className="font-bold text-slate-900 dark:text-white">Email Bill {emailModal.billNumber}</h3>
//             </div>
//             <div>
//               <label className="label">Customer Email</label>
//               <input
//                 className="input"
//                 type="email"
//                 placeholder="customer@example.com"
//                 value={emailInput}
//                 onChange={(e) => setEmailInput(e.target.value)}
//                 onKeyDown={(e) => e.key === 'Enter' && emailInput && emailMutation.mutate({ id: emailModal.billId, email: emailInput })}
//                 autoFocus
//               />
//             </div>
//             <div className="flex gap-3">
//               <button onClick={() => { setEmailModal(null); setEmailInput(''); }} className="btn-secondary flex-1">Cancel</button>
//               <button
//                 onClick={() => emailMutation.mutate({ id: emailModal.billId, email: emailInput })}
//                 disabled={emailMutation.isPending || !emailInput}
//                 className="btn-primary flex-1"
//               >
//                 {emailMutation.isPending ? 'Sending...' : 'Send Email'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Bill Detail */}
//       {selectedBill && (
//         <div className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 flex flex-col">
//           <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
//             <h3 className="font-bold text-slate-900 dark:text-white">{selectedBill.billNumber}</h3>
//             <button onClick={() => setSelectedBill(null)} className="btn-ghost p-1"><XCircle size={16} /></button>
//           </div>
//           <div className="flex-1 overflow-y-auto p-4 space-y-4">
//             {isDetailLoading ? (
//               <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" /></div>
//             ) : billDetail ? (
//               <>
//                 <div className="space-y-1 text-sm">
//                   <div className="flex justify-between"><span className="text-slate-900 dark:text-slate-400">Date</span><span>{dayjs(billDetail.createdAt || billDetail.issuedAt).format('D MMM YYYY, h:mm A')}</span></div>
                  
//                   <div className="flex justify-between">
//                     <span className="text-slate-900 dark:text-slate-400">Customer</span>
//                     <span className="capitalize">
//                       {billDetail.customerName 
//                         ? billDetail.customerName 
//                         : billDetail.order?.table 
//                           ? `Table ${billDetail.order.table.tableNumber}` 
//                           : billDetail.order?.orderType 
//                             ? billDetail.order.orderType.replace('_', ' ') 
//                             : 'Walk-in'}
//                     </span>
//                   </div>

//                   {billDetail.customerGstin && <div className="flex justify-between"><span className="text-slate-900 dark:text-slate-400">GSTIN</span><span className="font-mono text-xs">{billDetail.customerGstin}</span></div>}
//                 </div>

//                 <div className="space-y-1">
//                   {billDetail.order?.items?.map((item: any) => (
//                     <div key={item.id} className="flex justify-between text-sm">
//                       <span className="text-slate-600 dark:text-slate-300">{item.quantity}× {item.menuItem?.name || item.name}</span>
//                       <span className="text-slate-900 dark:text-white font-medium">₹{Number(item.lineTotal).toFixed(2)}</span>
//                     </div>
//                   ))}
//                 </div>

//                 <div className="border-t border-slate-300 dark:border-slate-700 pt-3 space-y-1 text-sm">
//                   <div className="flex justify-between text-slate-900 dark:text-slate-400"><span>Subtotal</span><span>₹{Number(billDetail.subtotal).toFixed(2)}</span></div>
//                   {Number(billDetail.discountAmount) > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Discount</span><span>-₹{Number(billDetail.discountAmount).toFixed(2)}</span></div>}
//                   <div className="flex justify-between text-slate-900 dark:text-slate-400"><span>GST</span><span>₹{Number(billDetail.totalTax).toFixed(2)}</span></div>
//                   <div className="flex justify-between text-slate-900 dark:text-white font-bold text-base border-t border-slate-300 dark:border-slate-700 pt-2"><span>Grand Total</span><span>₹{Number(billDetail.grandTotal).toFixed(2)}</span></div>
//                 </div>

//                 {billDetail.payments?.length > 0 && (
//                   <div className="space-y-1">
//                     <div className="text-xs text-slate-900 dark:text-slate-500 uppercase tracking-wide">Payments</div>
//                     {billDetail.payments.map((p: any) => (
//                       <div key={p.id} className="flex justify-between text-sm">
//                         <span className="badge-slate capitalize">{p.method}</span>
//                         <span>₹{Number(p.amount).toFixed(2)}</span>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </>
//             ) : null}
//           </div>
//           <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
//             <div className="grid grid-cols-2 gap-2">
//               <button
//                 onClick={() => reprintMutation.mutate(selectedBill.id)}
//                 disabled={reprintMutation.isPending}
//                 className="btn-secondary text-xs"
//               >
//                 <Printer size={13} /> Reprint
//               </button>
//               <button
//                 onClick={() => { setEmailInput(billDetail?.customerEmail || ''); setEmailModal({ billId: selectedBill.id, billNumber: selectedBill.billNumber }); }}
//                 className="btn-secondary text-xs"
//               >
//                 <Mail size={13} /> Email
//               </button>
//             </div>
//             {selectedBill.status !== 'void' && (
//               <button onClick={() => { const r = prompt('Void reason?'); if (r) voidMutation.mutate({ id: selectedBill.id, reason: r }); }} className="btn-danger w-full text-sm">
//                 <XCircle size={14} /> Void Bill
//               </button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPatch, apiPost } from '@/lib/api';
import toast from 'react-hot-toast';
import { printHtml } from '@/lib/printer';
import { Search, Printer, XCircle, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
// 🟢 ADDED: Import AuthStore to get dynamic tenant details
import { useAuthStore } from '@/store/auth.store';

const STATUS_BADGE: Record<string, string> = {
  issued: 'badge-blue', paid: 'badge-green', void: 'badge-red', draft: 'badge-slate', refunded: 'badge-yellow',
};

export default function BillingPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore(); // 🟢 ADDED: Grab user info

  const [from, setFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [emailModal, setEmailModal] = useState<{ billId: string; billNumber: string } | null>(null);
  const [emailInput, setEmailInput] = useState('');

  const { data: bills, isLoading: isBillsLoading } = useQuery({
    queryKey: ['bills', from, to],
    queryFn: async () => {
      try {
        const fromIso = dayjs(from).startOf('day').toISOString();
        const toIso = dayjs(to).endOf('day').toISOString();
        
        const r = await apiFetch(`/api/v1/billing/bills?source=pos&from=${fromIso}&to=${toIso}&limit=200`);
        
        // 🛡️ Broad payload extraction to handle any API wrapper shape
        const payload = r?.data?.data || r?.data || r;
        if (Array.isArray(payload)) return payload;
        if (payload?.data && Array.isArray(payload.data)) return payload.data;
        if (payload?.items && Array.isArray(payload.items)) return payload.items;
        if (payload?.bills && Array.isArray(payload.bills)) return payload.bills;
        
        return [];
      } catch (error) {
        console.error("Failed to load bills:", error);
        return [];
      }
    },
  });

  const { data: billDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['billDetail', selectedBill?.id],
    queryFn: async () => {
      // 🛡️ BLOCK THE GHOST UUID EXPLICITLY
      if (!selectedBill?.id || selectedBill.id === 'undefined') return null; 
      try {
        const r = await apiFetch(`/api/v1/billing/bills/${selectedBill.id}`);
        return r?.data?.data !== undefined ? r.data.data : r?.data;
      } catch (error) {
        return null;
      }
    },
    // 🛡️ PREVENT FETCH IF IT'S THE STRING "undefined"
    enabled: !!selectedBill?.id && selectedBill.id !== 'undefined',
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => apiPatch(`/api/v1/billing/bills/${id}/void`, { reason }),
    onSuccess: () => { 
      toast.success('Bill voided and shift totals adjusted'); 
      qc.invalidateQueries({ queryKey: ['bills'] }); 
      setSelectedBill(null); 
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to void bill'),
  });

  const reprintMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/v1/billing/bills/${id}/reprint`, {}),
    onSuccess: (_, id) => {
      toast.success('Reprint recorded');
      qc.invalidateQueries({ queryKey: ['billDetail', id] });
      if (billDetail) {
        printHtml({
          // 🟢 FIXED: Removed hardcoded text. Dynamically uses Branch Name -> Tenant Name -> 'Receipt'
          restaurantName: billDetail.branch?.name || user?.tenantName || 'Receipt',
          billNumber: billDetail.billNumber,
          invoiceDate: dayjs(billDetail.createdAt).format('D MMM YYYY h:mm A'),
          orderType: billDetail.order?.orderType || 'dine_in',
          items: billDetail.order?.items?.map((i: any) => ({ name: i.menuItem?.name || i.name, qty: i.quantity, rate: i.unitPrice, amount: i.lineTotal })) || [],
          subtotal: Number(billDetail.subtotal),
          totalTax: Number(billDetail.totalTax),
          grandTotal: Number(billDetail.grandTotal),
          payments: billDetail.payments?.map((p: any) => ({ method: p.method, amount: Number(p.amount) })) || [],
          gstSummary: billDetail.gstSummary,
        });
      }
    },
    onError: () => toast.error('Reprint failed'),
  });

  const emailMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => apiPost(`/api/v1/billing/bills/${id}/email`, { email }),
    onSuccess: () => { 
      toast.success('Bill emailed successfully'); 
      setEmailModal(null); 
      setEmailInput(''); 
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Email failed'),
  });

  // 🛡️ Robust search filter (ignores case, never crashes)
  const filtered = Array.isArray(bills) 
    ? bills.filter((b: any) => {
        if (!search) return true;
        const s = search.toLowerCase();
        const matchBill = String(b.billNumber || '').toLowerCase().includes(s);
        const matchCustomer = String(b.customerName || '').toLowerCase().includes(s);
        return matchBill || matchCustomer;
      }) 
    : [];

  const totals = { 
    gross: filtered.reduce((s: number, b: any) => s + Number(b.grandTotal || 0), 0), 
    tax: filtered.reduce((s: number, b: any) => s + Number(b.totalTax || 0), 0), 
    count: filtered.length 
  };

  return (
    <div className="flex h-full">
      {/* Bill List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <input type="date" className="input py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="text-slate-900 dark:text-slate-500">to</span>
              <input type="date" className="input py-1.5" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="relative flex-1 min-w-40">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-400" />
              <input className="input pl-8" placeholder="Bill # or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-slate-900 dark:text-slate-400">{totals.count} bills</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">₹{totals.gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-slate-900 dark:text-slate-500">GST: ₹{totals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 sticky top-0 z-10">
              <tr>
                <th className="th">Bill #</th>
                <th className="th">Time</th>
                <th className="th">Customer / Info</th>
                <th className="th text-right">Amount</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {isBillsLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading bills...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((bill: any) => (
                  <tr key={bill.id} onClick={() => setSelectedBill(bill)} className={cn('table-row cursor-pointer', selectedBill?.id === bill.id && 'bg-amber-100 dark:bg-amber-500/10')}>
                    <td className="td font-medium text-amber-600 dark:text-amber-400">{bill.billNumber}</td>
                    <td className="td text-slate-900 dark:text-slate-400 text-xs">{dayjs(bill.createdAt || bill.issuedAt).format('h:mm A')}</td>
                    <td className="td">
                      {bill.customerName ? (
                        bill.customerName
                      ) : bill.order?.table ? (
                        <span className="text-slate-900 dark:text-slate-500 italic">Table {bill.order.table.tableNumber}</span>
                      ) : bill.order?.orderType ? (
                        <span className="text-slate-900 dark:text-slate-500 italic capitalize">{bill.order.orderType.replace('_', ' ')}</span>
                      ) : (
                        <span className="text-slate-900 dark:text-slate-500 italic">Walk-in</span>
                      )}
                    </td>
                    <td className="td text-right font-bold">₹{Number(bill.grandTotal).toFixed(2)}</td>
                    <td className="td"><span className={STATUS_BADGE[bill.status] || 'badge-slate'}>{bill.status}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-900 dark:text-slate-500">
                    No bills found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-amber-600 dark:text-amber-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">Email Bill {emailModal.billNumber}</h3>
            </div>
            <div>
              <label className="label">Customer Email</label>
              <input
                className="input"
                type="email"
                placeholder="customer@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && emailInput && emailMutation.mutate({ id: emailModal.billId, email: emailInput })}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEmailModal(null); setEmailInput(''); }} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => emailMutation.mutate({ id: emailModal.billId, email: emailInput })}
                disabled={emailMutation.isPending || !emailInput}
                className="btn-primary flex-1"
              >
                {emailMutation.isPending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Detail */}
      {selectedBill && (
        <div className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">{selectedBill.billNumber}</h3>
            <button onClick={() => setSelectedBill(null)} className="btn-ghost p-1"><XCircle size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isDetailLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" /></div>
            ) : billDetail ? (
              <>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-900 dark:text-slate-400">Date</span><span>{dayjs(billDetail.createdAt || billDetail.issuedAt).format('D MMM YYYY, h:mm A')}</span></div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-900 dark:text-slate-400">Customer</span>
                    <span className="capitalize">
                      {billDetail.customerName 
                        ? billDetail.customerName 
                        : billDetail.order?.table 
                          ? `Table ${billDetail.order.table.tableNumber}` 
                          : billDetail.order?.orderType 
                            ? billDetail.order.orderType.replace('_', ' ') 
                            : 'Walk-in'}
                    </span>
                  </div>

                  {billDetail.customerGstin && <div className="flex justify-between"><span className="text-slate-900 dark:text-slate-400">GSTIN</span><span className="font-mono text-xs">{billDetail.customerGstin}</span></div>}
                </div>

                <div className="space-y-1">
                  {billDetail.order?.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{item.quantity}× {item.menuItem?.name || item.name}</span>
                      <span className="text-slate-900 dark:text-white font-medium">₹{Number(item.lineTotal).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-300 dark:border-slate-700 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-900 dark:text-slate-400"><span>Subtotal</span><span>₹{Number(billDetail.subtotal).toFixed(2)}</span></div>
                  {Number(billDetail.discountAmount) > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Discount</span><span>-₹{Number(billDetail.discountAmount).toFixed(2)}</span></div>}
                  <div className="flex justify-between text-slate-900 dark:text-slate-400"><span>GST</span><span>₹{Number(billDetail.totalTax).toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold text-base border-t border-slate-300 dark:border-slate-700 pt-2"><span>Grand Total</span><span>₹{Number(billDetail.grandTotal).toFixed(2)}</span></div>
                </div>

                {billDetail.payments?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-900 dark:text-slate-500 uppercase tracking-wide">Payments</div>
                    {billDetail.payments.map((p: any) => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span className="badge-slate capitalize">{p.method}</span>
                        <span>₹{Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => reprintMutation.mutate(selectedBill.id)}
                disabled={reprintMutation.isPending}
                className="btn-secondary text-xs"
              >
                <Printer size={13} /> Reprint
              </button>
              <button
                onClick={() => { setEmailInput(billDetail?.customerEmail || ''); setEmailModal({ billId: selectedBill.id, billNumber: selectedBill.billNumber }); }}
                className="btn-secondary text-xs"
              >
                <Mail size={13} /> Email
              </button>
            </div>
            {selectedBill.status !== 'void' && (
              <button onClick={() => { const r = prompt('Void reason?'); if (r) voidMutation.mutate({ id: selectedBill.id, reason: r }); }} className="btn-danger w-full text-sm">
                <XCircle size={14} /> Void Bill
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}