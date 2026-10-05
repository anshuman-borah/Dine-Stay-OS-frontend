// 'use client';
// import { useState, useMemo, useEffect } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { apiFetch, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';
// import toast from 'react-hot-toast';
// import { useAuthStore } from '@/store/auth.store';
// import { Plus, Edit2, UserX, Layout, Lock, Eye, EyeOff } from 'lucide-react';
// import { cn } from '@/lib/utils';

// // ─── Department + Role config ────────────────────────────────────────────────
// type Department = 'restaurant' | 'hotel' | 'both';

// const DEPARTMENT_LABELS: Record<Department, string> = {
//   restaurant: '🍽️ Restaurant',
//   hotel: '🏨 Hotel',
//   both: '🏢 Management HQ',
// };

// const ROLES_BY_DEPARTMENT: Record<Department, string[]> = {
//   restaurant: ['restaurant_manager', 'cashier', 'waiter', 'kitchen', 'inventory'],
//   hotel: ['hotel_manager', 'receptionist', 'housekeeping'],
//   both: ['owner', 'manager'],
// };

// const ROLE_COLORS: Record<string, string> = {
//   owner: 'badge-yellow', manager: 'badge-blue',
//   restaurant_manager: 'badge-blue', hotel_manager: 'badge-blue',
//   cashier: 'badge-green', waiter: 'badge-slate', kitchen: 'badge-red',
//   inventory: 'badge-slate', housekeeping: 'badge-blue', receptionist: 'badge-purple',
// };

// const ROLE_DEPARTMENT: Record<string, string> = {
//   owner: 'Management', manager: 'Management',
//   restaurant_manager: 'Restaurant', hotel_manager: 'Hotel',
//   cashier: 'Restaurant', waiter: 'Restaurant', kitchen: 'Restaurant', inventory: 'Restaurant',
//   receptionist: 'Hotel', housekeeping: 'Hotel',
// };

// function detectDepartment(role: string): Department {
//   if (['restaurant_manager', 'cashier', 'waiter', 'kitchen', 'inventory'].includes(role)) return 'restaurant';
//   if (['hotel_manager', 'receptionist', 'housekeeping'].includes(role)) return 'hotel';
//   return 'both';
// }

// function getAvailableRoles(dept: Department, userRole?: string): string[] {
//   return ROLES_BY_DEPARTMENT[dept].filter(r => {
//     if (userRole === 'owner') return true;
//     if (userRole === 'manager') return !['owner', 'manager'].includes(r);
//     if (['restaurant_manager', 'hotel_manager'].includes(userRole || '')) {
//       return !['owner', 'manager', 'restaurant_manager', 'hotel_manager'].includes(r);
//     }
//     return false;
//   });
// }

// export default function EmployeesPage() {
//   const qc = useQueryClient();
//   const { user, branchId } = useAuthStore();
//   const [showForm, setShowForm] = useState(false);
//   const [editUser, setEditUser] = useState<any>(null);
//   const [deleteUser, setDeleteUser] = useState<any>(null);
//   const [department, setDepartment] = useState<Department>('restaurant');
//   const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'cashier', password: '', pin: '', employeeCode: '', branchId: '' });
  
//   // Visibility toggles for security fields
//   const [showPassword, setShowPassword] = useState(false);
//   const [showPin, setShowPin] = useState(false);

//   const { data: users, isFetching: isLoading } = useQuery({ 
//     queryKey: ['users'], 
//     queryFn: async () => {
//       try {
//         const r = await apiFetch('/api/v1/users');
//         const payload = r?.data?.data !== undefined ? r.data.data : r?.data;
//         return Array.isArray(payload) ? payload : [];
//       } catch (e) { return []; }
//     },
//     staleTime: 0,
//     gcTime: 0,
//   });

//   const { data: branches } = useQuery({ 
//     queryKey: ['branches'], 
//     queryFn: async () => {
//       try {
//         const r = await apiFetch('/api/v1/branches');
//         const payload = r?.data?.data !== undefined ? r.data.data : r?.data;
//         return Array.isArray(payload) ? payload : [];
//       } catch (e) { return []; }
//     }, 
//     enabled: user?.role === 'owner' 
//   });

//   const filteredUsers = useMemo(() => {
//     if (!Array.isArray(users)) return [];
//     if (user?.role === 'owner') return users;
//     if (user?.role === 'manager') return users.filter((u: any) => !['owner', 'manager'].includes(u.role));
//     if (user?.role === 'restaurant_manager') return users.filter((u: any) => detectDepartment(u.role) === 'restaurant' && !['owner', 'manager', 'restaurant_manager'].includes(u.role));
//     if (user?.role === 'hotel_manager') return users.filter((u: any) => detectDepartment(u.role) === 'hotel' && !['owner', 'manager', 'hotel_manager'].includes(u.role));
//     return [];
//   }, [users, user?.role]);

//   const saveMutation = useMutation({
//     mutationFn: () => {
//       const payload: any = {
//         firstName: form.firstName,
//         lastName: form.lastName,
//         email: form.email,
//         phone: form.phone,
//         role: form.role,
//         employeeCode: form.employeeCode,
//       };

//       if (user?.role === 'owner' && form.branchId) {
//         payload.branchId = form.branchId;
//       }
//       if (form.password) payload.password = form.password;
//       if (form.pin) payload.pin = form.pin;

//       return editUser
//         ? apiPut(`/api/v1/users/${editUser.id}`, payload)
//         : apiPost('/api/v1/users', payload);
//     },
//     onSuccess: () => {
//       toast.success('Employee saved');
//       qc.invalidateQueries({ queryKey: ['users'] });
//       handleCloseForm();
//     },
//     onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
//   });

//   const deleteMutation = useMutation({
//     mutationFn: (id: string) => apiDelete(`/api/v1/users/${id}`),
//     onSuccess: () => {
//       toast.success('Employee permanently deleted');
//       qc.invalidateQueries({ queryKey: ['users'] });
//     },
//     onError: () => toast.error('Failed to delete employee'),
//   });

//   const PERMISSION_GRANTERS = ['owner', 'manager', 'restaurant_manager'];
//   const canGrantPermissions = PERMISSION_GRANTERS.includes(user?.role ?? '');

//   const permissionMutation = useMutation({
//     mutationFn: ({ id, canManageTables }: { id: string; canManageTables: boolean }) =>
//       apiPatch(`/api/v1/users/${id}/permissions`, { permissions: { canManageTables } }),
//     onSuccess: (_data, { canManageTables }) => {
//       toast.success(canManageTables ? 'Table management access granted' : 'Table management access revoked');
//       qc.invalidateQueries({ queryKey: ['users'] });
//     },
//     onError: () => toast.error('Failed to update permission'),
//   });

//   // ── Unified Departments (Always available based on acting user's role) ──
//   const availableDepartments = useMemo(() => {
//     return (Object.keys(DEPARTMENT_LABELS) as Department[]).filter(dept => {
//       if (user?.role === 'owner' || user?.role === 'manager') return true;
//       if (user?.role === 'restaurant_manager') return dept === 'restaurant';
//       if (user?.role === 'hotel_manager') return dept === 'hotel';
//       return false;
//     });
//   }, [user?.role]);

//   // Auto-switch department if the selected one becomes invalid
//   useEffect(() => {
//     if (availableDepartments.length > 0 && !availableDepartments.includes(department)) {
//       handleDepartmentChange(availableDepartments[0]);
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [availableDepartments]);

//   const handleDepartmentChange = (dept: Department) => {
//     setDepartment(dept);
//     const availableRoles = getAvailableRoles(dept, user?.role);
//     if (availableRoles.length > 0 && !getAvailableRoles(dept, user?.role).includes(form.role)) {
//       setForm((prev) => ({ ...prev, role: availableRoles[0] }));
//     }
//   };

//   const filteredRoles = getAvailableRoles(department, user?.role);

//   const handleCloseForm = () => {
//     setShowForm(false);
//     setEditUser(null);
//     setDepartment('restaurant');
//     setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'cashier', password: '', pin: '', employeeCode: '', branchId: '' });
//     setShowPassword(false);
//     setShowPin(false);
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-xl font-bold text-slate-900 dark:text-white">Employees</h1>
//           <p className="text-sm text-slate-900 dark:text-slate-400">{filteredUsers.length} active staff members</p>
//         </div>
//         <button onClick={() => { setEditUser(null); setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'cashier', password: '', pin: '', employeeCode: '', branchId: branchId || '' }); setShowForm(true); }} className="btn-primary"><Plus size={14} /> Add Employee</button>
//       </div>

//       <div className="card p-0 overflow-hidden">
//         <table className="w-full">
//           <thead className="bg-slate-100/50 dark:bg-slate-800/50">
//             <tr>
//               <th className="th">Name</th>
//               <th className="th">Contact</th>
//               <th className="th">Role</th>
//               {user?.role === 'owner' && <th className="th">Branch</th>}
//               <th className="th">Dept</th>
//               <th className="th">Employee Code</th>
//               <th className="th">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {isLoading ? (
//               [...Array(5)].map((_, i) => (
//                 <tr key={i} className="table-row">
//                   <td className="td">
//                     <div className="flex items-center gap-3">
//                       <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
//                       <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
//                     </div>
//                   </td>
//                   <td className="td space-y-1">
//                     <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
//                     <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
//                   </td>
//                   <td className="td"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-24 animate-pulse"></div></td>
//                   {user?.role === 'owner' && (
//                     <td className="td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse"></div></td>
//                   )}
//                   <td className="td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse"></div></td>
//                   <td className="td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div></td>
//                   <td className="td"><div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div></td>
//                 </tr>
//               ))
//             ) : filteredUsers.map((u: any) => (
//               <tr key={u.id} className="table-row">
//                 <td className="td">
//                   <div className="flex items-center gap-3">
//                     <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white">{u.firstName?.[0]}{u.lastName?.[0]}</div>
//                     <div><div className="font-medium">{u.firstName} {u.lastName} {u.id === user?.id && <span className="text-amber-500 ml-1 text-xs font-bold">(You)</span>}</div></div>
//                   </div>
//                 </td>
//                 <td className="td text-slate-900 dark:text-slate-400 text-xs">
//                   <div>{u.email}</div>
//                   <div>{u.phone}</div>
//                 </td>
//                 <td className="td">
//                   <span className={ROLE_COLORS[u.role] || 'badge-slate'}>
//                     {u.role === 'manager' ? 'Branch Manager' :
//                       u.role === 'restaurant_manager' ? 'Restaurant Manager' :
//                         u.role === 'hotel_manager' ? 'Hotel Manager' :
//                           u.role.charAt(0).toUpperCase() + u.role.slice(1).replace('_', ' ')}
//                   </span>
//                 </td>
//                 {user?.role === 'owner' && (
//                   <td className="td text-slate-900 dark:text-slate-400 text-xs">
//                     {u.branchId ? (branches?.find((b: any) => b.id === u.branchId)?.name || 'Unknown Branch') : 'Global'}
//                   </td>
//                 )}
//                 <td className="td"><span className="text-xs text-slate-900 dark:text-slate-500">{ROLE_DEPARTMENT[u.role] || '—'}</span></td>
//                 <td className="td text-slate-900 dark:text-slate-400 font-mono">{u.employeeCode || '—'}</td>
//                 <td className="td">
//                   <div className="flex gap-2 items-center">
//                     <button onClick={() => {
//                       setEditUser(u);
//                       const dept = detectDepartment(u.role);
//                       setDepartment(dept);
//                       setForm({ firstName: u.firstName, lastName: u.lastName || '', email: u.email || '', phone: u.phone || '', role: u.role, password: '', pin: '', employeeCode: u.employeeCode || '', branchId: u.branchId || branchId || '' });
//                       setShowForm(true);
//                     }} className="btn-ghost p-1.5"><Edit2 size={13} /></button>

//                     {canGrantPermissions && u.role === 'waiter' && (
//                       <button
//                         title={u.permissions?.canManageTables ? 'Revoke table management' : 'Grant table management'}
//                         onClick={() => permissionMutation.mutate({ id: u.id, canManageTables: !u.permissions?.canManageTables })}
//                         disabled={permissionMutation.isPending}
//                         className={cn(
//                           'btn-ghost p-1.5 transition-colors',
//                           u.permissions?.canManageTables
//                             ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'
//                             : 'text-slate-400 hover:text-amber-500'
//                         )}
//                       >
//                         {u.permissions?.canManageTables ? <Layout size={13} /> : <Lock size={13} />}
//                       </button>
//                     )}

//                     {u.id !== user?.id && (
//                       <button
//                         onClick={() => setDeleteUser(u)}
//                         className="btn-ghost p-1.5 text-red-600 dark:text-red-400 hover:text-red-300"
//                       >
//                         <UserX size={13} />
//                       </button>
//                     )}
//                   </div>
//                 </td>
//               </tr>
//             ))}
//             {!isLoading && filteredUsers.length === 0 && <tr><td colSpan={user?.role === 'owner' ? 7 : 6} className="text-center py-12 text-slate-900 dark:text-slate-500">No employees added yet</td></tr>}
//           </tbody>
//         </table>
//       </div>

//       {showForm && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
//           <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
//             <h3 className="font-bold text-slate-900 dark:text-white text-lg">{editUser ? 'Edit Employee' : 'Add Employee'}</h3>

//             {/* Owner Branch Selection */}
//             {user?.role === 'owner' && form.role !== 'owner' && (
//               <div>
//                 <label className="label">Assign Branch *</label>
//                 <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} disabled={!!branchId}>
//                   <option value="" disabled>Select a Branch</option>
//                   {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
//                 </select>
//                 {branchId && (
//                   <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
//                     Assigned to your currently selected branch. Switch to "All Branches" to change.
//                   </p>
//                 )}
//               </div>
//             )}

//             <div>
//               <label className="label">Department *</label>
//               <div className="flex gap-2">
//                 {availableDepartments.length > 0 ? (
//                   availableDepartments.map((dept) => (
//                     <button
//                       key={dept}
//                       type="button"
//                       onClick={() => handleDepartmentChange(dept)}
//                       className={cn(
//                         'flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all',
//                         department === dept
//                           ? 'bg-amber-500 text-slate-900 border-amber-500'
//                           : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-500'
//                       )}
//                     >
//                       {DEPARTMENT_LABELS[dept]}
//                     </button>
//                   ))
//                 ) : (
//                   <p className="text-xs text-slate-500">Please select a branch first to see available departments.</p>
//                 )}
//               </div>
//             </div>

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <div><label className="label">First Name *</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
//               <div><label className="label">Last Name</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
//               <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editUser} /></div>
//               <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!!editUser} /></div>
//               <div>
//                 <label className="label">Role *</label>
//                 <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={!!(editUser && editUser.id === user?.id) || filteredRoles.length === 0}>
//                   {filteredRoles.map((r) => {
//                     const label = r === 'manager' ? 'Branch Manager'
//                       : r === 'restaurant_manager' ? 'Restaurant Manager'
//                         : r === 'hotel_manager' ? 'Hotel Manager'
//                           : r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ');
//                     return <option key={r} value={r}>{label}</option>
//                   })}
//                 </select>
//               </div>
//               <div><label className="label">Employee Code</label><input className="input" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></div>
              
//               {form.role === 'owner' && (
//                 <div className="col-span-2 mt-2 text-xs text-blue-400 bg-blue-400/10 p-2.5 rounded-lg border border-blue-400/20">
//                   Owners have global system access and are not restricted to any specific branch.
//                 </div>
//               )}

//               {/* ── Security Credentials ── */}
//               <div>
//                 <label className="label">Dashboard Password {editUser ? '(Optional)' : '*'}</label>
//                 <div className="relative">
//                   <input 
//                     className="input pr-10" 
//                     type={showPassword ? "text" : "password"} 
//                     value={form.password} 
//                     onChange={(e) => setForm({ ...form, password: e.target.value })} 
//                     placeholder={editUser ? "Leave blank to keep" : "Min 8 chars"} 
//                   />
//                   <button 
//                     type="button" 
//                     onClick={() => setShowPassword(!showPassword)} 
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
//                   >
//                     {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="label">POS Login PIN {editUser ? '(Optional)' : '*'}</label>
//                 <div className="relative">
//                   <input 
//                     className="input pr-10 tracking-widest font-mono" 
//                     type={showPin ? "text" : "password"} 
//                     maxLength={6} 
//                     value={form.pin} 
//                     onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} 
//                     placeholder={editUser ? "Leave blank to keep" : "4-6 digits"} 
//                   />
//                   <button 
//                     type="button" 
//                     onClick={() => setShowPin(!showPin)} 
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
//                   >
//                     {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
//                   </button>
//                 </div>
//               </div>

//             </div>
//             <div className="flex gap-3 pt-2">
//               <button onClick={handleCloseForm} className="btn-secondary flex-1">Cancel</button>
//               <button onClick={() => {
//                 if (editUser && (form.password || form.pin)) {
//                   if (!window.confirm('Are you sure you want to update this employee\'s credentials?')) return;
//                 }
                
//                 // Block non-owner roles from being Global
//                 if (!form.branchId && form.role !== 'owner') {
//                   toast.error(`A specific branch must be assigned for the ${form.role.replace('_', ' ')} role.`);
//                   return;
//                 }

//                 saveMutation.mutate();
//               }} disabled={saveMutation.isPending || !form.firstName || (!editUser && (!form.password || !form.pin))} className="btn-primary flex-1">
//                 {saveMutation.isPending ? 'Saving...' : 'Save Employee'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* 🚀 Delete Confirmation Modal */}
//       {deleteUser && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
//           <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
//             <div className="flex items-center gap-3">
//               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
//                 <UserX className="text-red-500" size={22} />
//               </div>
//               <div>
//                 <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
//                   Permanently Delete Employee
//                 </h3>
//                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
//                   This action cannot be undone. The employee will be permanently removed from the system.
//                 </p>
//               </div>
//             </div>

//             <div className="mt-5 rounded-xl bg-slate-100 dark:bg-slate-800 p-4">
//               <p className="text-sm text-slate-600 dark:text-slate-300">
//                 Are you sure you want to permanently delete:
//               </p>
//               <p className="mt-2 font-semibold text-slate-900 dark:text-white">
//                 {deleteUser.firstName} {deleteUser.lastName}
//               </p>
//               <p className="text-sm text-slate-500 dark:text-slate-500">
//                 {deleteUser.role === 'manager' ? 'Branch Manager' :
//                   deleteUser.role === 'restaurant_manager' ? 'Restaurant Manager' :
//                     deleteUser.role === 'hotel_manager' ? 'Hotel Manager' :
//                       deleteUser.role.charAt(0).toUpperCase() + deleteUser.role.slice(1).replace('_', ' ')}
//               </p>
//               {deleteUser.email && (
//                 <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
//                   Email: {deleteUser.email}
//                 </p>
//               )}
//             </div>

//             <div className="mt-6 flex gap-3">
//               <button
//                 onClick={() => setDeleteUser(null)}
//                 className="btn-secondary flex-1"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => {
//                   deleteMutation.mutate(deleteUser.id);
//                   setDeleteUser(null);
//                 }}
//                 className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition disabled:opacity-50"
//                 disabled={deleteMutation.isPending}
//               >
//                 {deleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Edit2, UserX, Layout, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Department + Role config ────────────────────────────────────────────────
type Department = 'restaurant' | 'hotel' | 'both';

const DEPARTMENT_LABELS: Record<Department, string> = {
  restaurant: '🍽️ Restaurant',
  hotel: '🏨 Hotel',
  both: '🏢 Management HQ',
};

const ROLES_BY_DEPARTMENT: Record<Department, string[]> = {
  restaurant: ['restaurant_manager', 'cashier', 'waiter', 'kitchen', 'inventory'],
  hotel: ['hotel_manager', 'receptionist', 'housekeeping'],
  both: ['owner', 'manager'],
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'badge-yellow', manager: 'badge-blue',
  restaurant_manager: 'badge-blue', hotel_manager: 'badge-blue',
  cashier: 'badge-green', waiter: 'badge-slate', kitchen: 'badge-red',
  inventory: 'badge-slate', housekeeping: 'badge-blue', receptionist: 'badge-purple',
};

const ROLE_DEPARTMENT: Record<string, string> = {
  owner: 'Management', manager: 'Management',
  restaurant_manager: 'Restaurant', hotel_manager: 'Hotel',
  cashier: 'Restaurant', waiter: 'Restaurant', kitchen: 'Restaurant', inventory: 'Restaurant',
  receptionist: 'Hotel', housekeeping: 'Hotel',
};

function detectDepartment(role: string): Department {
  if (['restaurant_manager', 'cashier', 'waiter', 'kitchen', 'inventory'].includes(role)) return 'restaurant';
  if (['hotel_manager', 'receptionist', 'housekeeping'].includes(role)) return 'hotel';
  return 'both';
}

function getAvailableRoles(dept: Department, userRole?: string): string[] {
  return ROLES_BY_DEPARTMENT[dept].filter(r => {
    if (userRole === 'owner') return true;
    if (userRole === 'manager') return !['owner', 'manager'].includes(r);
    if (['restaurant_manager', 'hotel_manager'].includes(userRole || '')) {
      return !['owner', 'manager', 'restaurant_manager', 'hotel_manager'].includes(r);
    }
    return false;
  });
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { user, branchId } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [department, setDepartment] = useState<Department>('restaurant');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'cashier', password: '', pin: '', employeeCode: '', branchId: '' });
  
  // Visibility toggles for security fields
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const { data: users, isFetching: isLoading } = useQuery({ 
    queryKey: ['users'], 
    queryFn: async () => {
      try {
        const r = await apiFetch('/api/v1/users');
        const payload = r?.data?.data !== undefined ? r.data.data : r?.data;
        return Array.isArray(payload) ? payload : [];
      } catch (e) { return []; }
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { data: branches } = useQuery({ 
    queryKey: ['branches'], 
    queryFn: async () => {
      try {
        const r = await apiFetch('/api/v1/branches');
        const payload = r?.data?.data !== undefined ? r.data.data : r?.data;
        return Array.isArray(payload) ? payload : [];
      } catch (e) { return []; }
    }, 
    enabled: user?.role === 'owner' 
  });

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    if (user?.role === 'owner') return users;
    if (user?.role === 'manager') return users.filter((u: any) => !['owner', 'manager'].includes(u.role));
    if (user?.role === 'restaurant_manager') return users.filter((u: any) => detectDepartment(u.role) === 'restaurant' && !['owner', 'manager', 'restaurant_manager'].includes(u.role));
    if (user?.role === 'hotel_manager') return users.filter((u: any) => detectDepartment(u.role) === 'hotel' && !['owner', 'manager', 'hotel_manager'].includes(u.role));
    return [];
  }, [users, user?.role]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        employeeCode: form.employeeCode,
      };

      if (user?.role === 'owner' && form.branchId) {
        payload.branchId = form.branchId;
      }
      if (form.password) payload.password = form.password;
      if (form.pin) payload.pin = form.pin;

      return editUser
        ? apiPut(`/api/v1/users/${editUser.id}`, payload)
        : apiPost('/api/v1/users', payload);
    },
    onSuccess: () => {
      toast.success('Employee saved');
      qc.invalidateQueries({ queryKey: ['users'] });
      handleCloseForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/users/${id}`),
    onSuccess: () => {
      toast.success('Employee permanently deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Failed to delete employee'),
  });

  const PERMISSION_GRANTERS = ['owner', 'manager', 'restaurant_manager'];
  const canGrantPermissions = PERMISSION_GRANTERS.includes(user?.role ?? '');

  const permissionMutation = useMutation({
    mutationFn: ({ id, canManageTables }: { id: string; canManageTables: boolean }) =>
      apiPatch(`/api/v1/users/${id}/permissions`, { permissions: { canManageTables } }),
    onSuccess: (_data, { canManageTables }) => {
      toast.success(canManageTables ? 'Table management access granted' : 'Table management access revoked');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Failed to update permission'),
  });

  // ── Unified Departments (Always available based on acting user's role) ──
  const availableDepartments = useMemo(() => {
    return (Object.keys(DEPARTMENT_LABELS) as Department[]).filter(dept => {
      if (user?.role === 'owner' || user?.role === 'manager') return true;
      if (user?.role === 'restaurant_manager') return dept === 'restaurant';
      if (user?.role === 'hotel_manager') return dept === 'hotel';
      return false;
    });
  }, [user?.role]);

  // Auto-switch department if the selected one becomes invalid
  useEffect(() => {
    if (availableDepartments.length > 0 && !availableDepartments.includes(department)) {
      handleDepartmentChange(availableDepartments[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDepartments]);

  const handleDepartmentChange = (dept: Department) => {
    setDepartment(dept);
    const availableRoles = getAvailableRoles(dept, user?.role);
    if (availableRoles.length > 0 && !getAvailableRoles(dept, user?.role).includes(form.role)) {
      setForm((prev) => ({ ...prev, role: availableRoles[0] }));
    }
  };

  const filteredRoles = getAvailableRoles(department, user?.role);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditUser(null);
    setDepartment('restaurant');
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'cashier', password: '', pin: '', employeeCode: '', branchId: '' });
    setShowPassword(false);
    setShowPin(false);
  };

  // Validation Flags for the Save Button
  const isPasswordInvalid = form.password.length > 0 && form.password.length < 8;
  const isNewUserMissingData = !editUser && (!form.password || form.password.length < 8 || !form.pin);
  const isFormValid = !!form.firstName && !!form.email && !!form.phone && !isPasswordInvalid && !isNewUserMissingData;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Employees</h1>
          <p className="text-sm text-slate-900 dark:text-slate-400">{filteredUsers.length} active staff members</p>
        </div>
        <button onClick={() => { setEditUser(null); setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'cashier', password: '', pin: '', employeeCode: '', branchId: branchId || '' }); setShowForm(true); }} className="btn-primary"><Plus size={14} /> Add Employee</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100/50 dark:bg-slate-800/50">
            <tr>
              <th className="th">Name</th>
              <th className="th">Contact</th>
              <th className="th">Role</th>
              {user?.role === 'owner' && <th className="th">Branch</th>}
              <th className="th">Dept</th>
              <th className="th">Employee Code</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="table-row">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
                    </div>
                  </td>
                  <td className="td space-y-1">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="td"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-24 animate-pulse"></div></td>
                  {user?.role === 'owner' && (
                    <td className="td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse"></div></td>
                  )}
                  <td className="td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse"></div></td>
                  <td className="td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div></td>
                  <td className="td"><div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div></td>
                </tr>
              ))
            ) : filteredUsers.map((u: any) => (
              <tr key={u.id} className="table-row">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                    <div><div className="font-medium">{u.firstName} {u.lastName} {u.id === user?.id && <span className="text-amber-500 ml-1 text-xs font-bold">(You)</span>}</div></div>
                  </div>
                </td>
                <td className="td text-slate-900 dark:text-slate-400 text-xs">
                  <div>{u.email}</div>
                  <div>{u.phone}</div>
                </td>
                <td className="td">
                  <span className={ROLE_COLORS[u.role] || 'badge-slate'}>
                    {u.role === 'manager' ? 'Branch Manager' :
                      u.role === 'restaurant_manager' ? 'Restaurant Manager' :
                        u.role === 'hotel_manager' ? 'Hotel Manager' :
                          u.role.charAt(0).toUpperCase() + u.role.slice(1).replace('_', ' ')}
                  </span>
                </td>
                {user?.role === 'owner' && (
                  <td className="td text-slate-900 dark:text-slate-400 text-xs">
                    {u.branchId ? (branches?.find((b: any) => b.id === u.branchId)?.name || 'Unknown Branch') : 'Global'}
                  </td>
                )}
                <td className="td"><span className="text-xs text-slate-900 dark:text-slate-500">{ROLE_DEPARTMENT[u.role] || '—'}</span></td>
                <td className="td text-slate-900 dark:text-slate-400 font-mono">{u.employeeCode || '—'}</td>
                <td className="td">
                  <div className="flex gap-2 items-center">
                    <button onClick={() => {
                      setEditUser(u);
                      const dept = detectDepartment(u.role);
                      setDepartment(dept);
                      setForm({ firstName: u.firstName, lastName: u.lastName || '', email: u.email || '', phone: u.phone || '', role: u.role, password: '', pin: '', employeeCode: u.employeeCode || '', branchId: u.branchId || branchId || '' });
                      setShowForm(true);
                    }} className="btn-ghost p-1.5"><Edit2 size={13} /></button>

                    {canGrantPermissions && u.role === 'waiter' && (
                      <button
                        title={u.permissions?.canManageTables ? 'Revoke table management' : 'Grant table management'}
                        onClick={() => permissionMutation.mutate({ id: u.id, canManageTables: !u.permissions?.canManageTables })}
                        disabled={permissionMutation.isPending}
                        className={cn(
                          'btn-ghost p-1.5 transition-colors',
                          u.permissions?.canManageTables
                            ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'
                            : 'text-slate-400 hover:text-amber-500'
                        )}
                      >
                        {u.permissions?.canManageTables ? <Layout size={13} /> : <Lock size={13} />}
                      </button>
                    )}

                    {u.id !== user?.id && (
                      <button
                        onClick={() => setDeleteUser(u)}
                        className="btn-ghost p-1.5 text-red-600 dark:text-red-400 hover:text-red-300"
                      >
                        <UserX size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredUsers.length === 0 && <tr><td colSpan={user?.role === 'owner' ? 7 : 6} className="text-center py-12 text-slate-900 dark:text-slate-500">No employees added yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{editUser ? 'Edit Employee' : 'Add Employee'}</h3>

            {/* Owner Branch Selection */}
            {user?.role === 'owner' && form.role !== 'owner' && (
              <div>
                <label className="label">Assign Branch *</label>
                <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} disabled={!!branchId}>
                  <option value="" disabled>Select a Branch</option>
                  {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {branchId && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Assigned to your currently selected branch. Switch to "All Branches" to change.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="label">Department *</label>
              <div className="flex gap-2">
                {availableDepartments.length > 0 ? (
                  availableDepartments.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleDepartmentChange(dept)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all',
                        department === dept
                          ? 'bg-amber-500 text-slate-900 border-amber-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-500'
                      )}
                    >
                      {DEPARTMENT_LABELS[dept]}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Please select a branch first to see available departments.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">First Name *</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div><label className="label">Last Name</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editUser} /></div>
              <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!!editUser} /></div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={!!(editUser && editUser.id === user?.id) || filteredRoles.length === 0}>
                  {filteredRoles.map((r) => {
                    const label = r === 'manager' ? 'Branch Manager'
                      : r === 'restaurant_manager' ? 'Restaurant Manager'
                        : r === 'hotel_manager' ? 'Hotel Manager'
                          : r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ');
                    return <option key={r} value={r}>{label}</option>
                  })}
                </select>
              </div>
              <div><label className="label">Employee Code</label><input className="input" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></div>
              
              {form.role === 'owner' && (
                <div className="col-span-2 mt-2 text-xs text-blue-400 bg-blue-400/10 p-2.5 rounded-lg border border-blue-400/20">
                  Owners have global system access and are not restricted to any specific branch.
                </div>
              )}

              {/* ── Security Credentials ── */}
              <div>
                <label className="label">Dashboard Password {editUser ? '(Optional)' : '*'}</label>
                <div className="relative">
                  <input 
                    className={cn("input pr-10", isPasswordInvalid && "border-red-500 focus:ring-red-500 focus:border-red-500")} 
                    type={showPassword ? "text" : "password"} 
                    value={form.password} 
                    onChange={(e) => setForm({ ...form, password: e.target.value })} 
                    placeholder={editUser ? "Leave blank to keep" : "Min 8 chars"} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {isPasswordInvalid && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">Must be at least 8 characters</p>
                )}
              </div>

              <div>
                <label className="label">POS Login PIN {editUser ? '(Optional)' : '*'}</label>
                <div className="relative">
                  <input 
                    className="input pr-10 tracking-widest font-mono" 
                    type={showPin ? "text" : "password"} 
                    maxLength={6} 
                    value={form.pin} 
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} 
                    placeholder={editUser ? "Leave blank to keep" : "4-6 digits"} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPin(!showPin)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCloseForm} className="btn-secondary flex-1">Cancel</button>
              <button 
                onClick={() => {
                  if (editUser && (form.password || form.pin)) {
                    if (!window.confirm('Are you sure you want to update this employee\'s credentials?')) return;
                  }
                  
                  // Block non-owner roles from being Global
                  if (!form.branchId && form.role !== 'owner') {
                    toast.error(`A specific branch must be assigned for the ${form.role.replace('_', ' ')} role.`);
                    return;
                  }

                  saveMutation.mutate();
                }} 
                disabled={saveMutation.isPending || !isFormValid} 
                className="btn-primary flex-1"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <UserX className="text-red-500" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Permanently Delete Employee
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  This action cannot be undone. The employee will be permanently removed from the system.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-100 dark:bg-slate-800 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to permanently delete:
              </p>
              <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                {deleteUser.firstName} {deleteUser.lastName}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {deleteUser.role === 'manager' ? 'Branch Manager' :
                  deleteUser.role === 'restaurant_manager' ? 'Restaurant Manager' :
                    deleteUser.role === 'hotel_manager' ? 'Hotel Manager' :
                      deleteUser.role.charAt(0).toUpperCase() + deleteUser.role.slice(1).replace('_', ' ')}
              </p>
              {deleteUser.email && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Email: {deleteUser.email}
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deleteUser.id);
                  setDeleteUser(null);
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition disabled:opacity-50"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}