import React, { useState } from 'react';
import {
  Store,
  Users,
  UserPlus,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import {
  StoreProfile,
  StoreStaff,
  StaffPermissions,
  DEFAULT_CASHIER_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
} from '../types/pos';
import { NativeModal } from './NativeModal';
import { triggerHapticFeedback } from '../utils/localDb';

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeProfile: StoreProfile;
  staffList: StoreStaff[];
  activeStaffMember: StoreStaff;
  isOwner: boolean;
  onAddStaff: (staff: Omit<StoreStaff, 'id'>) => Promise<void>;
  onUpdateStaff: (staffId: string, updates: Partial<StoreStaff>) => Promise<void>;
  onDeactivateStaff: (staffId: string) => Promise<void>;
  onSignOut: () => void;
  googleUser?: any;
}

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
  isOpen,
  onClose,
  storeProfile,
  staffList,
  activeStaffMember,
  isOwner,
  onAddStaff,
  onUpdateStaff,
  onDeactivateStaff,
  onSignOut,
  googleUser,
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'STAFF'>('STAFF');
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Form fields
  const [workerName, setWorkerName] = useState('');
  const [workerPin, setWorkerPin] = useState('');
  const [workerRole, setWorkerRole] = useState<'cashier' | 'manager'>('cashier');
  const [permissions, setPermissions] = useState<StaffPermissions>({ ...DEFAULT_CASHIER_PERMISSIONS });
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const openAddWorkerModal = () => {
    triggerHapticFeedback('tap');
    setEditingStaffId(null);
    setWorkerName('');
    setWorkerPin('');
    setWorkerRole('cashier');
    setPermissions({ ...DEFAULT_CASHIER_PERMISSIONS });
    setFormError('');
    setIsWorkerModalOpen(true);
  };

  const openEditWorkerModal = (staff: StoreStaff) => {
    triggerHapticFeedback('tap');
    setEditingStaffId(staff.id);
    setWorkerName(staff.name);
    setWorkerPin(staff.pin);
    setWorkerRole(staff.role);
    setPermissions({ ...staff.permissions });
    setFormError('');
    setIsWorkerModalOpen(true);
  };

  const handleRoleChange = (role: 'cashier' | 'manager') => {
    setWorkerRole(role);
    if (role === 'manager') {
      setPermissions({ ...DEFAULT_MANAGER_PERMISSIONS });
    } else {
      setPermissions({ ...DEFAULT_CASHIER_PERMISSIONS });
    }
  };

  const togglePermission = (key: keyof StaffPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) {
      setFormError('Please enter a worker name.');
      return;
    }
    if (!/^\d{4}$/.test(workerPin.trim())) {
      setFormError('PIN must be exactly 4 numeric digits.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      if (editingStaffId) {
        await onUpdateStaff(editingStaffId, {
          name: workerName.trim(),
          pin: workerPin.trim(),
          role: workerRole,
          permissions,
        });
      } else {
        await onAddStaff({
          store_id: storeProfile.id,
          name: workerName.trim(),
          pin: workerPin.trim(),
          role: workerRole,
          is_active: true,
          permissions,
        });
      }
      setIsWorkerModalOpen(false);
      triggerHapticFeedback('success');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save worker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStaffList = staffList.filter((s) => s.is_active !== false);

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="Store Settings & Management"
      subtitle={storeProfile.storeName || 'Sari-Sari Store'}
      accentColor="cyan"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-theme gap-2 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('STAFF')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'STAFF'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-muted hover:text-primary hover:bg-surface-muted'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff &amp; Workers ({activeStaffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-muted hover:text-primary hover:bg-surface-muted'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Store Profile</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: STAFF & WORKERS (OWNER GATED)
           ========================================================================= */}
        {activeTab === 'STAFF' && (
          <div className="space-y-4">
            {!isOwner ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Owner Permission Required</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Only the registered store owner can add, edit, or configure staff permissions. Please switch to the Owner account or ask your manager.
                </p>
              </div>
            ) : (
              <>
                {/* Header Action */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-primary">
                      Store Cashiers &amp; Shift Workers
                    </h3>
                    <p className="text-xs text-muted">
                      Assign 4-digit PINs and granular permissions for each tindero/tindera.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAddWorkerModal}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>+ Add Worker</span>
                  </button>
                </div>

                {/* Worker List */}
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {/* Default Owner Card */}
                  <div className="p-3.5 rounded-2xl bg-surface-muted/80 border border-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/40">
                        👑
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-primary">
                            {storeProfile.ownerName || 'Store Owner'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase">
                            Owner (All Permissions)
                          </span>
                        </div>
                        <p className="text-xs text-muted">
                          {googleUser?.email || 'Full Store Administrator'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-[11px] font-mono text-muted bg-surface px-2.5 py-1 rounded-lg border border-theme">
                        Owner PIN: {storeProfile.ownerPhone ? 'Protected' : 'Linked'}
                      </span>
                    </div>
                  </div>

                  {activeStaffList.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-surface-muted border border-dashed border-theme space-y-3">
                      <Users className="w-10 h-10 text-muted mx-auto opacity-50" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-primary">
                          No Additional Staff Members Registered
                        </p>
                        <p className="text-[11px] text-muted max-w-sm mx-auto">
                          Tap "+ Add Worker" to register Ate May or your cashiers with custom PINs and restricted permissions.
                        </p>
                      </div>
                    </div>
                  ) : (
                    activeStaffList.map((staff) => {
                      const isShowingPin = showPins[staff.id];
                      return (
                        <div
                          key={staff.id}
                          className="p-3.5 rounded-2xl bg-surface border border-theme hover:border-slate-400/50 shadow-xs space-y-2.5 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/30">
                                {staff.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-primary">
                                    {staff.name}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                      staff.role === 'manager'
                                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                    }`}
                                  >
                                    {staff.role}
                                  </span>
                                  {activeStaffMember.id === staff.id && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-mono font-bold">
                                      Active Shift
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                                    <KeyRound className="w-3 h-3 text-muted" />
                                    <span>PIN: {isShowingPin ? staff.pin : '••••'}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowPins((prev) => ({
                                        ...prev,
                                        [staff.id]: !prev[staff.id],
                                      }))
                                    }
                                    className="text-muted hover:text-primary transition"
                                    title={isShowingPin ? 'Hide PIN' : 'Reveal PIN'}
                                  >
                                    {isShowingPin ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditWorkerModal(staff)}
                                className="h-8 px-2.5 rounded-lg bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-theme text-xs font-semibold text-primary flex items-center gap-1 cursor-pointer transition"
                                title="Edit Permissions"
                              >
                                <Edit2 className="w-3 h-3 text-blue-500" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Remove worker "${staff.name}"?`)) {
                                    triggerHapticFeedback('warning');
                                    await onDeactivateStaff(staff.id);
                                  }
                                }}
                                className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center cursor-pointer transition"
                                title="Remove Worker"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Permission Pills */}
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-theme">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                staff.permissions.can_checkout
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-surface-muted text-muted line-through opacity-50'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5" /> Checkout Sales
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                staff.permissions.can_record_pautang
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-surface-muted text-muted line-through opacity-50'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5" /> Charge Pautang
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                staff.permissions.can_settle_pautang
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-surface-muted text-muted line-through opacity-50'
                              }`}
                            >
                              {staff.permissions.can_settle_pautang ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <Lock className="w-2.5 h-2.5" />
                              )}{' '}
                              Settle Pautang
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                staff.permissions.can_edit_inventory
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-surface-muted text-muted line-through opacity-50'
                              }`}
                            >
                              {staff.permissions.can_edit_inventory ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <Lock className="w-2.5 h-2.5" />
                              )}{' '}
                              Edit Inventory
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                staff.permissions.can_view_margins
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-surface-muted text-muted line-through opacity-50'
                              }`}
                            >
                              {staff.permissions.can_view_margins ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <Lock className="w-2.5 h-2.5" />
                              )}{' '}
                              View Margins
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: STORE PROFILE
           ========================================================================= */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface-muted border border-theme space-y-3">
              <div className="flex items-center gap-3">
                {googleUser?.user_metadata?.avatar_url ? (
                  <img
                    src={googleUser.user_metadata.avatar_url}
                    alt="Owner Avatar"
                    className="w-12 h-12 rounded-full border border-theme"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-base">
                    {googleUser?.email ? googleUser.email.charAt(0).toUpperCase() : 'S'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-primary">
                    {storeProfile.storeName}
                  </h3>
                  <p className="text-xs text-muted">
                    {googleUser?.email || storeProfile.ownerName || 'Verified Store'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-theme">
                <div>
                  <span className="text-muted block text-[11px]">Location / Barangay:</span>
                  <span className="font-bold text-primary">
                    {storeProfile.barangayCity || 'Local Store'}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Store ID:</span>
                  <span className="font-mono text-[10px] text-muted break-all">
                    {storeProfile.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-theme flex justify-end">
              <button
                type="button"
                onClick={onSignOut}
                className="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Store</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          ADD / EDIT WORKER MODAL (RESPONSIVE VIEWPORT CONSTRAINED & PINNED FOOTER)
         ========================================================================= */}
      {isWorkerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm p-4 sm:p-6 flex min-h-full items-center justify-center"
        >
          {/* Modal Dialog Card */}
          <form
            onSubmit={handleSaveWorker}
            className="relative w-full max-w-lg my-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Pinned Sticky Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {editingStaffId ? 'Edit Worker Permissions' : 'Add Store Worker'}
                </h3>
                <p className="text-xs text-slate-400">Configure shift PIN &amp; counter permissions</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsWorkerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain text-left">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Full Name input */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Worker Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ate May, Kuya Mark"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {/* 4-Digit Numeric PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>4-Digit Numeric PIN *</span>
                  <span className="text-[11px] font-mono text-slate-400">Shift Clock-In</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={workerPin}
                  onChange={(e) => setWorkerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-800/90 border border-slate-700 font-mono font-bold text-base tracking-widest text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Used by this worker to clock in, switch cashier, and unlock the terminal.
                </p>
              </div>

              {/* Role Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Role Preset
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('cashier')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      workerRole === 'cashier'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Cashier (Tindero)</span>
                      {workerRole === 'cashier' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Counter sales &amp; pautang charges</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('manager')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      workerRole === 'manager'
                        ? 'bg-purple-600/20 border-purple-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Manager / Trusted</span>
                      {workerRole === 'manager' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Inventory, pricing &amp; settlements</div>
                  </button>
                </div>
              </div>

              {/* Granular Permissions Section */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Granular Permissions
                </span>

                <div className="space-y-2">
                  {/* can_checkout */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 cursor-pointer transition">
                    <div>
                      <span className="text-xs text-white font-medium block">
                        Process Cash/GCash Sales
                      </span>
                      <span className="text-[11px] text-slate-400">Operate the register and complete transactions</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.can_checkout}
                      onChange={() => togglePermission('can_checkout')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 ml-3"
                    />
                  </label>

                  {/* can_record_pautang */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 cursor-pointer transition">
                    <div>
                      <span className="text-xs text-white font-medium block">
                        Record Pautang Charges
                      </span>
                      <span className="text-[11px] text-slate-400">Add sales to neighborhood suki credit ledger</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.can_record_pautang}
                      onChange={() => togglePermission('can_record_pautang')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 ml-3"
                    />
                  </label>

                  {/* can_settle_pautang */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 cursor-pointer transition">
                    <div>
                      <span className="text-xs text-white font-medium block">
                        Accept Pautang Payments
                      </span>
                      <span className="text-[11px] text-slate-400">Mark debts as paid and log cash repayments</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.can_settle_pautang}
                      onChange={() => togglePermission('can_settle_pautang')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 ml-3"
                    />
                  </label>

                  {/* can_edit_inventory */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 cursor-pointer transition">
                    <div>
                      <span className="text-xs text-white font-medium block">
                        Edit Stock &amp; Item Pricing
                      </span>
                      <span className="text-[11px] text-slate-400">Add new items and adjust stock quantities</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.can_edit_inventory}
                      onChange={() => togglePermission('can_edit_inventory')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 ml-3"
                    />
                  </label>

                  {/* can_view_margins */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 cursor-pointer transition">
                    <div>
                      <span className="text-xs text-white font-medium block">
                        View Cost Prices &amp; Daily Profit
                      </span>
                      <span className="text-[11px] text-slate-400">See wholesale puhunan and gansya percentages</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.can_view_margins}
                      onChange={() => togglePermission('can_view_margins')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 ml-3"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Pinned Sticky Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsWorkerModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Worker'}
              </button>
            </div>
          </form>
        </div>
      )}
    </NativeModal>
  );
};
