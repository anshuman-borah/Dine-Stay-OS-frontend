'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPut, api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Building2, FileText, CreditCard, Printer, UploadCloud,
  Image, X, Bell, CheckCircle2, AlertTriangle, Loader2,
  Monitor, Trash2, Zap, Eye, EyeOff, ExternalLink, Unlink, Link, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrinterSettings } from '@/hooks/usePrinterSettings';
import type { PrinterWidth } from '@/lib/printer';
import { useAuthStore } from '@/store/auth.store';

// ─── GSTIN validation ──────────────────────────────────────────────────────────
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX   = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

function validateGstin(v: string): string | null {
  if (!v) return null;
  if (v.length !== 15) return 'GSTIN must be exactly 15 characters';
  if (!GSTIN_REGEX.test(v)) return 'Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)';
  return null;
}

function validatePan(v: string): string | null {
  if (!v) return null;
  if (!PAN_REGEX.test(v)) return 'Invalid PAN format (e.g. AAPFU0939F)';
  return null;
}

// ─── Notification preference toggles ─────────────────────────────────────────
const NOTIF_PREFS = [
  { key: 'notifNewOrder',     label: 'New order placed',         sub: 'Receive email/SMS when a new order is created' },
  { key: 'notifLowStock',     label: 'Low stock alerts',         sub: 'Get notified when inventory drops below minimum level' },
  { key: 'notifShiftSummary', label: 'Shift close summary',      sub: 'Receive a summary report when a shift is closed' },
  { key: 'notifDailyReport',  label: 'Daily sales report',       sub: "Morning summary of previous day's sales emailed to you" },
  { key: 'notifBillEmail',    label: 'Bill email confirmations',  sub: 'CC yourself whenever a bill is emailed to a customer' },
];

const TABS = [
  { id: 'business',      label: 'Business Info',  icon: Building2,      roles: ['owner', 'manager', 'restaurant_manager', 'hotel_manager'] },
  { id: 'gst',           label: 'GST & Tax',       icon: FileText,       roles: ['owner'] },
  { id: 'subscription',  label: 'Subscription',    icon: CreditCard,     roles: ['owner'] },
  { id: 'payments',      label: 'Payments',        icon: Zap,            roles: ['owner'] },
  { id: 'integrations',  label: 'Integrations',    icon: Link,           roles: ['owner', 'hotel_manager'], context: 'branch' },
  { id: 'printer',       label: 'Printer',         icon: Printer,        roles: ['owner', 'manager', 'restaurant_manager', 'hotel_manager', 'cashier', 'waiter', 'kitchen', 'receptionist'], context: 'branch' },
  { id: 'notifications', label: 'Notifications',   icon: Bell,           roles: ['owner', 'manager', 'restaurant_manager', 'hotel_manager'] },
  { id: 'security',      label: 'Security',        icon: Monitor,        roles: ['owner', 'manager', 'restaurant_manager', 'hotel_manager', 'cashier', 'waiter', 'kitchen', 'receptionist', 'inventory', 'housekeeping'] },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const branchId = useAuthStore((s) => s.branchId);
  const role = user?.role || 'waiter';
  const allowedTabs = TABS.filter((t) => (!t.roles || t.roles.includes(role)) && !(t.context === 'branch' && !branchId));

  const [tab, setTab]               = useState(allowedTabs[0]?.id || 'security');
  
  useEffect(() => {
    if (!allowedTabs.find(t => t.id === tab)) {
      setTab(allowedTabs[0]?.id || 'security');
    }
  }, [allowedTabs, tab]);

  const [form, setForm]             = useState<any>(null);
  const [logoFile, setLogoFile]     = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { settings: printer, update: updatePrinter, loaded: printerLoaded } = usePrinterSettings();

  const gstinError = validateGstin(form?.gstin || '');
  const panError   = validatePan(form?.pan || '');

  // ── Fetch tenant ─────────────────────────────────────────────────────────────
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn:  () => apiFetch('/api/v1/tenant').then((r) => r.data),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (tenant && !form) {
      setForm(tenant);
    }
  }, [tenant, form]);

  // ── Fetch Subscription ───────────────────────────────────────────────────────
  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn:  () => apiFetch('/api/v1/subscriptions/current').then((r) => r.data?.data ?? r.data),
  });

  // ── Fetch Plans ──────────────────────────────────────────────────────────────
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn:  () => apiFetch('/api/v1/subscriptions/plans').then((r) => r.data?.data ?? r.data),
  });

  const sub = subData;
  const plans: any[] = Array.isArray(plansData) ? plansData : [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      let payload = { ...form };
      if (logoFile) {
        setLogoUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', logoFile);
          const res = await api.post('/api/v1/storage/upload?folder=logos', formData);
          const url = res.data?.data?.url || res.data?.url;
          if (!url) throw new Error('No URL returned');
          payload.logoUrl = url;
        } catch (err: any) {
          throw new Error(err.response?.data?.message || 'Logo upload failed');
        } finally {
          setLogoUploading(false);
        }
      }
      return apiPut('/api/v1/tenant', payload);
    },
    onSuccess: (res) => {
      toast.success('Settings saved');
      const updated = res?.data ?? res;
      if (updated) {
        setForm(updated);
        setLogoFile(null);
        if (logoPreviewUrl) {
          URL.revokeObjectURL(logoPreviewUrl);
          setLogoPreviewUrl(null);
        }
      }
      qc.setQueryData(['tenant'], updated);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Save failed');
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    
    setLogoFile(file);
    const localUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(localUrl);
    toast.success('Logo selected — save to apply');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleRemoveLogo = () => {
    setForm((f: any) => ({ ...f, logoUrl: null }));
    setLogoFile(null);
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
    }
  };

  const displayLogoUrl = logoPreviewUrl || form?.logoUrl;

  const [isUpgrading, setIsUpgrading] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (plan: any) => {
    try {
      setIsUpgrading(true);

      const res = await api.post('/api/v1/razorpay/create-order', {
        planCode: plan.code,
      });
      const order = res.data?.data || res.data;

      // Handle development mock checkout
      if (order.isMock) {
        await api.post('/api/v1/razorpay/verify-payment', {
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_signature',
          planCode: plan.code,
        });
        toast.success(`[DEV MODE] Upgraded to ${plan.name}!`);
        qc.invalidateQueries({ queryKey: ['subscription'] });
        qc.invalidateQueries({ queryKey: ['tenant'] });
        return;
      }

      // Live Razorpay Checkout
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Failed to load payment gateway script.');
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Dine&Stay OS',
        description: `Upgrade to ${plan.name}`,
        order_id: order.orderId,
        handler: async function (response: any) {
          try {
            await api.post('/api/v1/razorpay/verify-payment', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planCode: plan.code,
            });
            toast.success(`Successfully upgraded to ${plan.name}!`);
            qc.invalidateQueries({ queryKey: ['subscription'] });
            qc.invalidateQueries({ queryKey: ['tenant'] });
          } catch (e: any) {
            toast.error(e.response?.data?.message || 'Payment verification failed');
          }
        },
        theme: { color: '#f59e0b' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(response.error?.description || 'Payment failed');
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to initialize payment');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (tenantLoading && !form) {
    return (
      <div className="flex h-full items-center justify-center text-slate-900 dark:text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading settings…
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Sidebar */}
      <aside className="w-full md:w-52 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-3 flex md:block overflow-x-auto md:space-y-1 gap-2 scrollbar-none">
        <div className="hidden md:block text-xs font-semibold text-slate-900 dark:text-slate-500 uppercase mb-3 px-2">Settings</div>
        {allowedTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn('sidebar-link w-auto md:w-full flex-shrink-0 whitespace-nowrap', tab === id && 'sidebar-link-active')}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* ── Business Info ──────────────────────────────────────────────────── */}
        {tab === 'business' && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Business Information</h2>

            {/* Logo */}
            <div className="card space-y-3">
              <label className="label mb-0">Business Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                  {displayLogoUrl
                    ? <img src={displayLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                    : <Image size={24} className="text-slate-600" />}
                </div>
                <div className="flex-1 space-y-2">
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading || saveMutation.isPending}
                    className="btn-secondary w-full text-sm"
                  >
                    {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                    {logoUploading ? 'Uploading…' : 'Upload Logo'}
                  </button>
                  {displayLogoUrl && (
                    <button
                      onClick={handleRemoveLogo}
                      disabled={logoUploading || saveMutation.isPending}
                      className="btn-ghost w-full text-xs text-red-600 dark:text-red-400"
                    >
                      <X size={12} /> Remove Logo
                    </button>
                  )}
                  <p className="text-xs text-slate-900 dark:text-slate-500">JPG, PNG or WebP · Max 5 MB</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Business Name</label>
                <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <textarea className="input" rows={2} value={form.addressLine1 || ''} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input" value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div>
                <label className="label">State Code (2-digit)</label>
                <input className="input" maxLength={2} value={form.stateCode || ''} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} placeholder="27" />
              </div>
              <div>
                <label className="label">Pincode</label>
                <input className="input" value={form.pincode || ''} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
              </div>
            </div>

            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* ── GST & Tax ─────────────────────────────────────────────────────── */}
        {tab === 'gst' && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">GST & Tax Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">GSTIN</label>
                <input
                  className={cn('input font-mono', gstinError && form.gstin && 'border-red-600 focus:ring-red-600')}
                  maxLength={15}
                  value={form.gstin || ''}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  placeholder="27AAPFU0939F1ZV"
                />
                {form.gstin && gstinError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> {gstinError}
                  </p>
                )}
                {form.gstin && !gstinError && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Valid GSTIN
                  </p>
                )}
              </div>

              <div>
                <label className="label">PAN</label>
                <input
                  className={cn('input font-mono', panError && form.pan && 'border-red-600')}
                  maxLength={10}
                  value={form.pan || ''}
                  onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  placeholder="AAPFU0939F"
                />
                {form.pan && panError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> {panError}
                  </p>
                )}
              </div>

              <div>
                <label className="label">FSSAI License No.</label>
                <input className="input" value={form.fssaiNo || ''} onChange={(e) => setForm({ ...form, fssaiNo: e.target.value })} />
              </div>

              <div>
                <label className="label">Tax Regime</label>
                <select className="input" value={form.taxRegime || 'regular'} onChange={(e) => setForm({ ...form, taxRegime: e.target.value })}>
                  <option value="regular">Regular</option>
                  <option value="composition">Composition</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm text-slate-900 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-white mb-2">India GST Slabs for Restaurants</p>
              <ul className="space-y-1">
                <li>• <span className="text-slate-900 dark:text-white">0%</span> — Packaged food (non-branded)</li>
                <li>• <span className="text-slate-900 dark:text-white">5%</span> — Standalone / non-AC restaurants</li>
                <li>• <span className="text-slate-900 dark:text-white">18%</span> — AC restaurants / liquor license</li>
                <li>• <span className="text-slate-900 dark:text-white">28%</span> — Alcohol, aerated drinks</li>
              </ul>
            </div>

            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !!(form.gstin && gstinError) || !!(form.pan && panError)}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save GST Settings'}
            </button>
          </div>
        )}

        {/* ── Subscription ──────────────────────────────────────────────────── */}
        {tab === 'subscription' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Subscription & Plans</h2>

            {/* Current Plan Card */}
            <div className="card border-amber-500/40 bg-amber-500/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xl flex items-center gap-2">
                    {sub?.plan?.name || (sub?.status === 'trial' ? 'Free 14-Day Trial' : 'No Active Plan')}
                    <Sparkles size={18} className="text-amber-500" />
                  </div>
                  <div className="text-slate-500 text-sm mt-0.5">
                    {sub?.plan?.priceMonthly ? `₹${sub.plan.priceMonthly}/month` : sub?.status === 'trial' ? 'Full features unlocked during trial' : 'Custom pricing'}
                  </div>
                </div>
                <span className={cn(
                  'badge text-sm px-3 py-1 font-semibold capitalize',
                  sub?.status === 'active' ? 'badge-green' : sub?.status === 'trial' ? 'badge-yellow' : 'badge-red',
                )}>
                  {sub?.status || 'trial'}
                </span>
              </div>
              {sub?.status === 'trial' && sub?.trialEndsAt && (
                <div className="mt-4 pt-3 border-t border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Trial ends on {new Date(sub.trialEndsAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}. Choose a plan below to keep uninterrupted access.
                </div>
              )}
            </div>

            {/* Available Plans */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Available Plans</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map((plan: any) => {
                  const isCurrent = sub?.planId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        'card border-2 flex flex-col justify-between transition-all p-4',
                        isCurrent ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
                      )}
                    >
                      <div>
                        {isCurrent && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-2 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Active plan
                          </div>
                        )}
                        <div className="font-bold text-slate-900 dark:text-white">{plan.name}</div>
                        <div className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</div>

                        <div className="text-amber-600 dark:text-amber-400 text-2xl font-black mt-3">
                          ₹{plan.priceMonthly}
                          <span className="text-xs text-slate-500 font-normal"> /mo</span>
                        </div>

                        <ul className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <li className="text-xs text-slate-600 dark:text-slate-300">
                            ✓ {plan.maxBranches === -1 ? 'Unlimited' : `Up to ${plan.maxBranches}`} branch(es)
                          </li>
                          <li className="text-xs text-slate-600 dark:text-slate-300">
                            ✓ {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} staff users
                          </li>
                          <li className="text-xs text-slate-600 dark:text-slate-300">
                            ✓ {plan.maxMenuItems === -1 ? 'Unlimited' : plan.maxMenuItems} menu items
                          </li>
                        </ul>
                      </div>

                      <div className="mt-5">
                        {isCurrent ? (
                          <button disabled className="btn-secondary w-full text-xs opacity-60 cursor-default">
                            Current Plan
                          </button>
                        ) : (
                          <button 
                            className="btn-primary w-full text-xs"
                            onClick={() => handleUpgrade(plan)}
                            disabled={isUpgrading}
                          >
                            {isUpgrading ? 'Loading…' : 'Upgrade Plan'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Printer Settings ──────────────────────────────────────────────── */}
        {tab === 'printer' && printerLoaded && (
          <div className="max-w-lg space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Thermal Printer Settings</h2>

            <div className="card space-y-3">
              <label className="label mb-0">Paper Width</label>
              <div className="flex gap-3">
                {([58, 80] as PrinterWidth[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => updatePrinter({ width: w })}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all',
                      printer.width === w
                        ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-900/10'
                        : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-400 hover:border-slate-500',
                    )}
                  >
                    {w}mm
                    <div className="text-xs font-normal mt-0.5 opacity-70">
                      {w === 58 ? '32 chars/line' : '48 chars/line'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card space-y-3">
              <label className="label mb-0">Print Method</label>
              <div className="flex gap-3">
                {([
                  { id: 'browser', label: 'Browser Print',    desc: 'Works on any browser' },
                  { id: 'serial',  label: 'Web Serial (USB)', desc: 'Chrome 89+ · direct ESC/POS' },
                ] as const).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updatePrinter({ method: m.id })}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all text-left px-3',
                      printer.method === m.id
                        ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-900/10'
                        : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-400 hover:border-slate-500',
                    )}
                  >
                    {m.label}
                    <div className="text-xs font-normal mt-0.5 opacity-70">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card space-y-2">
              <h3 className="font-medium text-slate-900 dark:text-white">Receipt Footer</h3>
              <div>
                <label className="label">Thank You Message</label>
                <input
                  className="input"
                  value={printer.footerMessage}
                  onChange={(e) => updatePrinter({ footerMessage: e.target.value })}
                  placeholder="Thank you for dining with us!"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Notifications ─────────────────────────────────────────────────── */}
        {tab === 'notifications' && (
          <div className="max-w-lg space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h2>
              <p className="text-sm text-slate-900 dark:text-slate-400 mt-1">Control which events send you email or SMS alerts.</p>
            </div>

            <div className="card divide-y divide-slate-200 dark:divide-slate-800/80">
              {NOTIF_PREFS.map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{label}</div>
                    <div className="text-xs text-slate-900 dark:text-slate-500 mt-0.5">{sub}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f: any) => ({ ...f, [key]: !f[key] }))}
                    className={cn(
                      'relative flex-shrink-0 w-10 h-6 rounded-full transition-colors',
                      form[key] ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700',
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      form[key] && 'translate-x-4',
                    )} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Notification Settings'}
            </button>
          </div>
        )}

        {/* ── Payments / Razorpay ───────────────────────────────────────────── */}
        {tab === 'payments' && <PaymentsTab />}

        {/* ── Integrations ─────────────────────────────────────────────────── */}
        {tab === 'integrations' && <IntegrationsTab tenantId={form.id} userBranchId={user?.branchId} />}

        {/* ── Security / Sessions ──────────────────────────────────────────── */}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}

/* ─── Security Tab ─────────────────────────────────────────────────────────── */
function SecurityTab() {
  const qc = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn:  () => apiFetch('/api/v1/auth/sessions').then((r) => r.data),
  });

  const revokeOne = useMutation({
    mutationFn: (sessionId: string) => api.delete(`/api/v1/auth/sessions/${sessionId}`),
    onSuccess:  () => { toast.success('Session revoked'); qc.invalidateQueries({ queryKey: ['auth-sessions'] }); },
    onError:    () => toast.error('Failed to revoke session'),
  });

  const sessionList: any[] = Array.isArray(sessions) ? sessions : [];

  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState({ current: false, new: false });

  const pwdMutation = useMutation({
    mutationFn: () => api.post('/api/v1/auth/change-password', { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to change password'),
  });

  const handlePwdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (pwdForm.newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters');
    }
    pwdMutation.mutate();
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Change Password</h2>
        <form onSubmit={handlePwdSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div>
            <label className="label text-xs">Current Password</label>
            <div className="relative">
              <input
                className="input pr-10 bg-white dark:bg-slate-950"
                type={showPwd.current ? 'text' : 'password'}
                value={pwdForm.currentPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPwd.current ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label text-xs">New Password</label>
            <div className="relative">
              <input
                className="input pr-10 bg-white dark:bg-slate-950"
                type={showPwd.new ? 'text' : 'password'}
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                required minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => ({ ...s, new: !s.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPwd.new ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label text-xs">Confirm New Password</label>
            <input
              className="input bg-white dark:bg-slate-950"
              type={showPwd.new ? 'text' : 'password'}
              value={pwdForm.confirmPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
              required minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={pwdMutation.isPending || !pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword}
            className="btn-primary w-full mt-2"
          >
            {pwdMutation.isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Sessions</h2>
        <p className="text-sm text-slate-900 dark:text-slate-400 mt-1">
          Devices currently signed in to your account.
        </p>
      </div>

      <div className="card divide-y divide-slate-200 dark:divide-slate-800/60">
        {isLoading ? (
          <div className="py-8 text-center text-slate-900 dark:text-slate-500 text-sm">Loading sessions…</div>
        ) : sessionList.length === 0 ? (
          <div className="py-8 text-center text-slate-900 dark:text-slate-500 text-sm">No active sessions found</div>
        ) : sessionList.map((s: any) => (
          <div key={s.sessionId} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3 min-w-0">
              <Monitor size={16} className="text-slate-900 dark:text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm text-slate-900 dark:text-white font-medium truncate">
                  {s.userAgent?.split('(')[0]?.trim() || 'Unknown device'}
                </div>
                <div className="text-xs text-slate-900 dark:text-slate-500 mt-0.5">
                  IP: {s.ip} · Signed in {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
            <button
              onClick={() => revokeOne.mutate(s.sessionId)}
              disabled={revokeOne.isPending}
              className="btn-ghost text-red-600 dark:text-red-400 hover:text-red-300 p-1.5 flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Payments Tab ─────────────────────────────────────────────────────────── */
function PaymentsTab() {
  const qc = useQueryClient();
  const [keyId,      setKeyId]      = useState('');
  const [keySecret,  setKeySecret]  = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const { data: rzp, isLoading } = useQuery<{
    connected:   boolean;
    liveMode:    boolean;
    keyId:       string | null;
    connectedAt: string | null;
  }>({
    queryKey: ['razorpay-status'],
    queryFn:  () => apiFetch('/api/v1/tenant/razorpay').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: () => api.post('/api/v1/tenant/razorpay', { keyId: keyId.trim(), keySecret: keySecret.trim() }),
    onSuccess:  () => { toast.success('Razorpay connected!'); qc.invalidateQueries({ queryKey: ['razorpay-status'] }); setKeySecret(''); },
    onError:    (e: any) => toast.error(e?.response?.data?.message ?? 'Verification failed — check your keys'),
  });

  const disconnect = useMutation({
    mutationFn: () => api.delete('/api/v1/tenant/razorpay'),
    onSuccess:  () => { toast.success('Razorpay disconnected'); qc.invalidateQueries({ queryKey: ['razorpay-status'] }); setKeyId(''); setKeySecret(''); },
    onError:    () => toast.error('Failed to disconnect'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-500 text-sm py-10">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  const isConnected = !!rzp?.connected;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Razorpay POS Gateway</h2>
        <p className="text-sm text-slate-900 dark:text-slate-400 mt-1">
          Connect your restaurant's Razorpay account to accept UPI, card, and QR payments from customers.
        </p>
      </div>

      <div className={`card border ${isConnected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-300 dark:border-slate-700'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg
              ${isConnected ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-500'}`}>
              R
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Razorpay</div>
              {isConnected ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={11} /> Connected
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-900 dark:text-slate-500 mt-0.5">Not connected</div>
              )}
            </div>
          </div>

          {isConnected && (
            <button
              onClick={() => {
                if (confirm('Disconnect Razorpay? Saved credentials will be deleted.')) {
                  disconnect.mutate();
                }
              }}
              disabled={disconnect.isPending}
              className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              <Unlink size={13} />
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {isConnected ? 'Update credentials' : 'Enter your Razorpay credentials'}
        </h3>

        <div className="space-y-1">
          <label className="label">Key ID</label>
          <input
            type="text"
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            placeholder="rzp_live_xxx  or  rzp_test_xxx"
            className="input font-mono text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Key Secret</label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="Your Razorpay key secret"
              className="input font-mono text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            >
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !keyId || !keySecret}
          className="btn-primary w-full"
        >
          {save.isPending ? 'Verifying…' : isConnected ? 'Update Razorpay Keys' : 'Connect Razorpay'}
        </button>
      </div>
    </div>
  );
}

/* ─── Integrations Tab ─────────────────────────────────────────────────────── */
export function IntegrationsTab({ tenantId, userBranchId }: { tenantId: string, userBranchId?: string }) {
  const [copied, setCopied] = useState(false);
  const branchId = userBranchId || '[YOUR-BRANCH-ID]';
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/hotel/webhooks/channel-manager/${tenantId}/${branchId}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('Webhook URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Third-Party Integrations</h2>
        <p className="text-sm text-slate-900 dark:text-slate-400 mt-1">
          Connect DineOS to external platforms.
        </p>
      </div>

      <div className="card space-y-4 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Link size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Channel Manager (OTA Bookings)</h3>
            <p className="text-xs text-slate-900 dark:text-slate-400 mt-1">
              Sync bookings automatically from platforms like MakeMyTrip, Booking.com, and Agoda.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/60 space-y-4">
          <div className="space-y-1">
            <label className="label">Webhook URL</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={webhookUrl}
                className="input font-mono text-[11px] py-2 bg-slate-50 dark:bg-slate-900/50"
              />
              <button onClick={handleCopy} className="btn-secondary whitespace-nowrap text-xs">
                {copied ? <CheckCircle2 size={14} /> : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}