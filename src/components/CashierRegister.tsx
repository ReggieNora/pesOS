import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronUp,
  Minus,
  Percent,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { CATEGORIES } from '../data/mockSariSariData';
import { CartItem, CategoryId, Product, Role } from '../types/pos';
import { formatPeso, formatPesoExact, triggerHapticFeedback } from '../utils/localDb';
import { useLanguage } from '../context/LanguageContext';

interface CashierRegisterProps {
  products: Product[];
  cart: CartItem[];
  currentRole: Role;
  customerName?: string | null;
  onAddProduct: (product: Product) => void;
  onDecrementProduct: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateItemQty?: (productId: string, qty: number) => void;
  onClearCart: () => void;
  onOpenVoiceModal: () => void;
  onOpenCashModal: (presetBill?: number | null) => void;
  onOpenPautangModal: () => void;
  onInstantCashSale: (cashTendered: number, changeGiven: number) => void;
  onOpenOcrModal?: () => void;
}

// Dynamic category color schemes, background tints, and card accents
interface CategoryThemeConfig {
  canvasBg: string;
  cardBorder: string;
  cardBorderHover: string;
  activeRing: string;
  solidBadgeBg: string;
  solidBadgeText: string;
  accentBadge: string;
  tabBorder: string;
  breadcrumbBadge: string;
}

const CATEGORY_THEMES: Record<CategoryId | 'all', CategoryThemeConfig> = {
  all: {
    canvasBg: 'bg-[#F8FAFC] dark:bg-[#0F172A]',
    cardBorder: 'border-theme',
    cardBorderHover: 'hover:border-slate-300 dark:hover:border-slate-600',
    activeRing: 'ring-2 ring-[#006AFF]/30 dark:ring-[#006AFF]/40',
    solidBadgeBg: 'bg-slate-700',
    solidBadgeText: 'text-white',
    accentBadge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20',
    tabBorder: 'border-b-2 border-blue-600 dark:border-blue-400',
    breadcrumbBadge: 'bg-[#006AFF]/15 border border-[#006AFF]/30 text-[#006AFF]',
  },
  beverages: {
    canvasBg: 'bg-blue-50/70 dark:bg-blue-950/40',
    cardBorder: 'border-blue-500/30 dark:border-blue-500/30',
    cardBorderHover: 'hover:border-blue-500/60',
    activeRing: 'ring-2 ring-blue-500/40',
    solidBadgeBg: 'bg-[#0284C7]',
    solidBadgeText: 'text-white',
    accentBadge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20',
    tabBorder: 'border-b-2 border-sky-600 dark:border-sky-400',
    breadcrumbBadge: 'bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400',
  },
  noodles: {
    canvasBg: 'bg-rose-50/70 dark:bg-rose-950/40',
    cardBorder: 'border-rose-500/30 dark:border-rose-500/30',
    cardBorderHover: 'hover:border-rose-500/60',
    activeRing: 'ring-2 ring-rose-500/40',
    solidBadgeBg: 'bg-[#E11D48]',
    solidBadgeText: 'text-white',
    accentBadge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20',
    tabBorder: 'border-b-2 border-rose-600 dark:border-rose-400',
    breadcrumbBadge: 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400',
  },
  soap: {
    canvasBg: 'bg-teal-50/70 dark:bg-teal-950/40',
    cardBorder: 'border-teal-500/30 dark:border-teal-500/30',
    cardBorderHover: 'hover:border-teal-500/60',
    activeRing: 'ring-2 ring-teal-500/40',
    solidBadgeBg: 'bg-[#059669]',
    solidBadgeText: 'text-white',
    accentBadge: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20',
    tabBorder: 'border-b-2 border-emerald-600 dark:border-emerald-400',
    breadcrumbBadge: 'bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400',
  },
  snacks: {
    canvasBg: 'bg-orange-50/70 dark:bg-orange-950/40',
    cardBorder: 'border-orange-500/30 dark:border-orange-500/30',
    cardBorderHover: 'hover:border-orange-500/60',
    activeRing: 'ring-2 ring-orange-500/40',
    solidBadgeBg: 'bg-[#EA580C]',
    solidBadgeText: 'text-white',
    accentBadge: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20',
    tabBorder: 'border-b-2 border-orange-600 dark:border-orange-400',
    breadcrumbBadge: 'bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400',
  },
  rice: {
    canvasBg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    cardBorder: 'border-emerald-500/30 dark:border-emerald-500/30',
    cardBorderHover: 'hover:border-emerald-500/60',
    activeRing: 'ring-2 ring-emerald-500/40',
    solidBadgeBg: 'bg-[#15803D]',
    solidBadgeText: 'text-white',
    accentBadge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
    tabBorder: 'border-b-2 border-emerald-600 dark:border-emerald-400',
    breadcrumbBadge: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  },
  tobacco: {
    canvasBg: 'bg-amber-50/70 dark:bg-amber-950/40',
    cardBorder: 'border-amber-500/30 dark:border-amber-500/30',
    cardBorderHover: 'hover:border-amber-500/60',
    activeRing: 'ring-2 ring-amber-500/40',
    solidBadgeBg: 'bg-[#D97706]',
    solidBadgeText: 'text-white',
    accentBadge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
    tabBorder: 'border-b-2 border-amber-600 dark:border-amber-400',
    breadcrumbBadge: 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400',
  },
  favorites: {
    canvasBg: 'bg-indigo-50/70 dark:bg-indigo-950/40',
    cardBorder: 'border-indigo-500/30 dark:border-indigo-500/30',
    cardBorderHover: 'hover:border-indigo-500/60',
    activeRing: 'ring-2 ring-indigo-500/40',
    solidBadgeBg: 'bg-[#4F46E5]',
    solidBadgeText: 'text-white',
    accentBadge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20',
    tabBorder: 'border-b-2 border-indigo-600 dark:border-indigo-400',
    breadcrumbBadge: 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
  },
};

// Square-style solid colored category folder tiles
interface CategoryFolderDef {
  id: CategoryId;
  name: string;
  emoji: string;
  bgClass: string;
  activeRing: string;
}

const CATEGORY_FOLDER_TILES: CategoryFolderDef[] = [
  {
    id: 'favorites',
    name: 'Top Favorites',
    emoji: '⭐',
    bgClass: 'bg-[#4F46E5] hover:bg-indigo-700',
    activeRing: 'ring-4 ring-indigo-300',
  },
  {
    id: 'beverages',
    name: 'Beverages',
    emoji: '🥤',
    bgClass: 'bg-[#0284C7] hover:bg-sky-700',
    activeRing: 'ring-4 ring-sky-300',
  },
  {
    id: 'noodles',
    name: 'Noodles & Cans',
    emoji: '🍜',
    bgClass: 'bg-[#E11D48] hover:bg-rose-700',
    activeRing: 'ring-4 ring-rose-300',
  },
  {
    id: 'soap',
    name: 'Soap & Care',
    emoji: '🧼',
    bgClass: 'bg-[#059669] hover:bg-emerald-700',
    activeRing: 'ring-4 ring-emerald-300',
  },
  {
    id: 'snacks',
    name: 'Snacks & Chips',
    emoji: '🥨',
    bgClass: 'bg-[#EA580C] hover:bg-orange-700',
    activeRing: 'ring-4 ring-orange-300',
  },
  {
    id: 'rice',
    name: 'Rice / Bigas',
    emoji: '🌾',
    bgClass: 'bg-[#15803D] hover:bg-green-700',
    activeRing: 'ring-4 ring-green-300',
  },
  {
    id: 'tobacco',
    name: 'Tobacco & Tingi',
    emoji: '🚬',
    bgClass: 'bg-[#D97706] hover:bg-amber-700',
    activeRing: 'ring-4 ring-amber-300',
  },
];

function getProductInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function isEmoji(str?: string): boolean {
  if (!str) return false;
  return /\p{Extended_Pictographic}/u.test(str) || /[\u{1F300}-\u{1F9FF}]/u.test(str);
}

function getProductVisualAsset(product: Product) {
  const anyProd = product as any;
  const rawImage = anyProd.imageUrl || anyProd.image_url || anyProd.image;
  const isImageString = (val?: string) =>
    typeof val === 'string' &&
    (val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('data:image/') ||
      val.startsWith('blob:') ||
      val.startsWith('/') ||
      val.startsWith('./') ||
      /\.(png|jpe?g|webp|svg|gif)(\?.*)?$/i.test(val));

  const imageUrl = isImageString(rawImage)
    ? rawImage
    : isImageString(product.icon)
    ? product.icon
    : null;

  const rawEmoji = anyProd.emoji || product.icon;
  const emoji = isEmoji(rawEmoji) ? rawEmoji : null;

  return { imageUrl, emoji };
}

export const CashierRegister: React.FC<CashierRegisterProps> = React.memo(({
  products,
  cart,
  currentRole,
  customerName,
  onAddProduct,
  onDecrementProduct,
  onRemoveProduct,
  onUpdateItemQty,
  onClearCart,
  onOpenCashModal,
  onOpenPautangModal,
  onOpenOcrModal,
}) => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Custom Amount Modal State (Tile B: [ ⚡ Custom Peso / Manual ])
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customLabel, setCustomLabel] = useState('Custom Item');

  // Quick inline item edit popover state
  const [editingItem, setEditingItem] = useState<{
    cartItem: CartItem;
    tempQty: number;
    discountPct: number;
  } | null>(null);

  // Compact search state matching Square header
  const [productSearch, setProductSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Failed image URLs set for smooth fallback (keyed by image URL so updating a product photo clears fallback)
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());

  const handleImageError = (failedUrl: string) => {
    setFailedImageUrls((prev) => {
      const next = new Set(prev);
      next.add(failedUrl);
      return next;
    });
  };

  // Filter items for category tabs & compact search
  const visibleProducts = useMemo(() => {
    let list: Product[] = [];
    if (activeCategory === 'all') {
      // Prioritize favorites first when all items are shown
      list = [...products].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    } else if (activeCategory === 'favorites') {
      list = products.filter((p) => p.isFavorite);
    } else {
      list = products.filter((p) => p.category === activeCategory);
    }

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortName.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, productSearch]);

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.product.id, item.qty);
    }
    return map;
  }, [cart]);

  const totalItems = useMemo(
    () => cart.reduce((acc, item) => acc + item.qty, 0),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.product.sellingPrice * item.qty, 0),
    [cart]
  );

  const categoryTabList: { id: CategoryId | 'all'; label: string; emoji: string }[] = [
    { id: 'all', label: t('catalog.all_items'), emoji: '📦' },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.shortLabel, emoji: c.emoji })),
  ];

  const getCategoryItemCount = (catId: CategoryId) => {
    if (catId === 'favorites') {
      return products.filter((p) => p.isFavorite).length;
    }
    return products.filter((p) => p.category === catId).length;
  };

  const catalogScrollRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number>(0);

  const activeCategoryDef = useMemo(
    () => CATEGORY_FOLDER_TILES.find((c) => c.id === activeCategory),
    [activeCategory]
  );

  const activeCategoryTheme = useMemo(
    () => CATEGORY_THEMES[activeCategory] || CATEGORY_THEMES.all,
    [activeCategory]
  );

  const handleResetCategories = () => {
    triggerHapticFeedback('tap');
    setActiveCategory('all');
    if (catalogScrollRef.current) {
      catalogScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCatalogWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (activeCategory !== 'all' && catalogScrollRef.current) {
      if (catalogScrollRef.current.scrollTop <= 0 && e.deltaY < -15) {
        handleResetCategories();
      }
    }
  };

  const handleCatalogTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleCatalogTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeCategory !== 'all' && catalogScrollRef.current) {
      if (catalogScrollRef.current.scrollTop <= 0) {
        const pullDelta = e.touches[0].clientY - touchStartYRef.current;
        if (pullDelta > 45) {
          handleResetCategories();
        }
      }
    }
  };

  const handleConfirmCustomAmount = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = parseFloat(customAmount);
    if (!amt || amt <= 0) return;

    triggerHapticFeedback('success');
    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      sku: 'CUSTOM-AMT',
      name: customLabel.trim() || 'Custom Item',
      shortName: customLabel.trim() || 'Custom Item',
      category: 'snacks',
      isFavorite: false,
      icon: '⚡',
      accentColor: '#475569',
      unit: 'item',
      wholesaleCost: Math.round(amt * 0.75),
      sellingPrice: amt,
      stockQty: 999,
      lowStockThreshold: 0,
      hourlyVelocity: 0,
      daysSinceLastSale: 0,
      voiceAliases: ['custom'],
    };

    onAddProduct(customProduct);
    setCustomAmount('');
    setCustomLabel('Custom Item');
    setIsCustomModalOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full overflow-hidden relative select-none bg-background text-primary">
      {/* =========================================================================
          LEFT MAIN PANEL (flex-1): Utility & Category Tiles + Product Grid
         ========================================================================= */}
      <section
        aria-label="Product Catalog"
        className={`flex-1 flex flex-col min-w-0 border-r border-theme overflow-hidden h-full transition-colors duration-300 ease-in-out ${activeCategoryTheme.canvasBg}`}
        style={{ transition: 'background-color 300ms ease' }}
      >
        {/* Category Tabs (Minimalist Underlined Word Tabs + Compact Search matching Square POS) */}
        <div className="shrink-0 px-3.5 pt-2 bg-surface/90 backdrop-blur-md border-b border-theme shadow-sm flex items-center justify-between gap-3 overflow-hidden">
          {isSearchOpen ? (
            <div className="flex-1 flex items-center gap-2 pb-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  autoFocus
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={t('catalog.search_placeholder')}
                  className="w-full pl-8 pr-7 py-1 rounded-lg border border-theme bg-surface-muted text-xs text-primary focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setProductSearch('');
                }}
                className="text-xs font-semibold text-muted hover:text-primary px-1.5 py-1 cursor-pointer shrink-0"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-5 md:gap-6 overflow-x-auto no-scrollbar py-0.5">
                {categoryTabList.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const catTheme = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES.all;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback('tap');
                        setActiveCategory(cat.id);
                        if (productSearch) setProductSearch('');
                      }}
                      className={`pb-2.5 pt-1 text-xs whitespace-nowrap transition cursor-pointer shrink-0 ${
                        isActive
                          ? `text-primary font-bold ${catTheme.tabBorder}`
                          : 'text-slate-500 dark:text-slate-400 hover:text-primary font-medium'
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Compact Search Icon */}
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setIsSearchOpen(true);
                }}
                title="Search products"
                className="pb-2 pt-1 text-slate-500 hover:text-primary transition shrink-0 cursor-pointer p-1"
              >
                <Search className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Scrollable Catalog Area with Pull-Down / Scroll-Up Reveal Listener */}
        <div
          ref={catalogScrollRef}
          onWheel={handleCatalogWheel}
          onTouchStart={handleCatalogTouchStart}
          onTouchMove={handleCatalogTouchMove}
          className="flex-1 overflow-y-auto p-3 pb-36 md:pb-4 space-y-3 relative"
        >
          {/* =====================================================================
              1. SLIM STICKY BREADCRUMB BAR (Active during Category Drilldown Takeover)
             ===================================================================== */}
          {activeCategory !== 'all' && (
            <div className="sticky top-0 z-20 -mx-3 -mt-3 mb-2 px-3 py-2 bg-surface/95 backdrop-blur-md border-b border-theme flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={handleResetCategories}
                  className="h-8 px-2.5 rounded-lg bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-800 border border-theme text-xs font-bold text-primary flex items-center gap-1.5 active:scale-95 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('catalog.all_categories')}</span>
                </button>
                <span className="text-muted">•</span>
                <span className={`px-2.5 py-1 rounded-md border font-bold text-xs flex items-center gap-1.5 truncate ${activeCategoryTheme.breadcrumbBadge}`}>
                  <span>{activeCategoryDef?.emoji}</span>
                  <span className="truncate">{activeCategoryDef?.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    ({visibleProducts.length} {t('catalog.items_count')})
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleResetCategories}
                className="text-[10px] font-mono text-muted hover:text-primary flex items-center gap-1 shrink-0"
                title={t('catalog.pull_reveal')}
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">{t('catalog.pull_reveal')}</span>
              </button>
            </div>
          )}

          {/* =====================================================================
              2. TOP ROW(S): CATEGORIES & QUICK ACTIONS GRID (Collapsible on Drilldown)
             ===================================================================== */}
          <div
            className={`transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] origin-top ${
              activeCategory === 'all'
                ? 'max-h-[850px] opacity-100 translate-y-0 space-y-2'
                : 'max-h-0 opacity-0 -translate-y-4 pointer-events-none overflow-hidden m-0 p-0'
            }`}
            style={{
              transition:
                'max-height 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-muted px-0.5">
              <span>{t('catalog.categories_actions')}</span>
              <span className="text-[10px] font-mono text-muted">{t('catalog.tap_category_hint')}</span>
            </div>

            {/* High-Contrast Grid of Category & Utility Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {/* Utility Tile: [ ⚡ Custom ₱ Amount ] (First Slot) */}
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setCustomAmount('');
                  setCustomLabel(t('catalog.custom_item'));
                  setIsCustomModalOpen(true);
                }}
                className="group relative min-h-[110px] sm:min-h-[120px] rounded-xl p-3 bg-slate-700 hover:bg-slate-800 text-white flex flex-col justify-between text-left transition-all active:scale-[0.97] shadow-sm cursor-pointer"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                    <Zap className="w-5 h-5 stroke-[2.25]" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/25 uppercase tracking-wide">
                    Manual
                  </span>
                </div>
                <div>
                  <div className="font-black text-xs sm:text-sm leading-tight text-white">
                    {t('catalog.custom_amount')}
                  </div>
                  <div className="text-[10px] font-mono text-white/80 mt-0.5">
                    Quick Keypad
                  </div>
                </div>
              </button>

              {/* Square Colored Category Tiles */}
              {CATEGORY_FOLDER_TILES.map((cat) => {
                const count = getCategoryItemCount(cat.id);
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('tap');
                      setActiveCategory(cat.id);
                      if (catalogScrollRef.current) {
                        catalogScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`group relative min-h-[110px] sm:min-h-[120px] rounded-xl p-3 text-white flex flex-col justify-between text-left transition-all active:scale-[0.97] shadow-sm cursor-pointer ${
                      cat.bgClass
                    } ${
                      isActive
                        ? `${cat.activeRing} ring-offset-2 ring-offset-background scale-[1.02] shadow-lg`
                        : 'opacity-95 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="text-2xl drop-shadow-sm">{cat.emoji}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-white text-slate-900 font-mono font-black text-[10px] uppercase shadow-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs sm:text-sm leading-tight text-white truncate">
                        {cat.name}
                      </div>
                      <div className="text-[10px] font-mono text-white/85 mt-0.5">
                        {count} items
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =====================================================================
              3. PRODUCT GRID (FULL TAKE-OVER ON CATEGORY DRILLDOWN)
             ===================================================================== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-muted px-0.5">
              <span>
                {activeCategory === 'all'
                  ? 'All Items (Favorites & Top Sellers First)'
                  : `${categoryTabList.find((c) => c.id === activeCategory)?.label} Catalog`}
              </span>
              <span className="font-mono text-muted">{visibleProducts.length} products</span>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="rounded-xl bg-surface border border-theme p-10 text-center space-y-2 mt-4">
                <div className="text-3xl">📦</div>
                <div className="text-sm font-extrabold text-primary">
                  No items in this category
                </div>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Select another category or restock items in the Inventory tab.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {visibleProducts.map((product) => {
                  const inCartQty = cartQtyMap.get(product.id) || 0;
                  const itemCatTheme = CATEGORY_THEMES[product.category] || CATEGORY_THEMES.all;
                  const initials = getProductInitials(product.shortName);
                  const isLowStock = product.stockQty <= product.lowStockThreshold;
                  const isFiltered = activeCategory !== 'all';

                  // Apply the category's solid color directly to the outer tile wrapper
                  const fullBleedBg = isFiltered
                    ? activeCategoryTheme.solidBadgeBg
                    : itemCatTheme.solidBadgeBg;

                  const { imageUrl, emoji } = getProductVisualAsset(product);
                  const hasValidImage = Boolean(imageUrl && !failedImageUrls.has(imageUrl));

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback('tap');
                        onAddProduct(product);
                      }}
                      className={`rounded-xl p-3 flex flex-col justify-between relative shadow-sm hover:brightness-105 active:scale-[0.98] transition-all min-h-[160px] sm:min-h-[175px] text-left select-none cursor-pointer ${fullBleedBg} ${
                        inCartQty > 0 ? 'ring-4 ring-white shadow-lg brightness-105' : ''
                      }`}
                    >
                      {/* Top Section: Product icon or centered image asset + Pinned quantity badge */}
                      <div className="flex items-start justify-between w-full">
                        {hasValidImage ? (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-black/20 shadow-inner flex items-center justify-center shrink-0">
                            <img
                              src={imageUrl!}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={() => handleImageError(imageUrl!)}
                              loading="lazy"
                            />
                          </div>
                        ) : emoji ? (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner shrink-0">
                            <span className="text-3xl sm:text-4xl drop-shadow select-none">
                              {emoji}
                            </span>
                          </div>
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center font-mono font-black text-xl text-white backdrop-blur-xs shadow-inner shrink-0">
                            {initials}
                          </div>
                        )}

                        {/* Quantity / Stock Badge: Pinned cleanly to top-right corner with a high-contrast pill */}
                        <div className="flex items-center gap-1">
                          {inCartQty > 0 ? (
                            <span className="bg-white text-slate-900 font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                              {inCartQty}
                            </span>
                          ) : isLowStock ? (
                            <span className="bg-black/35 text-amber-200 backdrop-blur-xs font-bold text-xs px-2 py-0.5 rounded-full">
                              {product.stockQty} {t('catalog.left')}
                            </span>
                          ) : (
                            <span className="bg-white/25 text-white backdrop-blur-xs font-bold text-xs px-2 py-0.5 rounded-full">
                              {product.stockQty}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Section: Title, Subtitle/Unit, and High-Contrast Price */}
                      <div className="mt-3 min-w-0">
                        <div className="text-white font-semibold text-base leading-tight line-clamp-2">
                          {product.shortName}
                        </div>
                        <div className="text-white/80 text-xs mt-0.5 truncate">
                          {product.unit}
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <div className="text-white font-bold text-lg">
                            {formatPeso(product.sellingPrice)}
                          </div>
                          {currentRole === 'OWNER' && (
                            <span className="text-[10px] font-mono text-white/70">
                              c: ₱{product.wholesaleCost.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          RIGHT SIDEBAR (Desktop & Tablet >= 768px): Persistent Ticket / Order Summary
         ========================================================================= */}
      <aside
        aria-label="Current Ticket"
        className="hidden md:flex flex-col w-80 xl:w-96 h-full bg-surface border-l border-theme shrink-0 overflow-hidden"
      >
        {/* Ticket Header */}
        <div className="shrink-0 px-3.5 py-3 border-b border-theme flex items-center justify-between bg-surface-muted/50">
          <span className="text-xs font-black uppercase tracking-wider text-muted">
            {t('ticket.title')}
          </span>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('warning');
                onClearCart();
              }}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('ticket.clear_all')}</span>
            </button>
          )}
        </div>

        {/* Scrollable Receipt Item List with Qty Steppers & Line Subtotals */}
        <div className="flex-1 overflow-y-auto divide-y divide-theme p-2 space-y-1">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted space-y-2">
              <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-xl">
                🛒
              </div>
              <p className="text-xs font-semibold">{t('ticket.empty_title')}</p>
              <p className="text-[11px]">{t('ticket.empty_desc')}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setEditingItem({
                    cartItem: item,
                    tempQty: item.qty,
                    discountPct: 0,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingItem({ cartItem: item, tempQty: item.qty, discountPct: 0 });
                  }
                }}
                className="p-2.5 rounded-lg hover:bg-surface-muted transition flex items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-primary truncate">
                    {item.product.shortName}
                  </div>
                  <div className="text-[11px] font-mono text-muted">
                    {formatPeso(item.product.sellingPrice)} × {item.qty}
                  </div>
                </div>

                {/* Inline Qty Steppers + Line Subtotal */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center rounded-lg border border-theme bg-surface overflow-hidden">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticFeedback('tap');
                        onDecrementProduct(item.product.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-muted active:scale-95"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-mono font-bold text-xs text-primary">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticFeedback('tap');
                        onAddProduct(item.product);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-primary active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-mono font-black text-xs text-primary min-w-[56px] text-right">
                    {formatPesoExact(item.product.sellingPrice * item.qty)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sticky Ticket Footer: Subtotal, Total, and Two Primary Action Buttons */}
        <div className="shrink-0 p-3.5 border-t border-theme bg-surface space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{t('ticket.items')} ({totalItems})</span>
              <span className="font-mono font-bold">{formatPesoExact(subtotal)}</span>
            </div>
            <div className="flex items-baseline justify-between pt-1 border-t border-theme">
              <span className="text-sm font-black uppercase text-primary">{t('ticket.total')}</span>
              <span className="text-2xl font-mono font-black text-primary">
                {formatPesoExact(subtotal)}
              </span>
            </div>
          </div>

          {/* Action Area: High-visibility Primary CHARGE + Secondary Pautang */}
          <div className="space-y-2 pt-1">
            {/* Primary full-width button: [ 💵 Cash / Charge ₱XXX.XX ] */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                triggerHapticFeedback('tap');
                onOpenCashModal(null);
              }}
              className="w-full min-h-[54px] rounded-xl bg-[#006AFF] hover:bg-blue-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-base uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Wallet className="w-5 h-5 stroke-[2.5]" />
              <span>{t('ticket.cash_charge')} {formatPesoExact(subtotal)}</span>
            </button>

            {/* Secondary button: [ 📒 Charge to Pautang ] */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                triggerHapticFeedback('tap');
                onOpenPautangModal();
              }}
              className="w-full min-h-[44px] rounded-xl border-2 border-amber-500/70 hover:border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition"
            >
              <span>📒 {t('ticket.charge_pautang')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE VIEW (< 768px): Fixed Square-Style Bottom Bar + Expandable Ticket Drawer
         ========================================================================= */}
      {cart.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticFeedback('tap');
            setIsMobileDrawerOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsMobileDrawerOpen(true);
          }}
          className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-surface border-t border-theme shadow-2xl cursor-pointer"
        >
          <div className="p-2.5 flex items-center justify-between gap-3">
            {/* Left side: 🛒 5 items • ₱162.00 */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">🛒</span>
              <span className="font-extrabold text-xs sm:text-sm text-primary truncate">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} • {formatPesoExact(subtotal)}
              </span>
              <ChevronUp className="w-4 h-4 text-muted shrink-0" />
            </div>

            {/* Right side: [ Charge ₱162.00 → ] */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback('tap');
                setIsMobileDrawerOpen(true);
              }}
              className="min-h-[44px] px-4 rounded-xl bg-[#006AFF] hover:bg-blue-600 active:scale-95 text-white font-black text-xs uppercase tracking-wide flex items-center gap-1.5 shrink-0 shadow-sm transition"
            >
              <span>{t('ticket.cash_charge')} {formatPesoExact(subtotal)} →</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Drawer Bottom Sheet Overlay */}
      {isMobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="md:hidden fixed inset-0 z-50 bg-black/60 flex flex-col justify-end backdrop-blur-sm"
        >
          <div className="w-full max-h-[90vh] bg-surface rounded-t-2xl border-t border-theme flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="p-3 border-b border-theme flex items-center justify-between bg-surface-muted">
              <div>
                <div className="font-extrabold text-sm text-primary">
                  {t('ticket.title')} ({totalItems} {t('ticket.items')})
                </div>
                <div className="text-[11px] font-mono text-muted">
                  {t('ticket.total')}: {formatPesoExact(subtotal)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface border border-theme flex items-center justify-center text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-theme">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-primary truncate">
                      {item.product.shortName}
                    </div>
                    <div className="text-[11px] font-mono text-muted">
                      {formatPeso(item.product.sellingPrice)} {t('ticket.each')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center rounded-lg border border-theme bg-surface-muted">
                      <button
                        type="button"
                        onClick={() => onDecrementProduct(item.product.id)}
                        className="w-7 h-7 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAddProduct(item.product)}
                        className="w-7 h-7 flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-mono font-black text-xs min-w-[50px] text-right">
                      {formatPesoExact(item.product.sellingPrice * item.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Actions */}
            <div className="p-3 border-t border-theme bg-surface space-y-2">
              <div className="flex items-baseline justify-between py-1">
                <span className="text-xs font-bold text-muted uppercase">{t('ticket.total_due')}</span>
                <span className="text-xl font-mono font-black text-primary">
                  {formatPesoExact(subtotal)}
                </span>
              </div>

              {/* Primary CHARGE */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onOpenCashModal(null);
                }}
                className="w-full min-h-[52px] rounded-xl bg-[#006AFF] hover:bg-blue-600 active:scale-95 disabled:opacity-40 text-white font-black text-base uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Wallet className="w-5 h-5 stroke-[2.5]" />
                <span>{t('ticket.cash_charge')} {formatPesoExact(subtotal)}</span>
              </button>

              {/* Secondary Pautang */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onOpenPautangModal();
                }}
                className="w-full min-h-[44px] rounded-xl border-2 border-amber-500/70 hover:border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 disabled:opacity-40 text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition"
              >
                <span>📒 {t('ticket.charge_pautang')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CUSTOM ₱ AMOUNT (Tile B: [ ⚡ Custom Peso / Manual ])
         ========================================================================= */}
      {isCustomModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-theme shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-primary">Custom ₱ Amount</h3>
                  <p className="text-[11px] text-muted">Add non-catalog charge to ticket</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-muted border border-theme flex items-center justify-center text-muted hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Amount Chips */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Quick Increment Chips
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('tap');
                      setCustomAmount(String(amt));
                    }}
                    className={`h-9 rounded-lg font-mono font-bold text-xs border transition ${
                      parseFloat(customAmount) === amt
                        ? 'bg-[#006AFF] text-white border-[#006AFF] shadow-sm'
                        : 'bg-surface-muted border-theme text-primary hover:border-slate-400'
                    }`}
                  >
                    +₱{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                Charge Amount (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-mono font-black text-muted">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.5"
                  autoFocus
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-12 pl-8 pr-3 rounded-xl bg-surface-muted border border-theme text-xl font-mono font-black text-primary focus:outline-none focus:border-[#006AFF]"
                />
              </div>
            </div>

            {/* Quick Preset Labels */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Quick Description Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Yelo / Ice', price: '5' },
                  { label: 'Plastic Bag', price: '2' },
                  { label: 'E-Load', price: '50' },
                  { label: 'Delivery Fee', price: '20' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('tap');
                      setCustomLabel(preset.label);
                      if (!customAmount) setCustomAmount(preset.price);
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-surface-muted border border-theme text-muted hover:text-primary hover:border-slate-400 active:scale-95 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Label Input */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                Item Title / Note
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Custom Item"
                className="w-full h-10 px-3 rounded-xl bg-surface-muted border border-theme text-xs font-bold text-primary focus:outline-none focus:border-[#006AFF]"
              />
            </div>

            {/* Submit Action */}
            <button
              type="button"
              disabled={!customAmount || parseFloat(customAmount) <= 0}
              onClick={handleConfirmCustomAmount}
              className="w-full min-h-[48px] rounded-xl bg-[#006AFF] hover:bg-blue-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>
                Add {formatPesoExact(parseFloat(customAmount) || 0)} to Ticket
              </span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          QUICK INLINE ITEM EDIT / DISCOUNT POPOVER MODAL
         ========================================================================= */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-xl bg-surface border border-theme shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-2">
              <div className="min-w-0">
                <div className="font-extrabold text-sm text-primary truncate">
                  {editingItem.cartItem.product.name}
                </div>
                <div className="text-[11px] font-mono text-muted">
                  Base Price: {formatPesoExact(editingItem.cartItem.product.sellingPrice)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-lg bg-surface-muted border border-theme flex items-center justify-center text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quantity Stepper */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted block">
                Quantity
              </label>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, tempQty: Math.max(1, prev.tempQty - 1) } : null
                    )
                  }
                  className="w-12 h-11 rounded-lg bg-surface-muted border border-theme flex items-center justify-center text-primary font-bold active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono font-black text-2xl text-primary">
                  {editingItem.tempQty}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, tempQty: prev.tempQty + 1 } : null
                    )
                  }
                  className="w-12 h-11 rounded-lg bg-[#006AFF] text-white flex items-center justify-center font-bold active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Discount Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-[#006AFF]" />
                <span>Line Discount</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 5, 10, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() =>
                      setEditingItem((prev) => (prev ? { ...prev, discountPct: pct } : null))
                    }
                    className={`min-h-[36px] rounded-lg font-mono font-bold text-xs border transition ${
                      editingItem.discountPct === pct
                        ? 'bg-[#006AFF] border-[#006AFF] text-white'
                        : 'bg-surface-muted border-theme text-muted'
                    }`}
                  >
                    {pct === 0 ? 'None' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Save or Remove Actions */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-theme">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('warning');
                  onRemoveProduct(editingItem.cartItem.product.id);
                  setEditingItem(null);
                }}
                className="min-h-[44px] px-3.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('success');
                  if (onUpdateItemQty) {
                    onUpdateItemQty(editingItem.cartItem.product.id, editingItem.tempQty);
                  }
                  setEditingItem(null);
                }}
                className="flex-1 min-h-[44px] rounded-lg bg-[#006AFF] hover:bg-blue-600 text-white font-bold text-xs uppercase"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
