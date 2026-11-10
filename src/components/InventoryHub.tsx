import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  Edit3,
  ExternalLink,
  Lock,
  Minus,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { CATEGORIES, OCR_INVOICE_PRESETS } from '../data/mockSariSariData';
import { EnvironmentMode, OcrInvoicePreset, Product, Role, StaffPermissions } from '../types/pos';
import { formatPeso, formatPesoExact, triggerHapticFeedback } from '../utils/localDb';
import { NativeModal } from './NativeModal';
import { ItemProfileDrawer } from './ItemProfileDrawer';
import { useLanguage } from '../context/LanguageContext';

interface ProductEditPayload {
  name: string;
  shortName: string;
  sellingPrice: number;
  wholesaleCost: number;
  lowStockThreshold: number;
}

interface InventoryHubProps {
  products: Product[];
  currentRole: Role;
  environmentMode?: EnvironmentMode;
  isOcrModalOpen: boolean;
  onOpenOcrModal: () => void;
  onCloseOcrModal: () => void;
  onRestockProduct: (productId: string, addedQty: number) => void;
  onUpdateProductDetails: (productId: string, updates: ProductEditPayload) => void;
  onCommitOcrInvoice: (preset: OcrInvoicePreset) => void;
  onSaveProductProfile?: (product: Product, isNew: boolean) => void;
  initialFilterLowOnly?: boolean;
  permissions?: StaffPermissions;
}

export const InventoryHub: React.FC<InventoryHubProps> = React.memo(({
  products,
  currentRole,
  environmentMode = 'DEMO',
  isOcrModalOpen,
  onOpenOcrModal,
  onCloseOcrModal,
  onRestockProduct,
  onUpdateProductDetails,
  onCommitOcrInvoice,
  onSaveProductProfile,
  initialFilterLowOnly = false,
  permissions,
}) => {
  const { t, getCategory, getUnit } = useLanguage();
  const canEditInventory = permissions ? permissions.can_edit_inventory : currentRole === 'OWNER';
  const canViewMargins = permissions ? permissions.can_view_margins : currentRole === 'OWNER';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowOnly, setFilterLowOnly] = useState(initialFilterLowOnly);

  // Item Profile Drawer State
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);

  const handleOpenNewItem = () => {
    triggerHapticFeedback('tap');
    setDrawerProduct(null);
    setIsItemDrawerOpen(true);
  };

  const handleEditItemProfile = (item: Product) => {
    triggerHapticFeedback('tap');
    setDrawerProduct(item);
    setIsItemDrawerOpen(true);
  };

  // Auto-select first low stock item if pre-filtered to low stock
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    if (initialFilterLowOnly) {
      const firstLow = products.find((p) => p.stockQty <= p.lowStockThreshold);
      if (firstLow) return firstLow.id;
    }
    return products[0]?.id || null;
  });

  React.useEffect(() => {
    if (initialFilterLowOnly) {
      setFilterLowOnly(true);
      const firstLow = products.find((p) => p.stockQty <= p.lowStockThreshold);
      if (firstLow) setSelectedProductId(firstLow.id);
    }
  }, [initialFilterLowOnly, products]);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [paneMode, setPaneMode] = useState<'RESTOCK' | 'EDIT_DETAILS'>('RESTOCK');
  const [restockDelta, setRestockDelta] = useState<number>(12);

  // Form states for item editing
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editThreshold, setEditThreshold] = useState('');

  // OCR Presets
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    OCR_INVOICE_PRESETS[0].id
  );
  const [isScanning, setIsScanning] = useState(false);

  const activePreset =
    OCR_INVOICE_PRESETS.find((p) => p.id === selectedPresetId) ||
    OCR_INVOICE_PRESETS[0];

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || products[0] || null;

  const getCategoryLabel = (catId: string) => {
    return getCategory(catId);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (filterLowOnly) return p.stockQty <= p.lowStockThreshold;
      return true;
    });
  }, [products, searchQuery, filterLowOnly]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stockQty <= p.lowStockThreshold).length,
    [products]
  );

  const selectProduct = (item: Product, isMobile = false) => {
    triggerHapticFeedback('tap');
    setSelectedProductId(item.id);
    setRestockDelta(12);
    setEditName(item.name);
    setEditPrice(String(item.sellingPrice));
    setEditCost(String(item.wholesaleCost));
    setEditThreshold(String(item.lowStockThreshold));
    if (isMobile) {
      setIsMobileSheetOpen(true);
    }
  };

  const pluralUnit = (unit: string, count: number) => {
    return getUnit(unit, count);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const newSellingPrice = parseFloat(editPrice) || selectedProduct.sellingPrice;
    const newWholesaleCost = parseFloat(editCost) || selectedProduct.wholesaleCost;
    const newThreshold =
      parseInt(editThreshold, 10) || selectedProduct.lowStockThreshold;

    triggerHapticFeedback('success');
    onUpdateProductDetails(selectedProduct.id, {
      name: editName.trim() || selectedProduct.name,
      shortName: selectedProduct.shortName,
      sellingPrice: newSellingPrice,
      wholesaleCost: newWholesaleCost,
      lowStockThreshold: newThreshold,
    });
    setPaneMode('RESTOCK');
    setIsMobileSheetOpen(false);
  };

  const handleConfirmRestock = () => {
    if (!selectedProduct || restockDelta <= 0) return;
    triggerHapticFeedback('success');
    onRestockProduct(selectedProduct.id, restockDelta);
    setIsMobileSheetOpen(false);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-background text-primary">
      {/* =========================================================================
          LEFT COLUMN: Search, Filters & Master Product List (w-80 to w-96)
         ========================================================================= */}
      <aside
        aria-label="Product Directory"
        className="w-full md:w-80 xl:w-96 h-full flex flex-col border-r border-theme shrink-0 overflow-hidden bg-surface"
      >
        {/* Sticky Header: AI OCR Action + Search + Filter Pills */}
        <div className="shrink-0 p-3 border-b border-theme space-y-2.5 bg-surface">
          {/* Top Actions: [+ Add New Item] & AI Camera OCR Stock-In CTA */}
          {canEditInventory ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenNewItem}
                className="flex-1 min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t('inventory.add_new_item')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  onOpenOcrModal();
                }}
                className="min-h-[38px] px-3 rounded-xl bg-[#006AFF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wide flex items-center gap-1 shrink-0 shadow-sm active:scale-95 transition cursor-pointer"
                title="Snap wholesaler invoice to auto-commit"
              >
                <Camera className="w-3.5 h-3.5 stroke-[2.25]" />
                <span>{t('inventory.ai_ocr')}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface-muted border border-theme text-muted text-[11px] font-mono">
              <Lock className="w-3.5 h-3.5 text-amber-badge shrink-0" />
              <span>Inventory editing locked for role</span>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, SKU, or category..."
              className="w-full min-h-[42px] pl-9 pr-3 rounded-lg bg-surface-muted border border-theme text-xs text-primary placeholder:text-muted focus:outline-none focus:border-[#006AFF]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('tap');
                setFilterLowOnly(false);
              }}
              className={`flex-1 min-h-[34px] px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                !filterLowOnly
                  ? 'bg-[#006AFF] text-white shadow-sm'
                  : 'bg-surface-muted text-muted hover:text-primary'
              }`}
            >
              <span>All Items</span>
              <span className="font-mono text-[10px] opacity-80">({products.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('tap');
                setFilterLowOnly(true);
              }}
              className={`flex-1 min-h-[34px] px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                filterLowOnly
                  ? 'bg-amber-badge text-white shadow-sm'
                  : 'bg-surface-muted text-muted hover:text-primary'
              }`}
            >
              <span>Low Stock</span>
              <span className="font-mono text-[10px] opacity-90">({lowStockCount})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Product List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 pb-24 md:pb-3">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-muted space-y-1.5">
              <div className="text-2xl">📦</div>
              <p className="text-xs font-semibold">No items match your filter</p>
              <p className="text-[11px]">Try adjusting your search query</p>
            </div>
          ) : (
            filteredProducts.map((item) => {
              const isLow = item.stockQty <= item.lowStockThreshold;
              const isSelected = selectedProduct?.id === item.id;
              const catLabel = getCategoryLabel(item.category);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    selectProduct(item, window.innerWidth < 768);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      selectProduct(item, window.innerWidth < 768);
                    }
                  }}
                  className={`w-full text-left rounded-xl p-2.5 border transition cursor-pointer flex items-center justify-between gap-2.5 group ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#006AFF] ring-1 ring-[#006AFF]/30 shadow-sm'
                      : isLow
                        ? 'bg-surface border-amber-500/50 hover:border-amber-500'
                        : 'bg-surface border-theme hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-muted border border-theme flex items-center justify-center text-lg shrink-0 overflow-hidden relative">
                      {item.imageUrl || item.image_url || item.image ? (
                        <img
                          src={item.imageUrl || item.image_url || item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{item.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-primary truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] font-mono text-muted truncate mt-0.5">
                        {item.sku} • {catLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                          isLow
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                            : 'bg-surface-muted text-primary border-theme'
                        }`}
                      >
                        {item.stockQty} {pluralUnit(item.unit, item.stockQty)}
                      </span>
                      <div className="font-mono font-black text-xs text-primary mt-1">
                        {formatPesoExact(item.sellingPrice)}
                      </div>
                    </div>

                    {/* Quick Profile Drawer Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItemProfile(item);
                      }}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-surface-muted text-primary border border-theme transition cursor-pointer"
                      title="Open Item Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* =========================================================================
          RIGHT PANE (Desktop & Tablet >= 768px): Selected Item Details & Stock Count
         ========================================================================= */}
      <section
        aria-label="Item Details & Stock Adjustments"
        className="hidden md:flex flex-1 flex-col h-full bg-surface overflow-hidden"
      >
        {selectedProduct ? (
          <>
            {/* Top Detail Header */}
            <div className="shrink-0 p-4 border-b border-theme bg-surface flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-surface-muted border border-theme flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {selectedProduct.imageUrl || selectedProduct.image_url || selectedProduct.image ? (
                    <img
                      src={selectedProduct.imageUrl || selectedProduct.image_url || selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{selectedProduct.icon}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-primary truncate">
                      {selectedProduct.name}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase border ${
                        selectedProduct.stockQty <= selectedProduct.lowStockThreshold
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                      }`}
                    >
                      {selectedProduct.stockQty <= selectedProduct.lowStockThreshold
                        ? 'Low Stock'
                        : 'In Stock'}
                    </span>
                    {selectedProduct.isFavorite && (
                      <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        ★ Fav
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-muted mt-0.5">
                    SKU: {selectedProduct.sku} • {getCategoryLabel(selectedProduct.category)} • Unit: {selectedProduct.unit}
                  </div>
                </div>
              </div>

              {/* Actions: Item Profile Drawer trigger + Mode Switcher Pills */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleEditItemProfile(selectedProduct)}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 dark:text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t('inventory.item_profile_photo')}</span>
                </button>

                <div className="flex items-center rounded-lg bg-surface-muted p-1 border border-theme">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('tap');
                      setPaneMode('RESTOCK');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      paneMode === 'RESTOCK'
                        ? 'bg-[#006AFF] text-white shadow-sm'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    {t('inventory.stock_count_restock')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('tap');
                      setPaneMode('EDIT_DETAILS');
                      setEditName(selectedProduct.name);
                      setEditPrice(String(selectedProduct.sellingPrice));
                      setEditCost(String(selectedProduct.wholesaleCost));
                      setEditThreshold(String(selectedProduct.lowStockThreshold));
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                      paneMode === 'EDIT_DETAILS'
                        ? 'bg-[#006AFF] text-white shadow-sm'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t('inventory.quick_edit')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Detail Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Snapshot Metric Cards (Square-style) */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl p-3 bg-surface-muted border border-theme">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    {t('inventory.current_on_hand')}
                  </span>
                  <div className="text-2xl font-mono font-black text-primary mt-1">
                    {selectedProduct.stockQty}{' '}
                    <span className="text-xs font-normal text-muted">
                      {pluralUnit(selectedProduct.unit, selectedProduct.stockQty)}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted block mt-1">
                    {t('inventory.min_alert')}: {selectedProduct.lowStockThreshold}
                  </span>
                </div>

                <div className="rounded-xl p-3 bg-surface-muted border border-theme">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    {t('inventory.retail_srp')}
                  </span>
                  <div className="text-2xl font-mono font-black text-primary mt-1">
                    {formatPesoExact(selectedProduct.sellingPrice)}
                  </div>
                  <span className="text-[10px] font-mono text-muted block mt-1">
                    Customer price
                  </span>
                </div>

                <div className="rounded-xl p-3 bg-surface-muted border border-theme">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block flex items-center justify-between">
                    <span>{t('inventory.wholesale_cost')}</span>
                    {!canViewMargins && <Lock className="w-3 h-3 text-amber-500" />}
                  </span>
                  <div className="text-2xl font-mono font-black text-primary mt-1">
                    {canViewMargins ? formatPesoExact(selectedProduct.wholesaleCost) : '₱••••'}
                  </div>
                  <span className="text-[10px] font-mono text-muted block mt-1">
                    {canViewMargins ? 'Supplier unit cost' : 'Cost hidden 🔒'}
                  </span>
                </div>

                <div className="rounded-xl p-3 bg-surface-muted border border-theme">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-btn block flex items-center justify-between">
                    <span>{t('inventory.profit_margin')}</span>
                    {!canViewMargins && <Lock className="w-3 h-3 text-amber-500" />}
                  </span>
                  <div className="text-2xl font-mono font-black text-emerald-btn mt-1">
                    {canViewMargins ? (
                      `+${Math.round(
                        ((selectedProduct.sellingPrice - selectedProduct.wholesaleCost) /
                          selectedProduct.sellingPrice) *
                          100
                      )}%`
                    ) : (
                      '••••%'
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-btn block mt-1">
                    {canViewMargins ? (
                      `+${formatPesoExact(selectedProduct.sellingPrice - selectedProduct.wholesaleCost)} ${t('inventory.profit_per_unit')}`
                    ) : (
                      'Restricted for role 🔒'
                    )}
                  </span>
                </div>
              </div>

              {!canEditInventory && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-3">
                  <Lock className="w-5 h-5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold block">Stock Adjustments Restricted</span>
                    <span className="text-muted text-[11px]">
                      Your active cashier account has view-only permissions for inventory.
                    </span>
                  </div>
                </div>
              )}

              {/* Mode: RESTOCK (Square Stock Count Screen) */}
              {paneMode === 'RESTOCK' ? (
                <div className="space-y-4 max-w-xl">
                  <div className="rounded-2xl bg-surface-muted/60 border border-theme p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-primary">
                        {t('inventory.stock_adjustment')}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-btn bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg">
                        <span>Current: {selectedProduct.stockQty}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>New: {selectedProduct.stockQty + restockDelta}</span>
                      </div>
                    </div>

                    {/* Stepper with Large Input */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback('tap');
                          setRestockDelta((prev) => Math.max(1, prev - 1));
                        }}
                        className="w-14 h-14 rounded-xl bg-surface border border-theme hover:border-slate-400 text-primary flex items-center justify-center active:scale-95 transition shadow-sm"
                      >
                        <Minus className="w-6 h-6" />
                      </button>

                      <div className="flex-1">
                        <input
                          type="number"
                          value={restockDelta}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setRestockDelta(Number.isNaN(val) ? 0 : val);
                          }}
                          className="w-full h-14 rounded-xl bg-surface border border-theme text-center font-mono font-black text-2xl text-primary focus:outline-none focus:border-[#006AFF]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback('tap');
                          setRestockDelta((prev) => prev + 1);
                        }}
                        className="w-14 h-14 rounded-xl bg-[#006AFF] hover:bg-blue-600 text-white flex items-center justify-center active:scale-95 transition shadow-sm"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Quick Add Presets (+6, +12, +24, +48) */}
                    <div>
                      <span className="text-[11px] font-bold text-muted uppercase block mb-1.5">
                        {t('inventory.case_presets')}
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {[6, 12, 24, 48].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => {
                              triggerHapticFeedback('tap');
                              setRestockDelta(qty);
                            }}
                            className={`h-11 rounded-xl font-mono font-bold text-xs border transition ${
                              restockDelta === qty
                                ? 'bg-[#006AFF] text-white border-[#006AFF]'
                                : 'bg-surface border-theme text-primary hover:border-slate-400'
                            }`}
                          >
                            +{qty}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode: EDIT_DETAILS */
                <form onSubmit={handleSaveDetails} className="space-y-4 max-w-xl">
                  <div className="rounded-2xl bg-surface-muted/60 border border-theme p-5 space-y-4">
                    <span className="text-xs font-black uppercase tracking-wider text-primary block">
                      Edit Pricing &amp; Inventory Thresholds
                    </span>

                    <div>
                      <label className="text-xs font-bold text-muted block mb-1">
                        Product Title
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-surface border border-theme text-xs font-bold text-primary focus:outline-none focus:border-[#006AFF]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted block mb-1">
                          Retail Selling Price (SRP ₱)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-theme font-mono font-black text-sm text-primary focus:outline-none focus:border-[#006AFF]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted block mb-1">
                          Low Stock Alert Threshold
                        </label>
                        <input
                          type="number"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(e.target.value)}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-theme font-mono font-black text-sm text-amber-badge focus:outline-none focus:border-[#006AFF]"
                        />
                      </div>
                    </div>

                    {currentRole === 'OWNER' && (
                      <div>
                        <label className="text-xs font-bold text-muted block mb-1">
                          Wholesale Cost (₱) — Owner Only
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          value={editCost}
                          onChange={(e) => setEditCost(e.target.value)}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-theme font-mono font-black text-sm text-emerald-btn focus:outline-none focus:border-[#006AFF]"
                        />
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Pinned Action Footer */}
            <div className="shrink-0 p-4 border-t border-theme bg-surface flex items-center justify-between gap-3">
              <div className="text-xs text-muted">
                {paneMode === 'RESTOCK' ? (
                  <span>
                    Will add <strong>+{restockDelta}</strong> to existing stock of{' '}
                    <strong>{selectedProduct.stockQty}</strong>.
                  </span>
                ) : (
                  <span>Changes will immediately update register and report calculations.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {paneMode === 'RESTOCK' ? (
                  <button
                    type="button"
                    disabled={restockDelta <= 0}
                    onClick={handleConfirmRestock}
                    className="min-h-[48px] px-6 rounded-xl bg-emerald-btn hover:opacity-95 text-white font-black text-xs uppercase tracking-wide flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-40"
                  >
                    <PackagePlus className="w-4 h-4 stroke-[2.5]" />
                    <span>{t('inventory.confirm_restock')} (+{restockDelta})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveDetails}
                    className="min-h-[48px] px-6 rounded-xl bg-[#006AFF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wide flex items-center gap-2 shadow-sm transition active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{t('item_profile.save_changes')}</span>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted space-y-2">
            <Package className="w-12 h-12 stroke-[1.5]" />
            <h3 className="text-sm font-extrabold text-primary">No Product Selected</h3>
            <p className="text-xs max-w-sm">
              Select an item from the left catalog to adjust stock, update retail pricing, or view supply margins.
            </p>
          </div>
        )}
      </section>

      {/* =========================================================================
          MOBILE SHEET MODAL (< 768px): Triggered when tapping an item on mobile
         ========================================================================= */}
      {selectedProduct && (
        <NativeModal
          isOpen={isMobileSheetOpen}
          onClose={() => setIsMobileSheetOpen(false)}
          title={`${selectedProduct.icon} ${selectedProduct.name}`}
          subtitle={`${getCategoryLabel(selectedProduct.category)} • ${selectedProduct.sku}`}
          accentColor="cyan"
          variant="bottom-sheet"
          headerAction={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileSheetOpen(false);
                  handleEditItemProfile(selectedProduct);
                }}
                className="h-8 px-2 rounded-lg border border-sky-500/30 text-xs font-bold text-sky-500 bg-sky-500/10 flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>{t('inventory.item_profile_photo')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setPaneMode((prev) => (prev === 'RESTOCK' ? 'EDIT_DETAILS' : 'RESTOCK'));
                }}
                className="h-8 px-2.5 rounded-lg border border-theme text-xs font-bold text-primary bg-surface-muted cursor-pointer"
              >
                {paneMode === 'RESTOCK' ? t('inventory.quick_edit') : t('inventory.stock_count_restock')}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-2.5 bg-surface-muted border border-theme">
                <span className="text-[10px] font-bold uppercase text-muted block">Stock</span>
                <span className="text-base font-mono font-black text-primary">
                  {selectedProduct.stockQty} {selectedProduct.unit}
                </span>
              </div>
              <div className="rounded-xl p-2.5 bg-surface-muted border border-theme">
                <span className="text-[10px] font-bold uppercase text-muted block">Price</span>
                <span className="text-base font-mono font-black text-primary">
                  {formatPeso(selectedProduct.sellingPrice)}
                </span>
              </div>
              <div className="rounded-xl p-2.5 bg-surface-muted border border-theme">
                <span className="text-[10px] font-bold uppercase text-muted block">Margin</span>
                <span className="text-base font-mono font-black text-emerald-btn">
                  +{Math.round(
                    ((selectedProduct.sellingPrice - selectedProduct.wholesaleCost) /
                      selectedProduct.sellingPrice) *
                      100
                  )}%
                </span>
              </div>
            </div>

            {paneMode === 'RESTOCK' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockDelta((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 rounded-xl bg-surface border border-theme flex items-center justify-center text-primary"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={restockDelta}
                    onChange={(e) => setRestockDelta(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 h-12 rounded-xl bg-surface border border-theme text-center font-mono font-bold text-xl text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setRestockDelta((prev) => prev + 1)}
                    className="w-12 h-12 rounded-xl bg-[#006AFF] text-white flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[6, 12, 24, 48].map((bundle) => (
                    <button
                      key={bundle}
                      type="button"
                      onClick={() => setRestockDelta(bundle)}
                      className={`h-10 rounded-lg font-mono font-bold text-xs border ${
                        restockDelta === bundle
                          ? 'bg-[#006AFF] text-white border-[#006AFF]'
                          : 'bg-surface border-theme text-primary'
                      }`}
                    >
                      +{bundle}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmRestock}
                  className="w-full min-h-[50px] rounded-xl bg-emerald-btn text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm"
                >
                  <PackagePlus className="w-4 h-4 stroke-[2.5]" />
                  <span>{t('inventory.confirm_restock')} (+{restockDelta})</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveDetails} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface border border-theme text-xs text-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-muted block mb-1">
                      Selling Price (₱)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-surface border border-theme font-mono font-bold text-sm text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted block mb-1">
                      Min Alert
                    </label>
                    <input
                      type="number"
                      value={editThreshold}
                      onChange={(e) => setEditThreshold(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-surface border border-theme font-mono font-bold text-sm text-amber-badge"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[50px] rounded-xl bg-[#006AFF] text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Changes</span>
                </button>
              </form>
            )}
          </div>
        </NativeModal>
      )}

      {/* AI Camera OCR Stock-In Modal */}
      <NativeModal
        isOpen={isOcrModalOpen}
        onClose={onCloseOcrModal}
        title="AI Camera OCR Stock-In"
        subtitle="Snap wholesaler invoice or crate -> 1-tap inventory commit"
        accentColor="cyan"
      >
        <div className="space-y-3.5">
          <div className="relative h-36 rounded-2xl bg-surface-muted border border-theme overflow-hidden flex flex-col justify-between p-3 cyber-grid-bg">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#006AFF] to-transparent opacity-80 animate-scanline" />

            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#006AFF]/15 text-[#006AFF] font-bold">
                OCR VISION ENGINE ACTIVE
              </span>
              <span className="text-emerald-btn font-bold">{activePreset.invoiceNo}</span>
            </div>

            <div className="my-auto text-center">
              <div className="text-xs font-bold text-primary">
                {activePreset.supplierName}
              </div>
              <p className="text-[10px] text-muted font-mono mt-0.5">
                {isScanning
                  ? 'Scanning receipt lines & computing margins...'
                  : activePreset.timestamp}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              {OCR_INVOICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    setIsScanning(true);
                    setSelectedPresetId(preset.id);
                    setTimeout(() => setIsScanning(false), 350);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-mono text-[10px] font-bold border transition ${
                    selectedPresetId === preset.id
                      ? 'bg-[#006AFF] text-white border-[#006AFF]'
                      : 'bg-surface text-muted border-theme'
                  }`}
                >
                  {preset.supplierName.split(' ')[0]} Invoice
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted">
              <span>Detected Wholesaler Items ({activePreset.items.length})</span>
              <span className="text-emerald-btn">Auto-Margin Ready</span>
            </div>

            <div className="space-y-1.5 max-h-[210px] overflow-y-auto">
              {activePreset.items.map((row) => {
                const margin = Math.round(
                  ((row.suggestedRetailPrice - row.wholesaleUnitCost) /
                    row.suggestedRetailPrice) *
                    100
                );
                return (
                  <div
                    key={row.productId}
                    className="rounded-xl bg-surface-muted border border-theme p-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-primary">{row.name}</div>
                      <div className="text-[10px] font-mono text-muted">
                        Unit Cost: ₱{row.wholesaleUnitCost.toFixed(2)} → Retail:{' '}
                        <strong className="text-emerald-btn">
                          ₱{row.suggestedRetailPrice.toFixed(2)}
                        </strong>{' '}
                        (+{margin}%)
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-btn/15 border border-emerald-btn/40 text-emerald-btn font-mono font-bold text-xs shrink-0">
                      +{row.detectedQty} pcs
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('success');
              onCommitOcrInvoice(activePreset);
            }}
            className="w-full min-h-[52px] rounded-xl bg-emerald-btn hover:opacity-95 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition"
          >
            <PackagePlus className="w-5 h-5 stroke-[2.25]" />
            <span>1-Tap Commit Stock &amp; Update Margins</span>
          </button>
        </div>
      </NativeModal>

      {/* Item Profile Slide-Out Drawer / Modal */}
      <ItemProfileDrawer
        isOpen={isItemDrawerOpen}
        onClose={() => setIsItemDrawerOpen(false)}
        product={drawerProduct}
        environmentMode={environmentMode}
        canEditInventory={canEditInventory}
        canViewMargins={canViewMargins}
        onSave={(savedProduct, isNew) => {
          if (onSaveProductProfile) {
            onSaveProductProfile(savedProduct, isNew);
          } else {
            // Fallback inline update
            onUpdateProductDetails(savedProduct.id, {
              name: savedProduct.name,
              shortName: savedProduct.shortName,
              sellingPrice: savedProduct.sellingPrice,
              wholesaleCost: savedProduct.wholesaleCost,
              lowStockThreshold: savedProduct.lowStockThreshold,
            });
          }
          setSelectedProductId(savedProduct.id);
        }}
      />
    </div>
  );
});
