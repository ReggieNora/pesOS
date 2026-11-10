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
          ADD / EDIT WORKER MODAL
         ========================================================================= */}
      {isWorkerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-surface rounded-3xl border border-theme shadow-2xl p-5 space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h4 className="font-black text-sm text-primary">
                  {editingStaffId ? 'Edit Worker Profile' : 'Add New Staff Member'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkerModalOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="space-y-4">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold">
                  {formError}
                </div>
              )}

              {/* Worker Name */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  Worker Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder='e.g., "Ate May", "Kuya Mark"'
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-surface-muted border border-theme text-xs font-medium text-primary focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* 4-Digit Numeric PIN */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  4-Digit Numeric PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={workerPin}
                  onChange={(e) => setWorkerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full h-11 px-3 rounded-xl bg-surface-muted border border-theme font-mono font-bold text-base tracking-widest text-primary focus:outline-none focus:border-[#2563EB]"
                />
                <p className="text-[10px] text-muted mt-1 font-mono">
                  Used by the cashier to clock in and unlock the terminal.
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">
                  Role Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('cashier')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      workerRole === 'cashier'
                        ? 'bg-blue-600/15 border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                        : 'bg-surface-muted border-theme text-muted font-medium'
                    }`}
                  >
                    <div className="text-xs font-bold">Cashier (Tindero)</div>
                    <div className="text-[10px] text-muted mt-0.5">Counter sales &amp; pautang list</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('manager')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      workerRole === 'manager'
                        ? 'bg-purple-600/15 border-purple-600 text-purple-600 dark:text-purple-400 font-bold'
                        : 'bg-surface-muted border-theme text-muted font-medium'
                    }`}
                  >
                    <div className="text-xs font-bold">Manager / Trusted</div>
                    <div className="text-[10px] text-muted mt-0.5">Inventory &amp; debt settlements</div>
                  </button>
                </div>
              </div>

              {/* Permission Toggles */}
              <div className="space-y-2 pt-1 border-t border-theme">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-muted">
                  Granular Permissions
                </span>

                <div className="space-y-2">
                  {/* can_checkout */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-surface-muted border border-theme cursor-pointer">
                    <span className="text-xs text-primary font-medium">
                      Process Cash/GCash Sales
                    </span>
                    <input
                      type="checkbox"
                      checked={permissions.can_checkout}
                      onChange={() => togglePermission('can_checkout')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                    />
                  </label>

                  {/* can_record_pautang */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-surface-muted border border-theme cursor-pointer">
                    <span className="text-xs text-primary font-medium">
                      Record Pautang Charges
                    </span>
                    <input
                      type="checkbox"
                      checked={permissions.can_record_pautang}
                      onChange={() => togglePermission('can_record_pautang')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                    />
                  </label>

                  {/* can_settle_pautang */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-surface-muted border border-theme cursor-pointer">
                    <div>
                      <span className="text-xs text-primary font-medium block">
                        Accept Pautang Payments
                      </span>
                      <span className="text-[10px] text-muted">Mark debts as paid and log cash repayments</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.can_settle_pautang}
                      onChange={() => togglePermission('can_settle_pautang')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                    />
                  </label>

                  {/* can_edit_inventory */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-surface-muted border border-theme cursor-pointer">
                    <div>
                      <span className="text-xs text-primary font-medium block">
                        Edit Stock &amp; Item Pricing
                      </span>
                      <span className="text-[10px] text-muted">Add new items and adjust inventory quantities</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.can_edit_inventory}
                      onChange={() => togglePermission('can_edit_inventory')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                    />
                  </label>

                  {/* can_view_margins */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-surface-muted border border-theme cursor-pointer">
                    <div>
                      <span className="text-xs text-primary font-medium block">
                        View Cost Prices &amp; Daily Profit
                      </span>
                      <span className="text-[10px] text-muted">See wholesale puhunan and gansya percentages</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.can_view_margins}
                      onChange={() => togglePermission('can_view_margins')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                    />
                  </label>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-muted text-xs font-bold text-muted hover:text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingStaffId ? 'Update Worker' : 'Add Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </NativeModal>
  );
};
