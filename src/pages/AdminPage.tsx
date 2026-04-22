import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserPlus, Envelope, User, WarningCircle, Buildings, X,
  CircleNotch, UserMinus, Eye, EyeSlash, PencilSimple, ShieldCheck,
} from "@phosphor-icons/react";
import { useAuth, type UserRole } from "../contexts/AuthContext";
import {
  apiListUsers, apiAdminCreateUser, apiAdminUpdateUser, apiDeactivateUser,
  type BackendUser,
} from "../lib/api";

const DASHBOARD_SLUGS = ['executive', 'finance', 'transport', 'operations', 'procurement', 'inventory', 'data_entry'];
const SLUG_LABELS: Record<string, string> = {
  executive: 'Executive', finance: 'Finance', transport: 'Transport',
  operations: 'Operations', procurement: 'Procurement', inventory: 'Inventory', data_entry: 'Data Entry',
};
const ROLES: UserRole[] = ['super_admin', 'admin', 'user'];
const ROLE_LABELS: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', user: 'User' };
const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-accent-glow text-accent',
  admin: 'bg-blue-500/10 text-blue-400',
  user: 'bg-surface text-t2',
};

interface AddForm { fullName: string; email: string; password: string; role: UserRole; dashboardAccess: string[] }
interface EditForm { fullName: string; email: string; role: UserRole; dashboardAccess: string[]; isActive: boolean }
const INIT_ADD: AddForm = { fullName: '', email: '', password: '', role: 'user', dashboardAccess: [] };

function toggleSlug(current: string[], slug: string): string[] {
  return current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
}

function DashboardCheckboxes({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {DASHBOARD_SLUGS.map((slug) => {
        const checked = value.includes(slug);
        return (
          <button
            key={slug}
            type="button"
            disabled={disabled}
            onClick={() => onChange(toggleSlug(value, slug))}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              checked
                ? 'border-accent bg-accent-glow text-accent'
                : 'border-border bg-surface text-t2 hover:border-accent/40'
            } disabled:opacity-50`}
          >
            <Buildings size={13} weight={checked ? 'duotone' : 'regular'} className={checked ? 'text-accent' : 'text-t3'} />
            {SLUG_LABELS[slug]}
          </button>
        );
      })}
    </div>
  );
}

function RoleSelector({ value, onChange }: { value: UserRole; onChange: (r: UserRole) => void }) {
  return (
    <div className="flex gap-2">
      {ROLES.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          className={`flex-1 py-2 px-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
            value === role
              ? 'border-accent bg-accent-glow text-accent'
              : 'border-border bg-surface text-t2 hover:border-accent/40 hover:text-t1'
          }`}
        >
          {ROLE_LABELS[role]}
        </button>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<BackendUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<BackendUser | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [addForm, setAddForm] = useState<AddForm>(INIT_ADD);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    fullName: '', email: '', role: 'user', dashboardAccess: [], isActive: true,
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await apiListUsers({ limit: '100' });
      if (res.success) setUsers(res.data.users);
      else setFetchError(res.message || 'Failed to load users.');
    } catch {
      setFetchError('Something went wrong loading users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'super_admin') loadUsers();
  }, [loadUsers, currentUser?.role]);

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="bg-red-500/10 p-6 rounded-full mb-6">
          <WarningCircle size={48} weight="duotone" className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-t1 mb-2">Access Denied</h2>
        <p className="text-t3 max-w-sm">Only super admins can manage accounts.</p>
      </div>
    );
  }

  const openAdd = () => {
    setAddForm(INIT_ADD);
    setShowPassword(false);
    setSubmitError('');
    setShowAddModal(true);
  };

  const openEdit = (u: BackendUser) => {
    setEditUser(u);
    setEditForm({
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      dashboardAccess: u.dashboardAccess ?? [],
      isActive: u.isActive,
    });
    setSubmitError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const res = await apiAdminCreateUser(addForm);
      if (res.success) {
        setShowAddModal(false);
        await loadUsers();
      } else {
        setSubmitError(res.errors?.[0]?.message || res.message || 'Failed to create user.');
      }
    } catch {
      setSubmitError('Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const res = await apiAdminUpdateUser(editUser._id, editForm);
      if (res.success) {
        setEditUser(null);
        await loadUsers();
      } else {
        setSubmitError(res.errors?.[0]?.message || res.message || 'Failed to update user.');
      }
    } catch {
      setSubmitError('Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      await apiDeactivateUser(deleteUser._id);
      setDeleteUser(null);
      await loadUsers();
    } catch {
      // silently fail — list will refresh
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-t1 tracking-tight">Account Management</h1>
            <p className="text-t3 text-sm mt-0.5">Create, edit, and deactivate user accounts.</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-h text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <UserPlus size={18} weight="bold" />
            Add User
          </button>
        </div>

        {/* Users list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <CircleNotch size={24} weight="bold" className="animate-spin text-accent" />
            </div>
          )}
          {fetchError && (
            <p className="text-sm text-red-500 text-center py-10">{fetchError}</p>
          )}
          {!loading && !fetchError && users.length === 0 && (
            <p className="text-sm text-t3 text-center py-10 italic">No users found.</p>
          )}
          {!loading && users.length > 0 && (
            <div className="divide-y divide-border">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 bg-surface">
                <span className="text-[10px] font-bold text-t3 uppercase tracking-widest">User</span>
                <span className="text-[10px] font-bold text-t3 uppercase tracking-widest">Role</span>
                <span className="text-[10px] font-bold text-t3 uppercase tracking-widest">Status</span>
                <span className="text-[10px] font-bold text-t3 uppercase tracking-widest">Actions</span>
              </div>

              {users.map((u) => (
                <div key={u._id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-surface/50 transition-colors">
                  {/* Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {u.fullName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-t1 truncate">{u.fullName}</p>
                      <p className="text-xs text-t3 truncate">{u.email}</p>
                      {u.role !== 'super_admin' && u.dashboardAccess?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.dashboardAccess.map((slug) => (
                            <span key={slug} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface border border-border text-[10px] text-t3">
                              {SLUG_LABELS[slug] ?? slug}
                            </span>
                          ))}
                        </div>
                      )}
                      {u.role === 'super_admin' && (
                        <div className="flex items-center gap-1 mt-1">
                          <ShieldCheck size={12} weight="duotone" className="text-accent" />
                          <span className="text-[10px] text-accent font-medium">Full access</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${ROLE_BADGE[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>

                  {/* Status */}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
                    u.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      title="Edit user"
                      className="p-2 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
                    >
                      <PencilSimple size={16} weight="regular" />
                    </button>
                    <button
                      onClick={() => setDeleteUser(u)}
                      title="Deactivate user"
                      disabled={u._id === currentUser?.id}
                      className="p-2 rounded-lg text-t3 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <UserMinus size={16} weight="regular" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add User Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              key="add-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => !isSubmitting && setShowAddModal(false)}
            />
            <motion.div
              key="add-dialog"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="text-base font-bold text-t1">Add New User</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="p-6 space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
                      <input
                        type="text" required autoFocus
                        value={addForm.fullName}
                        onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                        placeholder="Jane Doe"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-t1 placeholder-t3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Email</label>
                    <div className="relative">
                      <Envelope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
                      <input
                        type="email" required
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        placeholder="jane@company.com"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-t1 placeholder-t3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={addForm.password}
                        onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                        placeholder="Min. 8 chars, uppercase, number, symbol"
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-surface text-t1 placeholder-t3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-t2 transition-colors"
                      >
                        {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
                      </button>
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Role</label>
                    <RoleSelector value={addForm.role} onChange={(r) => setAddForm({ ...addForm, role: r, dashboardAccess: [] })} />
                  </div>

                  {/* Dashboard Access (not for super_admin) */}
                  {addForm.role !== 'super_admin' && (
                    <div>
                      <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Dashboard Access</label>
                      <DashboardCheckboxes
                        value={addForm.dashboardAccess}
                        onChange={(v) => setAddForm({ ...addForm, dashboardAccess: v })}
                      />
                    </div>
                  )}

                  {submitError && <p className="text-xs text-red-500">{submitError}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-accent hover:bg-accent-h disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <><CircleNotch size={16} weight="bold" className="animate-spin" /> Creating…</>
                    ) : (
                      <><UserPlus size={16} weight="bold" /> Create Account</>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Edit User Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editUser && (
          <>
            <motion.div
              key="edit-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => !isSubmitting && setEditUser(null)}
            />
            <motion.div
              key="edit-dialog"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <div>
                    <h2 className="text-base font-bold text-t1">Edit User</h2>
                    <p className="text-xs text-t3 mt-0.5">{editUser.email}</p>
                  </div>
                  <button
                    onClick={() => setEditUser(null)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-surface transition-colors"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>

                <form onSubmit={handleUpdate} className="p-6 space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
                      <input
                        type="text" required autoFocus
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-t1 placeholder-t3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Email</label>
                    <div className="relative">
                      <Envelope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
                      <input
                        type="email" required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-t1 placeholder-t3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Role</label>
                    <RoleSelector
                      value={editForm.role}
                      onChange={(r) => setEditForm({ ...editForm, role: r, dashboardAccess: r === 'super_admin' ? [] : editForm.dashboardAccess })}
                    />
                  </div>

                  {/* Dashboard Access */}
                  {editForm.role !== 'super_admin' && (
                    <div>
                      <label className="text-xs font-semibold text-t3 uppercase tracking-widest block mb-1.5">Dashboard Access</label>
                      <DashboardCheckboxes
                        value={editForm.dashboardAccess}
                        onChange={(v) => setEditForm({ ...editForm, dashboardAccess: v })}
                      />
                    </div>
                  )}

                  {/* Active toggle */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface border border-border">
                    <span className="text-sm font-medium text-t1">Account Active</span>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                      className={`relative w-10 h-5.5 rounded-full transition-colors ${editForm.isActive ? 'bg-accent' : 'bg-border'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${editForm.isActive ? 'translate-x-4.5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {submitError && <p className="text-xs text-red-500">{submitError}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-accent hover:bg-accent-h disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <><CircleNotch size={16} weight="bold" className="animate-spin" /> Saving…</>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ────────────────────────────────── */}
      <AnimatePresence>
        {deleteUser && (
          <>
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => !isDeleting && setDeleteUser(null)}
            />
            <motion.div
              key="delete-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserMinus size={22} weight="duotone" className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-t1 mb-1">Deactivate account?</h2>
                <p className="text-xs text-t3 mb-5">
                  <span className="font-semibold text-t2">{deleteUser.fullName}</span> will lose all access and be signed out from all sessions.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDeactivate}
                    disabled={isDeleting}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <><CircleNotch size={18} weight="bold" className="animate-spin" /> Deactivating…</>
                    ) : (
                      'Deactivate'
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteUser(null)}
                    disabled={isDeleting}
                    className="w-full py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
