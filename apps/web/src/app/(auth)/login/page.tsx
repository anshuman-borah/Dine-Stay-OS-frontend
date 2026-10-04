'use client';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Building2, KeyRound, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  
  const [mounted, setMounted] = useState(false);
  const [loginMode, setLoginMode] = useState<'manager' | 'staff'>('manager');
  const [isSavedUser, setIsSavedUser] = useState(false);
  
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    tenantSlug: '',
    phone: '', 
    pin: '' 
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Restore saved login info on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dineos_saved_login');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm(f => ({ ...f, ...parsed, password: '', pin: '' }));
        setLoginMode(parsed.mode || 'manager');
        setIsSavedUser(true);
      } catch (e) {
        localStorage.removeItem('dineos_saved_login');
      }
    }
  }, []);

  const handleSwitchAccount = () => {
    localStorage.removeItem('dineos_saved_login');
    setIsSavedUser(false);
    setForm({ email: '', password: '', tenantSlug: '', phone: '', pin: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {};

      if (loginMode === 'manager') {
        payload.email = form.email;
        payload.password = form.password;
      } else {
        payload.tenantSlug = form.tenantSlug.trim();
        payload.phone = form.phone;
        payload.pin = form.pin;
      }

      const res = await api.post('/api/v1/auth/login', payload);
      const userData = res.data?.data || res.data; 
      
      // Save credentials for the "Instagram-like" smooth return login
      localStorage.setItem('dineos_saved_login', JSON.stringify({
        mode: loginMode,
        email: loginMode === 'manager' ? form.email : '',
        tenantSlug: loginMode === 'staff' ? form.tenantSlug.trim() : '',
        phone: loginMode === 'staff' ? form.phone : '',
      }));

      login(userData);
      const role = userData?.user?.role;
      
      let redirectUrl = '/dashboard';
      if (role === 'superadmin') redirectUrl = '/admin';
      else if (role === 'owner') redirectUrl = '/executive';
      else if (role === 'manager') redirectUrl = '/executive';
      else if (role === 'restaurant_manager') redirectUrl = '/dashboard';
      else if (role === 'hotel_manager') redirectUrl = '/hotel/dashboard';
      else if (role === 'cashier') redirectUrl = '/cashier';
      else if (role === 'waiter') redirectUrl = '/waiter';
      else if (role === 'kitchen') redirectUrl = '/kds';
      else if (role === 'inventory') redirectUrl = '/inventory';
      else if (role === 'housekeeping') redirectUrl = '/hotel/housekeeping';
      else if (role === 'receptionist') redirectUrl = '/hotel';
      
      router.push(redirectUrl);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className={cn("w-full max-w-sm transition-opacity duration-500", mounted ? "opacity-100" : "opacity-0")}>
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 mb-4 shadow-lg shadow-amber-500/20">
            <span className="text-2xl font-black text-slate-900">D</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dine&Stay OS</h1>
          {!isSavedUser && <p className="text-slate-900 dark:text-slate-400 text-sm mt-1">Sign in to your account</p>}
        </div>

        {/* Hide the mode toggle if a user is already saved */}
        {!isSavedUser && (
          <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <button
              type="button"
              onClick={() => setLoginMode('manager')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                loginMode === 'manager' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Building2 size={16} /> Admin / Manager
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('staff')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                loginMode === 'staff' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <KeyRound size={16} /> POS Staff
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-5 relative overflow-hidden">
          
          {/* Saved User Profile View */}
          {isSavedUser && (
            <div className="flex flex-col items-center justify-center pt-2 pb-4 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center text-3xl font-bold mb-3 shadow-inner">
                {loginMode === 'manager' ? form.email.charAt(0).toUpperCase() : form.tenantSlug.charAt(0).toUpperCase()}
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {loginMode === 'manager' ? form.email : form.phone}
              </p>
              {loginMode === 'staff' && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{form.tenantSlug}</p>
              )}
              <button 
                type="button" 
                onClick={handleSwitchAccount} 
                className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-3 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Switch Account
              </button>
            </div>
          )}

          {/* Manager Inputs */}
          {loginMode === 'manager' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
              {!isSavedUser && (
                <div>
                  <label className="label">Email</label>
                  <input className="input transition-all duration-300 focus:ring-2 focus:ring-amber-500/20" type="email" placeholder="your@email.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Password</label>
                  <a href="/forgot-password" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">Forgot password?</a>
                </div>
                <div className="relative">
                  <input className="input pr-10 transition-all duration-300 focus:ring-2 focus:ring-amber-500/20" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} required autoFocus={isSavedUser} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Staff Inputs */}
          {loginMode === 'staff' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              {!isSavedUser && (
                <>
                  <div>
                    <label className="label">Workspace Code</label>
                    <input className="input transition-all duration-300 focus:ring-2 focus:ring-amber-500/20" placeholder="e.g. spice-garden" value={form.tenantSlug}
                      onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })} required />
                    <p className="text-[10px] text-slate-500 mt-1">Ask your manager if you don't know this code.</p>
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <input className="input transition-all duration-300 focus:ring-2 focus:ring-amber-500/20" type="tel" placeholder="e.g. 9876543210" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </div>
                </>
              )}
              <div>
                <label className="label">4-Digit PIN</label>
                <div className="relative">
                  <input className="input pr-10 text-2xl tracking-[0.5em] font-mono text-center transition-all duration-300 focus:ring-2 focus:ring-amber-500/20" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••" 
                    maxLength={6}
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} 
                    required 
                    autoFocus={isSavedUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button 
            className={cn(
              "btn-primary w-full h-11 flex items-center justify-center transition-all duration-300",
              loading ? "opacity-90 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
            )} 
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={22} className="animate-spin text-white" />
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-900 dark:text-slate-500 mt-6">
          New restaurant?{' '}
          <a href="/register" className="font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">Start free trial →</a>
        </p>
      </div>
    </div>
  );
}
