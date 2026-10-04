// 'use client';
// import { useState, useEffect } from 'react';
// import { useMutation } from '@tanstack/react-query';
// import toast from 'react-hot-toast';
// import { apiPost, apiPatch, apiFetch, api } from '@/lib/api';
// import { enqueueSync, getResolvedId, getPendingSyncItems } from '@/lib/offline';
// import { useAuthStore } from '@/store/auth.store';
// import { usePosStore } from '@/store/pos.store';
// import { useOnlineStatus } from '@/hooks/useOnlineStatus';
// import { printHtml } from '@/lib/printer';
// import { amountInWords } from '@/lib/gst';
// import { X, Printer, CheckCircle, Loader2, Mail, WifiOff } from 'lucide-react';
// import { cn } from '@/lib/utils';

// type PayMethod = 'cash' | 'card' | 'upi' | 'wallet' | 'credit' | 'complimentary';

// // Methods that require Razorpay (online only)
// const RAZORPAY_METHODS: PayMethod[] = ['upi', 'card', 'credit'];

// const PAYMENT_METHODS: { id: PayMethod; label: string; icon: string }[] = [
//   { id: 'cash',          label: 'Cash',   icon: '💵' },
//   { id: 'upi',           label: 'UPI',    icon: '📱' },
//   { id: 'card',          label: 'Card',   icon: '💳' },
//   { id: 'wallet',        label: 'Wallet', icon: '👛' },
//   { id: 'credit',        label: 'Credit', icon: '📋' },
//   { id: 'complimentary', label: 'Comp',   icon: '🎁' },
// ];

// function round2(n: number): number {
//   return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
// }

// function nearestRupee(n: number): number {
//   return Math.round(round2(n));
// }

// function formatInputAmount(n: number): string {
//   return Number.isInteger(n) ? String(n) : n.toFixed(2);
// }

// // Dynamically load Razorpay SDK to prevent 'Razorpay is undefined' crashes
// const loadRazorpayScript = () => {
//   return new Promise((resolve) => {
//     if (typeof window !== 'undefined' && (window as any).Razorpay) {
//       resolve(true);
//       return;
//     }
//     const script = document.createElement('script');
//     script.src = 'https://checkout.razorpay.com/v1/checkout.js';
//     script.onload = () => resolve(true);
//     script.onerror = () => resolve(false);
//     document.body.appendChild(script);
//   });
// };

// interface Props {
//   shiftId?: string | null;
//   grandTotal: number;
//   subtotal: number;
//   gstTotal: number;
//   orderId: string | null;
//   onClose: () => void;
//   onSuccess: () => void;
// }

// export function BillingModal({
//   shiftId,
//   grandTotal: rawGrandTotal,
//   subtotal: rawSubtotal,
//   gstTotal: rawGstTotal,
//   orderId,
//   onClose,
//   onSuccess,
// }: Props) {
//   const { branchId, tenantId } = useAuthStore();
//   const { cart, orderType, tableId, tableName, discountAmount, discountPercent } = usePosStore();
//   const isOnline = useOnlineStatus();

//   // Exact amounts from POS
//   const exactGrandTotal = round2(rawGrandTotal);
//   const subtotal = round2(rawSubtotal);
//   const gstTotal = round2(rawGstTotal);

//   // Default billing behavior: nearest rupee
//   const defaultPayable = nearestRupee(exactGrandTotal);
//   const defaultRoundOff = round2(defaultPayable - exactGrandTotal);

//   const [method, setMethod] = useState<PayMethod>('cash');
//   const [customerName, setCustomerName] = useState('');
//   const [customerPhone, setCustomerPhone] = useState('');
//   const [customerGstin, setCustomerGstin] = useState('');
//   const [splitPayments, setSplitPayments] = useState<Array<{ method: PayMethod; amount: number }>>([]);
//   const [isSplit, setIsSplit] = useState(false);
//   const [splitAmounts, setSplitAmounts] = useState<Partial<Record<PayMethod, string>>>({});
//   const [billed, setBilled] = useState(false);
//   const [billData, setBillData] = useState<any>(null);
//   const [customerEmail, setCustomerEmail] = useState('');
//   const [isRazorpayPending, setIsRazorpayPending] = useState(false);

//   // Bill amount cashier will charge
//   const [finalTotal, setFinalTotal] = useState<number>(defaultPayable);
//   const [manualOverride, setManualOverride] = useState(false);

//   // Cash tendered defaults to payable amount
//   const [cashEntered, setCashEntered] = useState<string>(formatInputAmount(defaultPayable));

//   // Auto-sync the totals if the parent component updates the math in the background!
//   useEffect(() => {
//     if (!manualOverride) {
//       setFinalTotal(defaultPayable);
//       setCashEntered(formatInputAmount(defaultPayable));
//     }
//   }, [defaultPayable, manualOverride]);

//   const cashAmount = round2(parseFloat(cashEntered) || 0);
//   const totalSplitPaid = Object.values(splitAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
//   const change = isSplit ? round2(totalSplitPaid - finalTotal) : round2(cashAmount - finalTotal);

//   const isRazorpayMethod = RAZORPAY_METHODS.includes(method) && !isSplit;

//   const handleMethodSelect = (m: PayMethod) => {
//     if (!isOnline && RAZORPAY_METHODS.includes(m)) {
//       toast.error(`${m.toUpperCase()} payment requires internet. Use Cash when offline.`);
//       return;
//     }
//     setMethod(m);
//     // Reset cash entered to final total when switching methods
//     setCashEntered(formatInputAmount(finalTotal));
//   };

//   const handleSplitChange = (mId: PayMethod, val: string) => {
//     setSplitAmounts(prev => ({ ...prev, [mId]: val }));
//   };

//   const fillRemainingSplit = (mId: PayMethod) => {
//     const currentPaidOtherMethods = totalSplitPaid - (parseFloat(splitAmounts[mId] || '0'));
//     const remaining = Math.max(0, finalTotal - currentPaidOtherMethods);
//     if (remaining > 0) {
//       handleSplitChange(mId, remaining.toFixed(2));
//     }
//   };

//   const createBillCore = async (razorpayPaymentId?: string) => {
//     const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
//     let oid = orderId;
//     const isNewOrder = !oid;

//     if (oid?.startsWith('OFFLINE-')) {
//       const resolved = await getResolvedId(oid);
//       if (resolved) oid = resolved;
//     }

//     if (!oid) {
//       const payload = {
//         type: orderType,
//         tableId,
//         items: cart.map((i: any) => ({
//           menuItemId: i.id,
//           quantity: i.qty,
//           notes: i.notes,
//           variationId: i.variationId ?? undefined,
//         })),
//       };

//       if (isOffline) {
//         oid = `OFFLINE-${Date.now()}`;
//         await enqueueSync({
//           entityType: 'orders',
//           entityId: oid,
//           operation: 'create',
//           payload: { ...payload, isOfflineSync: true, offlineId: oid },
//           branchId: branchId || '',
//           tenantId: tenantId || '',
//         });
//       } else {
//         const orderRes = await apiPost('/api/v1/orders', payload);
//         oid = orderRes.data.id;
//       }
//     }

//     if ((discountPercent > 0 || discountAmount > 0) && oid) {
//       const discountPayload = { discountPercent, discountAmount };
//       if (isOffline) {
//         await enqueueSync({
//           entityType: `orders/${oid}/discount`,
//           entityId: '',
//           operation: 'update',
//           payload: { ...discountPayload, _isDiscount: true },
//           branchId: branchId || '',
//           tenantId: tenantId || '',
//         });
//       } else {
//         await apiPatch(`/api/v1/orders/${oid}/discount`, discountPayload);
//       }
//     }

//     let serverGrandTotal = defaultPayable;
//     if (!isOffline && oid && !oid.startsWith('OFFLINE-')) {
//       try {
//         const orderRes = await apiFetch(`/api/v1/orders/${oid}`);
//         serverGrandTotal = round2(Number(orderRes.data.grandTotal));
//       } catch { /* fallback */ }
//     }

//     const billAmount = manualOverride ? round2(finalTotal) : serverGrandTotal;
//     setFinalTotal(billAmount);

//     const payments = isSplit
//       ? Object.entries(splitAmounts)
//         .filter(([_, amt]) => (parseFloat(amt as string) || 0) > 0)
//         .map(([m, amt]) => ({ method: m as PayMethod, amount: round2(parseFloat(amt as string)) }))
//       : [
//           {
//             method,
//             amount: method === 'cash' ? round2(parseFloat(cashEntered) || 0) : billAmount,
//             ...(razorpayPaymentId ? { referenceNo: razorpayPaymentId } : {}),
//           },
//         ];

//     const totalPaidValidation = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
//     if (totalPaidValidation < billAmount - 0.01) {
//       throw new Error(`Payment is less than bill amount. Please adjust.`);
//     }

//     const billPayload = {
//       orderId: oid,
//       branchId,
//       tenantId,
//       shiftId: shiftId || undefined,
//       customerName: customerName || undefined,
//       customerPhone: customerPhone || undefined,
//       customerGstin: customerGstin || undefined,
//       payments,
//     };

//     if (isOffline) {
//       const unsentItems = cart.filter((i: any) => !i.alreadySent);
//       if (!isNewOrder && unsentItems.length > 0 && oid) {
//         await enqueueSync({
//           entityType: `orders/${oid}/items`,
//           entityId: '',
//           operation: 'create',
//           payload: {
//             items: unsentItems.map((i: any) => ({
//               menuItemId:  i.id,
//               quantity:    i.qty,
//               notes:       i.notes   || undefined,
//               variationId: i.variationId || undefined,
//             })),
//             isOfflineSync: true,
//           },
//           branchId: branchId || '',
//           tenantId: tenantId || '',
//         });
//       }

//       await enqueueSync({
//         entityType: 'billing/bills',
//         entityId: oid!,
//         operation: 'create',
//         payload: { ...billPayload, isOfflineSync: true },
//         branchId: branchId || '',
//         tenantId: tenantId || '',
//       });

//       return {
//         id: oid!,
//         billNumber: `OFF-${Math.floor(Math.random() * 10000)}`,
//         serverGrandTotal: billAmount,
//         gstSummary: [],
//         payments,
//       };
//     }

//     const res = await apiPost('/api/v1/billing/bills', billPayload);
//     return { ...res.data, serverGrandTotal: billAmount, payments };
//   };

//   const billMutation = useMutation({
//     networkMode: 'always',
//     mutationFn: async () => {
//       if (isRazorpayMethod && isOnline) {
//         return new Promise<any>(async (resolve, reject) => {
//           setIsRazorpayPending(true);
//           const isLoaded = await loadRazorpayScript();
//           if (!isLoaded) {
//             setIsRazorpayPending(false);
//             return reject(new Error('Razorpay SDK failed to load. Check internet.'));
//           }

//           api.post('/api/v1/billing/razorpay/create-order', { amount: finalTotal })
//             .then((res) => {
//               const order = res.data?.data || res.data;
//               const options = {
//                 key: order.keyId,
//                 amount: order.amount,
//                 currency: order.currency,
//                 name: 'Bill Payment',
//                 description: `POS Bill`,
//                 order_id: order.orderId,
//                 handler: async (response: any) => {
//                   try {
//                     await api.post('/api/v1/billing/razorpay/verify-payment', {
//                       razorpayOrderId: response.razorpay_order_id,
//                       razorpayPaymentId: response.razorpay_payment_id,
//                       razorpaySignature: response.razorpay_signature,
//                     });
//                     const bill = await createBillCore(response.razorpay_payment_id);
//                     resolve(bill);
//                   } catch (e) {
//                     reject(e);
//                   } finally {
//                     setIsRazorpayPending(false);
//                   }
//                 },
//                 modal: {
//                   ondismiss: () => {
//                     setIsRazorpayPending(false);
//                     reject(new Error('Payment was cancelled.'));
//                   },
//                 },
//                 theme: { color: '#f59e0b' },
//               };
//               const rzp = new (window as any).Razorpay(options);
//               rzp.on('payment.failed', (response: any) => {
//                 setIsRazorpayPending(false);
//                 reject(new Error(response.error?.description || 'Payment failed'));
//               });
//               rzp.open();
//             })
//             .catch((e) => {
//               setIsRazorpayPending(false);
//               reject(e);
//             });
//         });
//       }
//       return createBillCore();
//     },
//     onSuccess: (data) => {
//       setBillData(data);
//       setFinalTotal(round2(data.serverGrandTotal));
//       setBilled(true);
//       toast.success('Bill created successfully!');

//       if (customerEmail.trim() && data?.id && !data.id.startsWith('OFFLINE-')) {
//         apiPost(`/api/v1/billing/bills/${data.id}/email`, { email: customerEmail.trim() })
//           .then(() => toast.success('Receipt emailed to ' + customerEmail.trim()))
//           .catch(() => toast.error('Could not send email receipt.'));
//       }
//     },
//     onError: (err: any) => {
//       const msg = err?.response?.data?.message || err?.message || 'Billing failed';
//       toast.error(msg);
//     },
//   });

//   const handlePrint = () => {
//     if (!billData) return;
//     try {
//       printHtml({
//         restaurantName: 'Dine&Stay Restaurant',
//         billNumber: billData.billNumber,
//         invoiceDate: new Date().toLocaleString('en-IN'),
//         tableName: tableName || undefined,
//         orderType,
//         customerName: customerName || undefined,
//         customerGstin: customerGstin || undefined,
//         items: cart.map((i: any) => ({
//           name: i.name,
//           qty: i.qty,
//           rate: round2(i.price),
//           amount: round2(i.price * i.qty),
//         })),
//         subtotal,
//         discountAmount: round2(discountAmount),
//         totalTax: gstTotal,
//         grandTotal: round2(finalTotal),
//         payments: billData.payments || [],
//         changeAmount: Math.max(0, change),
//         gstSummary: billData.gstSummary,
//       });
//     } catch (err) {
//       console.error('Print failed:', err);
//       toast.error('Print failed.');
//     }
//   };

//   const isPending = billMutation.isPending || isRazorpayPending;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
//       <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
//           <h2 className="text-lg font-bold text-slate-900 dark:text-white">
//             {billed ? 'Bill Generated ✓' : 'Generate Bill'}
//           </h2>
//           <button onClick={billed ? onSuccess : onClose} className="btn-ghost p-1">
//             <X size={18} />
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto">
//           {billed ? (
//             <div className="p-6 space-y-4">
//               <div className="flex flex-col items-center gap-3 py-4">
//                 <CheckCircle size={48} className="text-emerald-600 dark:text-emerald-400" />
//                 <div className="text-center">
//                   <div className="text-slate-900 dark:text-white font-bold text-xl">₹{round2(finalTotal).toFixed(2)}</div>
//                   <div className="text-slate-900 dark:text-slate-400 text-sm">Bill #{billData?.billNumber}</div>
//                   {change > 0 && (
//                     <div className="mt-2 text-amber-600 dark:text-amber-400 font-semibold text-lg">
//                       Change to return: ₹{round2(change).toFixed(2)}
//                     </div>
//                   )}
//                 </div>
//                 <div className="text-xs text-slate-900 dark:text-slate-500 text-center">
//                   {amountInWords(round2(finalTotal))}
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 <button onClick={handlePrint} className="btn-secondary">
//                   <Printer size={14} /> Print Receipt
//                 </button>
//                 <button onClick={onSuccess} className="btn-primary">
//                   Done
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <div className="p-6 space-y-5">
//               {!isOnline && (
//                 <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
//                   <WifiOff size={13} />
//                   <span>You are offline — Razorpay is disabled.</span>
//                 </div>
//               )}

//               {/* Summary */}
//               <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
//                 <div className="flex justify-between text-slate-900 dark:text-slate-400">
//                   <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
//                 </div>
//                 {discountAmount > 0 && (
//                   <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
//                     <span>Discount ({discountPercent}%)</span><span>-₹{round2(discountAmount).toFixed(2)}</span>
//                   </div>
//                 )}
//                 <div className="flex justify-between text-slate-900 dark:text-slate-400">
//                   <span>GST</span><span>₹{gstTotal.toFixed(2)}</span>
//                 </div>
//                 {defaultRoundOff !== 0 && !manualOverride && (
//                   <div className="flex justify-between text-slate-900 dark:text-slate-400">
//                     <span>Round Off</span><span>{defaultRoundOff > 0 ? '+' : ''}₹{Math.abs(defaultRoundOff).toFixed(2)}</span>
//                   </div>
//                 )}
//                 <div className="flex justify-between text-slate-900 dark:text-white font-bold text-base border-t border-slate-300 dark:border-slate-700 pt-2">
//                   <span>Grand Total</span><span>₹{round2(finalTotal).toFixed(2)}</span>
//                 </div>
//               </div>

//               {/* Charge Override */}
//               <div>
//                 <label className="label">Charge Amount <span className="text-slate-900 dark:text-slate-500 font-normal ml-1">(edit if needed)</span></label>
//                 <div className="relative">
//                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-400 text-sm">₹</span>
//                   <input
//                     className="input pl-7 text-lg font-bold"
//                     type="number" min={0} step={0.01}
//                     value={formatInputAmount(finalTotal)}
//                     onChange={(e) => {
//                       const val = round2(parseFloat(e.target.value) || 0);
//                       setFinalTotal(val); setManualOverride(true); setCashEntered(formatInputAmount(val));
//                     }}
//                   />
//                 </div>
//                 {manualOverride && (
//                   <button
//                     className="text-xs text-slate-900 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 mt-1"
//                     onClick={() => { setFinalTotal(defaultPayable); setManualOverride(false); setCashEntered(formatInputAmount(defaultPayable)); }}
//                   >
//                     Reset to ₹{defaultPayable.toFixed(2)}
//                   </button>
//                 )}
//               </div>

//               {/* Customer Info */}
//               <div className="grid grid-cols-2 gap-3">
//                 <div><label className="label">Customer Name</label><input className="input" placeholder="Optional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
//                 <div><label className="label">Phone</label><input className="input" placeholder="Optional" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
//                 <div>
//                   <label className="label">Email <span className="text-slate-900 dark:text-slate-500 font-normal">(for receipt)</span></label>
//                   <div className="relative"><Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-500" /><input className="input pl-8" type="email" placeholder="Optional" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div>
//                 </div>
//                 <div><label className="label">GSTIN <span className="text-slate-900 dark:text-slate-500 font-normal">(B2B)</span></label><input className="input" placeholder="Optional" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} /></div>
//               </div>

//               {/* Payments */}
//               <div>
//                 <div className="flex items-center justify-between mb-2">
//                   <label className="label mb-0">Payment Method</label>
//                   <button onClick={() => setIsSplit(!isSplit)} className={cn('text-xs px-2 py-1 rounded font-medium', isSplit ? 'bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400')}>
//                     {isSplit ? 'Cancel Split' : 'Split Payment'}
//                   </button>
//                 </div>

//                 {isSplit ? (
//                   <div className="space-y-2 mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
//                     {PAYMENT_METHODS.map((m) => {
//                       const isBlocked = !isOnline && RAZORPAY_METHODS.includes(m.id);
//                       return (
//                         <div key={m.id} className="flex items-center justify-between p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
//                           <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
//                             <span>{m.icon}</span> <span className={isBlocked ? 'text-slate-400' : ''}>{m.label}</span>
//                             {isBlocked && <span className="text-[10px] text-red-500">(Offline)</span>}
//                           </div>
//                           <div className="flex items-center gap-2">
//                             {!isBlocked && <button onClick={() => fillRemainingSplit(m.id)} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-600 px-2 py-1 rounded">MAX</button>}
//                             <input type="number" min="0" step="0.01" disabled={isBlocked} className="input w-28 text-right font-medium" placeholder="0.00" value={splitAmounts[m.id] || ''} onChange={(e) => handleSplitChange(m.id, e.target.value)} />
//                           </div>
//                         </div>
//                       );
//                     })}
//                     <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 font-medium">
//                       <span className="text-slate-700 dark:text-slate-300">Total Paid:</span>
//                       <span className={totalSplitPaid < finalTotal - 0.01 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>₹{totalSplitPaid.toFixed(2)}</span>
//                     </div>
//                   </div>
//                 ) : (
//                   <>
//                     <div className="grid grid-cols-3 gap-2">
//                       {PAYMENT_METHODS.map((m) => {
//                         const isBlocked = !isOnline && RAZORPAY_METHODS.includes(m.id);
//                         return (
//                           <button key={m.id} onClick={() => handleMethodSelect(m.id)} disabled={isBlocked} className={cn('flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium border relative', isBlocked ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed opacity-50' : method === m.id ? 'border-amber-500 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-400 hover:border-slate-300 dark:border-slate-600')}>
//                             <span className="text-lg">{m.icon}</span>{m.label}
//                             {isBlocked && <WifiOff size={10} className="absolute top-1 right-1 text-slate-400" />}
//                           </button>
//                         );
//                       })}
//                     </div>
//                     {method === 'cash' && (
//                       <div className="mt-4">
//                         <label className="label">Cash Tendered</label>
//                         <input 
//                           className="input text-lg font-bold" 
//                           type="number" 
//                           min="0"
//                           step="0.01"
//                           value={cashEntered} 
//                           onChange={(e) => {
//                             const val = e.target.value;
//                             if (val === '' || parseFloat(val) >= 0) {
//                               setCashEntered(val);
//                             }
//                           }} 
//                         />
//                         {change >= 0 ? <div className="mt-1 text-sm text-amber-600 font-medium">Change: ₹{round2(change).toFixed(2)}</div> : <div className="mt-1 text-sm text-red-600 font-medium">Short by ₹{Math.abs(round2(change)).toFixed(2)}</div>}
//                         <div className="flex gap-2 mt-2 flex-wrap">
//                           {[round2(finalTotal), Math.ceil(finalTotal / 10) * 10, Math.ceil(finalTotal / 50) * 50, Math.ceil(finalTotal / 100) * 100, Math.ceil(finalTotal / 500) * 500].filter((v, i, arr) => arr.indexOf(v) === i).map((amt) => (
//                             <button key={amt} onClick={() => setCashEntered(formatInputAmount(amt))} className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">₹{amt}</button>
//                           ))}
//                         </div>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>

//         {!billed && (
//           <div className="px-6 pb-6 pt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
//             <button
//               onClick={() => billMutation.mutate()}
//               disabled={isPending || (!isOnline && RAZORPAY_METHODS.includes(method) && !isSplit) || (!isSplit && method === 'cash' && cashAmount < finalTotal - 0.01) || (isSplit && totalSplitPaid < finalTotal - 0.01)}
//               className="btn-primary w-full py-3 text-base"
//             >
//               {isPending ? <><Loader2 size={16} className="animate-spin" /> {isRazorpayPending ? 'Waiting for payment...' : 'Processing...'}</> : `Collect ₹${round2(finalTotal).toFixed(2)}`}
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

'use client';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiPost, apiPatch, apiFetch, api } from '@/lib/api';
import { enqueueSync, getResolvedId, getPendingSyncItems } from '@/lib/offline';
import { useAuthStore } from '@/store/auth.store';
import { usePosStore } from '@/store/pos.store';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { printHtml } from '@/lib/printer';
import { amountInWords } from '@/lib/gst';
import { X, Printer, CheckCircle, Loader2, Mail, WifiOff, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

// 🟢 NEW: Added 'room_charge'
type PayMethod = 'cash' | 'card' | 'upi' | 'wallet' | 'credit' | 'complimentary' | 'room_charge';

// Methods that require Razorpay (online only)
const RAZORPAY_METHODS: PayMethod[] = ['upi', 'card', 'credit'];

// 🟢 NEW: Added the 'Room' payment button
const PAYMENT_METHODS: { id: PayMethod; label: string; icon: string }[] = [
  { id: 'cash',          label: 'Cash',   icon: '💵' },
  { id: 'upi',           label: 'UPI',    icon: '📱' },
  { id: 'card',          label: 'Card',   icon: '💳' },
  { id: 'room_charge',   label: 'Room',   icon: '🏨' },
  { id: 'wallet',        label: 'Wallet', icon: '👛' },
  { id: 'credit',        label: 'Credit', icon: '📋' },
  { id: 'complimentary', label: 'Comp',   icon: '🎁' },
];

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function nearestRupee(n: number): number {
  return Math.round(round2(n));
}

function formatInputAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// Dynamically load Razorpay SDK to prevent 'Razorpay is undefined' crashes
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface Props {
  shiftId?: string | null;
  grandTotal: number;
  subtotal: number;
  gstTotal: number;
  orderId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function BillingModal({
  shiftId,
  grandTotal: rawGrandTotal,
  subtotal: rawSubtotal,
  gstTotal: rawGstTotal,
  orderId,
  onClose,
  onSuccess,
}: Props) {
  const { branchId, tenantId } = useAuthStore();
  const { cart, orderType, tableId, tableName, discountAmount, discountPercent } = usePosStore();
  const isOnline = useOnlineStatus();

  // Exact amounts from POS
  const exactGrandTotal = round2(rawGrandTotal);
  const subtotal = round2(rawSubtotal);
  const gstTotal = round2(rawGstTotal);

  // Default billing behavior: nearest rupee
  const defaultPayable = nearestRupee(exactGrandTotal);
  const defaultRoundOff = round2(defaultPayable - exactGrandTotal);

  const [method, setMethod] = useState<PayMethod>('cash');
  
  // 🟢 NEW: State for the Room Number
  const [roomNumber, setRoomNumber] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PayMethod; amount: number }>>([]);
  const [isSplit, setIsSplit] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Partial<Record<PayMethod, string>>>({});
  const [billed, setBilled] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isRazorpayPending, setIsRazorpayPending] = useState(false);

  // Bill amount cashier will charge
  const [finalTotal, setFinalTotal] = useState<number>(defaultPayable);
  const [manualOverride, setManualOverride] = useState(false);

  // Cash tendered defaults to payable amount
  const [cashEntered, setCashEntered] = useState<string>(formatInputAmount(defaultPayable));

  // Auto-sync the totals if the parent component updates the math in the background!
  useEffect(() => {
    if (!manualOverride) {
      setFinalTotal(defaultPayable);
      setCashEntered(formatInputAmount(defaultPayable));
    }
  }, [defaultPayable, manualOverride]);

  const cashAmount = round2(parseFloat(cashEntered) || 0);
  const totalSplitPaid = Object.values(splitAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const change = isSplit ? round2(totalSplitPaid - finalTotal) : round2(cashAmount - finalTotal);

  const isRazorpayMethod = RAZORPAY_METHODS.includes(method) && !isSplit;

  const handleMethodSelect = (m: PayMethod) => {
    if (!isOnline && RAZORPAY_METHODS.includes(m)) {
      toast.error(`${m.toUpperCase()} payment requires internet. Use Cash when offline.`);
      return;
    }
    setMethod(m);
    // Reset cash entered to final total when switching methods
    setCashEntered(formatInputAmount(finalTotal));
  };

  const handleSplitChange = (mId: PayMethod, val: string) => {
    setSplitAmounts(prev => ({ ...prev, [mId]: val }));
  };

  const fillRemainingSplit = (mId: PayMethod) => {
    const currentPaidOtherMethods = totalSplitPaid - (parseFloat(splitAmounts[mId] || '0'));
    const remaining = Math.max(0, finalTotal - currentPaidOtherMethods);
    if (remaining > 0) {
      handleSplitChange(mId, remaining.toFixed(2));
    }
  };

  const createBillCore = async (razorpayPaymentId?: string) => {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    let oid = orderId;
    const isNewOrder = !oid;

    if (oid?.startsWith('OFFLINE-')) {
      const resolved = await getResolvedId(oid);
      if (resolved) oid = resolved;
    }

    if (!oid) {
      const payload = {
        type: orderType,
        tableId,
        items: cart.map((i: any) => ({
          menuItemId: i.id,
          quantity: i.qty,
          notes: i.notes,
          variationId: i.variationId ?? undefined,
        })),
      };

      if (isOffline) {
        oid = `OFFLINE-${Date.now()}`;
        await enqueueSync({
          entityType: 'orders',
          entityId: oid,
          operation: 'create',
          payload: { ...payload, isOfflineSync: true, offlineId: oid },
          branchId: branchId || '',
          tenantId: tenantId || '',
        });
      } else {
        const orderRes = await apiPost('/api/v1/orders', payload);
        oid = orderRes.data.id;
      }
    }

    if ((discountPercent > 0 || discountAmount > 0) && oid) {
      const discountPayload = { discountPercent, discountAmount };
      if (isOffline) {
        await enqueueSync({
          entityType: `orders/${oid}/discount`,
          entityId: '',
          operation: 'update',
          payload: { ...discountPayload, _isDiscount: true },
          branchId: branchId || '',
          tenantId: tenantId || '',
        });
      } else {
        await apiPatch(`/api/v1/orders/${oid}/discount`, discountPayload);
      }
    }

    let serverGrandTotal = defaultPayable;
    if (!isOffline && oid && !oid.startsWith('OFFLINE-')) {
      try {
        const orderRes = await apiFetch(`/api/v1/orders/${oid}`);
        serverGrandTotal = round2(Number(orderRes.data.grandTotal));
      } catch { /* fallback */ }
    }

    const billAmount = manualOverride ? round2(finalTotal) : serverGrandTotal;
    setFinalTotal(billAmount);

    const payments = isSplit
      ? Object.entries(splitAmounts)
        .filter(([_, amt]) => (parseFloat(amt as string) || 0) > 0)
        .map(([m, amt]) => ({ method: m as PayMethod, amount: round2(parseFloat(amt as string)) }))
      : [
          {
            method,
            amount: method === 'cash' ? round2(parseFloat(cashEntered) || 0) : billAmount,
            ...(razorpayPaymentId ? { referenceNo: razorpayPaymentId } : {}),
            // 🟢 NEW: Assign Room Number to referenceNo if room_charge is selected
            ...(method === 'room_charge' ? { referenceNo: roomNumber } : {}),
          },
        ];

    const totalPaidValidation = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (totalPaidValidation < billAmount - 0.01) {
      throw new Error(`Payment is less than bill amount. Please adjust.`);
    }

    const billPayload = {
      orderId: oid,
      branchId,
      tenantId,
      shiftId: shiftId || undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerGstin: customerGstin || undefined,
      payments,
    };

    if (isOffline) {
      const unsentItems = cart.filter((i: any) => !i.alreadySent);
      if (!isNewOrder && unsentItems.length > 0 && oid) {
        await enqueueSync({
          entityType: `orders/${oid}/items`,
          entityId: '',
          operation: 'create',
          payload: {
            items: unsentItems.map((i: any) => ({
              menuItemId:  i.id,
              quantity:    i.qty,
              notes:       i.notes   || undefined,
              variationId: i.variationId || undefined,
            })),
            isOfflineSync: true,
          },
          branchId: branchId || '',
          tenantId: tenantId || '',
        });
      }

      await enqueueSync({
        entityType: 'billing/bills',
        entityId: oid!,
        operation: 'create',
        payload: { ...billPayload, isOfflineSync: true },
        branchId: branchId || '',
        tenantId: tenantId || '',
      });

      return {
        id: oid!,
        billNumber: `OFF-${Math.floor(Math.random() * 10000)}`,
        serverGrandTotal: billAmount,
        gstSummary: [],
        payments,
      };
    }

    const res = await apiPost('/api/v1/billing/bills', billPayload);
    return { ...res.data, serverGrandTotal: billAmount, payments };
  };

  const billMutation = useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      // 🟢 Prevent submitting if Room Charge is selected but no room is entered
      if (method === 'room_charge' && !roomNumber.trim() && !isSplit) {
          throw new Error('Please enter a room number to charge this bill to.');
      }
      if (isSplit && splitAmounts['room_charge'] && parseFloat(splitAmounts['room_charge']) > 0 && !roomNumber.trim()){
           throw new Error('Please enter a room number to charge this bill to.');
      }

      if (isRazorpayMethod && isOnline) {
        return new Promise<any>(async (resolve, reject) => {
          setIsRazorpayPending(true);
          const isLoaded = await loadRazorpayScript();
          if (!isLoaded) {
            setIsRazorpayPending(false);
            return reject(new Error('Razorpay SDK failed to load. Check internet.'));
          }

          api.post('/api/v1/billing/razorpay/create-order', { amount: finalTotal })
            .then((res) => {
              const order = res.data?.data || res.data;
              const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'Bill Payment',
                description: `POS Bill`,
                order_id: order.orderId,
                handler: async (response: any) => {
                  try {
                    await api.post('/api/v1/billing/razorpay/verify-payment', {
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    });
                    const bill = await createBillCore(response.razorpay_payment_id);
                    resolve(bill);
                  } catch (e) {
                    reject(e);
                  } finally {
                    setIsRazorpayPending(false);
                  }
                },
                modal: {
                  ondismiss: () => {
                    setIsRazorpayPending(false);
                    reject(new Error('Payment was cancelled.'));
                  },
                },
                theme: { color: '#f59e0b' },
              };
              const rzp = new (window as any).Razorpay(options);
              rzp.on('payment.failed', (response: any) => {
                setIsRazorpayPending(false);
                reject(new Error(response.error?.description || 'Payment failed'));
              });
              rzp.open();
            })
            .catch((e) => {
              setIsRazorpayPending(false);
              reject(e);
            });
        });
      }
      return createBillCore();
    },
    onSuccess: (data) => {
      setBillData(data);
      setFinalTotal(round2(data.serverGrandTotal));
      setBilled(true);
      toast.success('Bill created successfully!');

      if (customerEmail.trim() && data?.id && !data.id.startsWith('OFFLINE-')) {
        apiPost(`/api/v1/billing/bills/${data.id}/email`, { email: customerEmail.trim() })
          .then(() => toast.success('Receipt emailed to ' + customerEmail.trim()))
          .catch(() => toast.error('Could not send email receipt.'));
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Billing failed';
      toast.error(msg);
    },
  });

  const handlePrint = () => {
    if (!billData) return;
    try {
      printHtml({
        restaurantName: 'Dine&Stay Restaurant',
        billNumber: billData.billNumber,
        invoiceDate: new Date().toLocaleString('en-IN'),
        tableName: tableName || undefined,
        orderType,
        customerName: customerName || undefined,
        customerGstin: customerGstin || undefined,
        items: cart.map((i: any) => ({
          name: i.name,
          qty: i.qty,
          rate: round2(i.price),
          amount: round2(i.price * i.qty),
        })),
        subtotal,
        discountAmount: round2(discountAmount),
        totalTax: gstTotal,
        grandTotal: round2(finalTotal),
        payments: billData.payments || [],
        changeAmount: Math.max(0, change),
        gstSummary: billData.gstSummary,
      });
    } catch (err) {
      console.error('Print failed:', err);
      toast.error('Print failed.');
    }
  };

  const isPending = billMutation.isPending || isRazorpayPending;
  const isRoomChargeBlocked = (method === 'room_charge' && !roomNumber.trim() && !isSplit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {billed ? 'Bill Generated ✓' : 'Generate Bill'}
          </h2>
          <button onClick={billed ? onSuccess : onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {billed ? (
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle size={48} className="text-emerald-600 dark:text-emerald-400" />
                <div className="text-center">
                  <div className="text-slate-900 dark:text-white font-bold text-xl">₹{round2(finalTotal).toFixed(2)}</div>
                  <div className="text-slate-900 dark:text-slate-400 text-sm">Bill #{billData?.billNumber}</div>
                  {change > 0 && (
                    <div className="mt-2 text-amber-600 dark:text-amber-400 font-semibold text-lg">
                      Change to return: ₹{round2(change).toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-900 dark:text-slate-500 text-center">
                  {amountInWords(round2(finalTotal))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handlePrint} className="btn-secondary">
                  <Printer size={14} /> Print Receipt
                </button>
                <button onClick={onSuccess} className="btn-primary">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {!isOnline && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  <WifiOff size={13} />
                  <span>You are offline — Razorpay is disabled.</span>
                </div>
              )}

              {/* Summary */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-900 dark:text-slate-400">
                  <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({discountPercent}%)</span><span>-₹{round2(discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 dark:text-slate-400">
                  <span>GST</span><span>₹{gstTotal.toFixed(2)}</span>
                </div>
                {defaultRoundOff !== 0 && !manualOverride && (
                  <div className="flex justify-between text-slate-900 dark:text-slate-400">
                    <span>Round Off</span><span>{defaultRoundOff > 0 ? '+' : ''}₹{Math.abs(defaultRoundOff).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 dark:text-white font-bold text-base border-t border-slate-300 dark:border-slate-700 pt-2">
                  <span>Grand Total</span><span>₹{round2(finalTotal).toFixed(2)}</span>
                </div>
              </div>

              {/* Charge Override */}
              <div>
                <label className="label">Charge Amount <span className="text-slate-900 dark:text-slate-500 font-normal ml-1">(edit if needed)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-400 text-sm">₹</span>
                  <input
                    className="input pl-7 text-lg font-bold"
                    type="number" min={0} step={0.01}
                    value={formatInputAmount(finalTotal)}
                    onChange={(e) => {
                      const val = round2(parseFloat(e.target.value) || 0);
                      setFinalTotal(val); setManualOverride(true); setCashEntered(formatInputAmount(val));
                    }}
                  />
                </div>
                {manualOverride && (
                  <button
                    className="text-xs text-slate-900 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 mt-1"
                    onClick={() => { setFinalTotal(defaultPayable); setManualOverride(false); setCashEntered(formatInputAmount(defaultPayable)); }}
                  >
                    Reset to ₹{defaultPayable.toFixed(2)}
                  </button>
                )}
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Customer Name</label><input className="input" placeholder="Optional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
                <div><label className="label">Phone</label><input className="input" placeholder="Optional" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
                <div>
                  <label className="label">Email <span className="text-slate-900 dark:text-slate-500 font-normal">(for receipt)</span></label>
                  <div className="relative"><Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-500" /><input className="input pl-8" type="email" placeholder="Optional" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div>
                </div>
                <div><label className="label">GSTIN <span className="text-slate-900 dark:text-slate-500 font-normal">(B2B)</span></label><input className="input" placeholder="Optional" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} /></div>
              </div>

              {/* Payments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Payment Method</label>
                  <button onClick={() => setIsSplit(!isSplit)} className={cn('text-xs px-2 py-1 rounded font-medium', isSplit ? 'bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400')}>
                    {isSplit ? 'Cancel Split' : 'Split Payment'}
                  </button>
                </div>

                {isSplit ? (
                  <div className="space-y-2 mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    {PAYMENT_METHODS.map((m) => {
                      const isBlocked = !isOnline && RAZORPAY_METHODS.includes(m.id);
                      return (
                        <div key={m.id} className="flex flex-col gap-2 p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                              <span>{m.icon}</span> <span className={isBlocked ? 'text-slate-400' : ''}>{m.label}</span>
                              {isBlocked && <span className="text-[10px] text-red-500">(Offline)</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {!isBlocked && <button onClick={() => fillRemainingSplit(m.id)} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-600 px-2 py-1 rounded">MAX</button>}
                              <input type="number" min="0" step="0.01" disabled={isBlocked} className="input w-28 text-right font-medium" placeholder="0.00" value={splitAmounts[m.id] || ''} onChange={(e) => handleSplitChange(m.id, e.target.value)} />
                            </div>
                          </div>
                          
                          {/* 🟢 NEW: Room Number input when Room is selected during Split */}
                          {m.id === 'room_charge' && (parseFloat(splitAmounts[m.id] || '0') > 0) && (
                            <div className="pl-6 pr-2 pb-1 relative">
                              <Key size={13} className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                className="input text-xs pl-8 w-full border-amber-300 bg-amber-50 dark:bg-amber-900/20" 
                                placeholder="Enter Room Number" 
                                value={roomNumber} 
                                onChange={(e) => setRoomNumber(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 font-medium">
                      <span className="text-slate-700 dark:text-slate-300">Total Paid:</span>
                      <span className={totalSplitPaid < finalTotal - 0.01 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>₹{totalSplitPaid.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {PAYMENT_METHODS.map((m) => {
                        const isBlocked = !isOnline && RAZORPAY_METHODS.includes(m.id);
                        return (
                          <button key={m.id} onClick={() => handleMethodSelect(m.id)} disabled={isBlocked} className={cn('flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium border relative', isBlocked ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed opacity-50' : method === m.id ? 'border-amber-500 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-400 hover:border-slate-300 dark:border-slate-600')}>
                            <span className="text-lg">{m.icon}</span>{m.label}
                            {isBlocked && <WifiOff size={10} className="absolute top-1 right-1 text-slate-400" />}
                          </button>
                        );
                      })}
                    </div>
                    
                    {method === 'cash' && (
                      <div className="mt-4">
                        <label className="label">Cash Tendered</label>
                        <input 
                          className="input text-lg font-bold" 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={cashEntered} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || parseFloat(val) >= 0) {
                              setCashEntered(val);
                            }
                          }} 
                        />
                        {change >= 0 ? <div className="mt-1 text-sm text-amber-600 font-medium">Change: ₹{round2(change).toFixed(2)}</div> : <div className="mt-1 text-sm text-red-600 font-medium">Short by ₹{Math.abs(round2(change)).toFixed(2)}</div>}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {[round2(finalTotal), Math.ceil(finalTotal / 10) * 10, Math.ceil(finalTotal / 50) * 50, Math.ceil(finalTotal / 100) * 100, Math.ceil(finalTotal / 500) * 500].filter((v, i, arr) => arr.indexOf(v) === i).map((amt) => (
                            <button key={amt} onClick={() => setCashEntered(formatInputAmount(amt))} className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">₹{amt}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 🟢 NEW: Room Number Input Box */}
                    {method === 'room_charge' && (
                      <div className="mt-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
                        <label className="label text-amber-900 dark:text-amber-100 flex items-center gap-1.5 mb-2">
                          <Key size={14} className="text-amber-600" />
                          Guest Room Number
                        </label>
                        <input 
                          className="input text-lg font-bold border-amber-300 focus:ring-amber-500/20" 
                          placeholder="e.g. 101"
                          value={roomNumber} 
                          onChange={(e) => setRoomNumber(e.target.value)} 
                        />
                        <p className="text-xs text-amber-700 dark:text-amber-500 mt-2">
                          The total amount of ₹{formatInputAmount(finalTotal)} will be added to this room's checkout folio.
                        </p>
                      </div>
                    )}

                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {!billed && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
            <button
              onClick={() => billMutation.mutate()}
              disabled={isPending || (!isOnline && RAZORPAY_METHODS.includes(method) && !isSplit) || (!isSplit && method === 'cash' && cashAmount < finalTotal - 0.01) || (isSplit && totalSplitPaid < finalTotal - 0.01) || isRoomChargeBlocked}
              className="btn-primary w-full py-3 text-base"
            >
              {isPending ? <><Loader2 size={16} className="animate-spin" /> {isRazorpayPending ? 'Waiting for payment...' : 'Processing...'}</> : `Collect ₹${round2(finalTotal).toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}