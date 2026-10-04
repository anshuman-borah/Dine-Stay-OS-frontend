'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost, apiPut } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Building2, Star, MapPin, Phone, Loader2, X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// We hardcode the default to always be hotel_and_restaurant behind the scenes
const EMPTY_FORM = { name: '', code: '', type: 'hotel_and_restaurant', addressLine1: '', gstin: '', phone: '' };

function BranchForm({ editBranch, onClose, onSaved }: { editBranch?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(editBranch ? {
    name: editBranch.name,
    code: editBranch.code,
    type: editBranch.type || 'hotel_and_restaurant',
    addressLine1: editBranch.addressLine1 || editBranch.address || '',
    gstin: editBranch.gstin || '',
    phone: editBranch.phone || '',
  } : { ...EMPTY_FORM });

  // SMART AUTO-GENERATE BRANCH CODE (Prevents collisions)
  useEffect(() => {
    if (!editBranch && form.name) {
      // Split the name into words, remove weird symbols
      const words = form.name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/);
      
      let generatedCode = '';
      if (words.length > 1) {
        // Example: "Grand Heritage Mumbai" -> First word "GRAND", initials of rest "HM" -> GRAND_HM
        const firstWord = words[0].substring(0, 6);
        // FIX: Added (w: string) to satisfy TypeScript strict mode
        const initials = words.slice(1).map((w: string) => w[0]).join('');
        generatedCode = `${firstWord}_${initials}`.substring(0, 10);
      } else {
        // Single word: just take the first 10 letters
        generatedCode = words[0].substring(0, 10);
      }
      
      setForm(p => ({ ...p, code: generatedCode }));
    }
  }, [form.name, editBranch]);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: () => editBranch
      ? apiPut(`/api/v1/branches/${editBranch.id}`, form)
      : apiPost('/api/v1/branches', form),
    onSuccess: () => { toast.success('Branch saved'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save branch'),
  });

  const err = (error as any)?.response?.data?.message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">{editBranch ? 'Edit Branch' : 'Add Branch'}</h3>
          <button onClick={onClose} className="p-1 text-slate-900 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"><X size={16} /></button>
        </div>

        {err && <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Branch Name *</label>
            <input className="input" placeholder="e.g. Grand Heritage Mumbai" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Branch Code * <span className="text-xs font-normal text-slate-500">(Auto-generated, but you can edit it)</span></label>
            <input className="input" placeholder="GRAND_HM" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} maxLength={10} />
          </div>
          
          {/* THE TYPE DROPDOWN HAS BEEN COMPLETELY REMOVED! */}

          <div className="col-span-2">
            <label className="label">Address</label>
            <input className="input" placeholder="123 MG Road, Mumbai, Maharashtra" value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} />
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input className="input" placeholder="27AAPFU0939F1ZV" value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} maxLength={15} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => save()} disabled={isPending || !form.name || !form.code} className="btn-primary flex-1">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {isPending ? 'Saving…' : 'Save Branch'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const { user, setBranch, branchId: activeBranchId } = useAuthStore();
  const [showForm, setShowForm]   = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const r = await apiFetch('/api/v1/branches');
        const payload = r?.data?.data !== undefined ? r.data.data : r?.data;
        return Array.isArray(payload) ? payload : [];
      } catch (e) {
        return [];
      }
    },
  });

  const { data: limits } = useQuery({
    queryKey: ['subLimits'],
    queryFn: async () => {
      try {
        const r = await apiFetch('/api/v1/subscriptions/limits');
        return r?.data?.data !== undefined ? r.data.data : (r?.data || null);
      } catch (e) {
        return null;
      }
    },
  });

  const canAddBranch = !limits || limits.maxBranches === -1 || (Array.isArray(branches) ? branches.length : 0) < limits.maxBranches;

  const openAdd  = () => { setEditBranch(null); setShowForm(true); };
  const openEdit = (b: any) => { setEditBranch(b); setShowForm(true); };
  const onSaved  = () => qc.invalidateQueries({ queryKey: ['branches'] });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Branch Management</h1>
          <p className="text-sm text-slate-900 dark:text-slate-400">
            {Array.isArray(branches) ? branches.length : 0} / {limits?.maxBranches === -1 ? '∞' : limits?.maxBranches || '—'} branches
          </p>
        </div>
        {user?.role === 'owner' && (
          canAddBranch ? (
            <button onClick={openAdd} className="btn-primary">
              <Plus size={14} /> Add Branch
            </button>
          ) : (
            <span className="text-sm text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 px-3 py-2 rounded-lg">
              Branch limit reached — upgrade plan
            </span>
          )
        )}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(branches) && branches.map((branch: any) => {
            const isActive = activeBranchId === branch.id;
            return (
              <div key={branch.id} className={cn(
                'card border-2 transition-all flex flex-col',
                isActive ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/5' : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600',
              )}>
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <Building2 size={20} className={isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-400'} />
                  </div>
                  <div className="flex items-center gap-2">
                    {branch.isHq && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 px-2 py-0.5 rounded-full">
                        <Star size={10} /> HQ
                      </span>
                    )}
                    {isActive && <span className="badge-green text-xs">Active</span>}
                  </div>
                </div>

                {/* Info */}
                <h3 className="font-bold text-slate-900 dark:text-white">{branch.name}</h3>
                <p className="text-xs text-slate-900 dark:text-slate-500 font-mono mt-0.5">{branch.code}</p>
                <p className="text-xs text-slate-900 dark:text-slate-500 mt-0.5">Hotel & Restaurant</p>
                
                {branch.addressLine1 && (
                  <div className="flex items-start gap-1 text-xs text-slate-900 dark:text-slate-400 mt-1.5">
                    <MapPin size={10} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{branch.addressLine1}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-1 text-xs text-slate-900 dark:text-slate-400 mt-1">
                    <Phone size={10} /> {branch.phone}
                  </div>
                )}
                {branch.gstin && (
                  <div className="text-xs text-slate-900 dark:text-slate-500 font-mono mt-1">GSTIN: {branch.gstin}</div>
                )}

                {/* Actions */}
                <div className="mt-auto pt-4 flex gap-2">
                  {user?.role === 'owner' ? (
                    <button
                      onClick={() => setBranch(branch.id)}
                      className={cn(
                        'flex-1 text-xs py-1.5 rounded-lg transition-colors font-medium',
                        isActive
                          ? 'bg-amber-200 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-default'
                          : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-600 text-slate-600 dark:text-slate-300',
                      )}
                      disabled={isActive}
                    >
                      {isActive ? '✓ Selected' : 'Switch To'}
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 cursor-not-allowed">
                      <Lock size={10} />
                      <span>Branch locked</span>
                    </div>
                  )}
                  {user?.role === 'owner' && (
                    <button onClick={() => openEdit(branch)} className="btn-ghost py-1.5 px-3 text-xs">
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {Array.isArray(branches) && branches.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-600 gap-2">
              <Building2 size={32} className="opacity-40" />
              <p className="text-sm">No branches yet — add your first location</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <BranchForm
          editBranch={editBranch}
          onClose={() => setShowForm(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}