import React, { useState, useEffect, useRef } from 'react';
import { Product, CategoryId, EnvironmentMode } from '../types/pos';
import { CATEGORIES } from '../data/mockSariSariData';
import { uploadProductImage } from '../utils/supabaseStorage';
import { 
  X, 
  Camera, 
  Upload, 
  Trash2, 
  TrendingUp, 
  Star, 
  Check, 
  Loader2, 
  Package, 
  AlertCircle 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ItemProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null; // null if creating a new item
  environmentMode?: EnvironmentMode;
  onSave: (product: Product, isNew: boolean) => void;
}

// Category accent colors matching register
const CATEGORY_COLORS: Record<string, string> = {
  beverages: '#0284C7',
  soap: '#0D9488',
  noodles: '#E11D48',
  tobacco: '#D97706',
  rice: '#059669',
  snacks: '#EA580C',
  favorites: '#F59E0B',
};

export const ItemProfileDrawer: React.FC<ItemProfileDrawerProps> = ({
  isOpen,
  onClose,
  product,
  environmentMode = 'DEMO',
  onSave,
}) => {
  const { t, getCategory } = useLanguage();
  const isNew = !product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [category, setCategory] = useState<Exclude<CategoryId, 'favorites'>>('snacks');
  const [unit, setUnit] = useState('pack');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number | string>(0);
  const [wholesaleCost, setWholesaleCost] = useState<number | string>(0);
  const [stock, setStock] = useState<number | string>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | string>(5);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Image State
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Selectable categories excluding 'favorites' meta-category
  const selectableCategories = CATEGORIES.filter((c) => c.id !== 'favorites');

  // Initialize or reset form when modal opens or product changes
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setShortName(product.shortName || product.name || '');
      setCategory(product.category || 'snacks');
      setUnit(product.unit || 'pack');
      setSku(product.sku || '');
      setPrice(product.sellingPrice ?? 0);
      setWholesaleCost(product.wholesaleCost ?? 0);
      setStock(product.stockQty ?? 0);
      setLowStockThreshold(product.lowStockThreshold ?? 5);
      setIsFavorite(Boolean(product.isFavorite));
      setImageUrl(product.imageUrl || product.image_url || product.image || '');
    } else {
      setName('');
      setShortName('');
      setCategory('snacks');
      setUnit('pack');
      setSku(`SKU-${Date.now().toString().slice(-6)}`);
      setPrice(0);
      setWholesaleCost(0);
      setStock(10);
      setLowStockThreshold(5);
      setIsFavorite(false);
      setImageUrl('');
    }
    setUploadError(null);
  }, [product, isOpen]);

  // Handle Photo File Pick
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const tempId = product?.id || `prod_${Date.now()}`;
      const uploadedUrl = await uploadProductImage(file, tempId, environmentMode);
      setImageUrl(uploadedUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
      setUploadError('Failed to process image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setImageUrl('');
    setUploadError(null);
  };

  // Calculations for Kita and Margin
  const numPrice = Number(price) || 0;
  const numCost = Number(wholesaleCost) || 0;
  const kita = numPrice - numCost;
  const marginPct = numPrice > 0 ? (kita / numPrice) * 100 : 0;
  const isProfit = kita >= 0;

  // Category Theme Color Helper
  const categoryColor = CATEGORY_COLORS[category] || '#0284C7';

  // Save handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Product name is required');
      return;
    }

    const trimmedName = name.trim();
    const finalShortName = shortName.trim() || trimmedName.slice(0, 18);
    const finalSku = sku.trim() || `SKU-${Date.now().toString().slice(-6)}`;

    const savedProduct: Product = {
      ...(product || {
        hourlyVelocity: 0,
        daysSinceLastSale: 0,
        voiceAliases: [finalShortName.toLowerCase()],
      }),
      id: product?.id || `prod-${Date.now()}`,
      name: trimmedName,
      shortName: finalShortName,
      sku: finalSku,
      category,
      unit: unit.trim() || 'piece',
      sellingPrice: numPrice,
      wholesaleCost: numCost,
      stockQty: Number(stock) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      isFavorite,
      accentColor: categoryColor,
      icon: imageUrl || product?.icon || '📦',
      imageUrl: imageUrl || undefined,
      image_url: imageUrl || undefined,
      image: imageUrl || undefined,
    };

    onSave(savedProduct, isNew);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border-l border-slate-800 text-slate-100 h-full flex flex-col shadow-2xl relative slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div 
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20 shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
            <div className="min-w-0">
              <h2 id="drawer-title" className="text-lg font-bold text-white tracking-wide truncate">
                {isNew ? t('item_profile.create_title') : t('item_profile.edit_title')}
              </h2>
              <p className="text-xs text-slate-400 font-mono truncate">
                {isNew ? t('item_profile.add_subtitle') : `Item ID: ${product?.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Close Drawer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* PHOTO UPLOADER SECTION */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-800/40 rounded-2xl border border-slate-800">
            <div className="relative group">
              <div 
                className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-inner relative transition-transform hover:scale-[1.02]"
                style={{ borderColor: imageUrl ? categoryColor : undefined }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name || 'Product Preview'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Package className="w-12 h-12 stroke-1 mb-1" />
                    <span className="text-[11px] font-medium tracking-wider uppercase text-slate-400">{t('item_profile.no_image')}</span>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white backdrop-blur-xs">
                    <Loader2 className="w-7 h-7 animate-spin text-sky-400 mb-1" />
                    <span className="text-xs">{t('item_profile.processing')}</span>
                  </div>
                )}
              </div>

              {/* Quick Trigger Floating Camera Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-2 -right-2 p-2.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-white rounded-full shadow-lg ring-4 ring-slate-900 transition-all cursor-pointer"
                title={t('item_profile.upload_photo')}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden File Input (supports direct camera on mobile/tablet) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Photo Action Buttons */}
            <div className="flex items-center space-x-2 mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{imageUrl ? t('item_profile.replace_photo') : t('item_profile.upload_photo')}</span>
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('item_profile.remove_photo')}</span>
                </button>
              )}
            </div>

            {uploadError && (
              <p className="mt-2 text-xs text-rose-400 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </p>
            )}

            <span className="text-[11px] text-slate-500 mt-2 text-center">
              {t('item_profile.sync_hint')}
            </span>
          </div>

          {/* CORE DETAILS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
              {t('item_profile.core_details')}
            </h3>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('item_profile.item_name')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!shortName || shortName === name) {
                    setShortName(e.target.value.slice(0, 18));
                  }
                }}
                placeholder="e.g. Kopiko Blanca 30g, Lucky Me Pancit Canton"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
              />
            </div>

            {/* Display / Short Name on Register Tile */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('item_profile.tile_short_name')}
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. Kopiko Blanca (fits on tile)"
                maxLength={24}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('item_profile.category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Exclude<CategoryId, 'favorites'>)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                >
                  {selectableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {getCategory(cat.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('item_profile.unit_label')}
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="sachet, bottle, pc, pack, kg"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>
            </div>

            {/* Barcode / SKU */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('item_profile.sku_barcode')}
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Scan or type barcode"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* FINANCIALS & MARGIN */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
              {t('item_profile.pricing_margin')}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('item_profile.selling_price')} <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('item_profile.cost_puhunan')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={wholesaleCost}
                    onChange={(e) => setWholesaleCost(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 text-base"
                  />
                </div>
              </div>
            </div>

            {/* DYNAMIC PROFIT MARGIN BADGE */}
            <div 
              className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                isProfit 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className={`w-4 h-4 ${isProfit ? 'text-emerald-400' : 'text-rose-400 rotate-180'}`} />
                <span className="text-xs font-medium">
                  {isProfit ? `${t('item_profile.kita_margin')}:` : `${t('item_profile.lugi_margin')}:`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold tracking-tight">
                  {isProfit ? '₱' : '-₱'}{Math.abs(kita).toFixed(2)}
                </span>
                <span className="text-xs font-semibold ml-1.5 opacity-90">
                  ({marginPct.toFixed(1)}% margin)
                </span>
              </div>
            </div>
          </div>

          {/* INVENTORY CONTROLS & FAVORITE */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
              {t('item_profile.inventory_pinning')}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('item_profile.current_stock')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('item_profile.low_stock_alert')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>
            </div>

            {/* Pin as Top Favorite Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isFavorite ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                  <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t('item_profile.top_favorite')}</div>
                  <div className="text-xs text-slate-400">{t('item_profile.top_favorite_desc')}</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isFavorite}
                onClick={() => setIsFavorite(!isFavorite)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isFavorite ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isFavorite ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-end space-x-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('item_profile.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-sky-500 hover:bg-sky-400 active:scale-95 text-white shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{isNew ? t('item_profile.create_item') : t('item_profile.save_changes')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
