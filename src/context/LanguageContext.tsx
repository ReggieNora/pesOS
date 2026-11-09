import React, { createContext, useContext, useState, useEffect } from 'react';

export type Locale = 'en' | 'ceb';

export const LANGUAGE_STORAGE_KEY = 'pesos_language';

export const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation / Bottom Nav
    'nav.register': 'Register',
    'nav.inventory': 'Inventory',
    'nav.pautang': 'Pautang',
    'nav.dashboard': 'Dashboard',
    'nav.switch_user': 'Switch User',
    'nav.owner': 'Owner',
    'nav.cashier': 'Cashier',

    // Session & Header
    'header.demo_mode': 'Demo Mode',
    'header.exit_demo': 'Exit Demo',
    'header.switch_user': 'Switch User',
    'header.lock_station': 'Lock Station',
    'header.lock_terminal': 'Lock Terminal',
    'header.terminal_locked': 'POS Terminal Locked',
    'header.enter_pin': 'Enter PIN to unlock station',
    'header.light_mode': 'Switch to Daylight Light Mode',
    'header.dark_mode': 'Switch to Dark Mode',

    // Ticket & Cart Actions
    'ticket.title': 'Current Ticket',
    'ticket.clear_all': 'Clear All',
    'ticket.empty_title': 'Ticket is empty',
    'ticket.empty_desc': 'Tap items or categories to build an order',
    'ticket.items': 'Items',
    'ticket.total': 'Total',
    'ticket.total_due': 'Total Due',
    'ticket.cash_charge': 'Cash / Charge',
    'ticket.charge_pautang': 'Charge to Pautang',
    'ticket.each': 'each',

    // Register / Catalog
    'catalog.categories_actions': 'Categories & Quick Actions',
    'catalog.tap_category_hint': 'Tap category to view items',
    'catalog.all_categories': 'All Categories',
    'catalog.all_items': 'All Items',
    'catalog.custom_amount': 'Custom ₱ Amount',
    'catalog.custom_item': 'Custom Item',
    'catalog.pull_reveal': 'Pull down to reveal',
    'catalog.items_count': 'items',
    'catalog.search_placeholder': 'Search products, SKU, snacks...',
    'catalog.no_items_match': 'No items found matching',
    'catalog.clear_search': 'Clear search',
    'catalog.left': 'left',

    // Financials & Stock
    'finance.cost': 'Wholesale Cost',
    'finance.cost_puhunan': 'Cost Price / Puhunan',
    'finance.profit': 'Profit',
    'finance.kita_margin': 'Kita / Tubo per unit',
    'finance.lugi_margin': 'Lugi per unit',
    'finance.retail_srp': 'Retail SRP',
    'finance.selling_price': 'Retail Selling Price (₱)',
    'finance.in_stock': 'In Stock',
    'finance.low_stock': 'Low Stock',
    'finance.out_of_stock': 'Out of Stock',
    'finance.current_stock': 'Current Stock',
    'finance.current_on_hand': 'Current On-Hand',
    'finance.low_stock_alert': 'Low Stock Alert At',
    'finance.available_credit': 'Available Room',
    'finance.utang_balance': 'Current Utang Balance',

    // Item Profile Drawer
    'item_profile.create_title': 'Create New Item',
    'item_profile.edit_title': 'Edit Item Profile',
    'item_profile.add_subtitle': 'Add inventory item to catalog',
    'item_profile.upload_photo': 'Upload / Camera',
    'item_profile.replace_photo': 'Replace Photo',
    'item_profile.remove_photo': 'Remove',
    'item_profile.no_image': 'No Image',
    'item_profile.processing': 'Processing...',
    'item_profile.sync_hint': 'Syncs immediately to Register tile and receipt displays',
    'item_profile.core_details': 'Core Details',
    'item_profile.item_name': 'Item Full Name',
    'item_profile.tile_short_name': 'Register Tile Short Name',
    'item_profile.category': 'Category',
    'item_profile.unit_label': 'Unit Label',
    'item_profile.sku_barcode': 'Barcode / SKU',
    'item_profile.pricing_margin': 'Pricing & Margin',
    'item_profile.inventory_pinning': 'Inventory & Pinning',
    'item_profile.top_favorite': 'Top Favorite',
    'item_profile.top_favorite_desc': 'Pin to top of Cashier Register quick tiles',
    'item_profile.save_changes': 'Save Changes',
    'item_profile.create_item': 'Create Item',
    'item_profile.cancel': 'Cancel',

    // Inventory Hub
    'inventory.add_new_item': 'Add New Item',
    'inventory.ai_ocr': 'AI OCR',
    'inventory.stock_count_restock': 'Stock Count & Restock',
    'inventory.quick_edit': 'Quick Edit',
    'inventory.item_profile_photo': 'Item Profile & Photo',
  },
  ceb: {
    // Navigation / Bottom Nav
    'nav.register': 'Tinda',
    'nav.inventory': 'Imbentaryo',
    'nav.pautang': 'Utang',
    'nav.dashboard': 'Taho/Halin',
    'nav.switch_user': 'Ilis og Tindera',
    'nav.owner': 'Tag-iya',
    'nav.cashier': 'Tindera',

    // Session & Header
    'header.demo_mode': 'Demo Pa',
    'header.exit_demo': 'Gawas sa Demo',
    'header.switch_user': 'Ilis og Tindera',
    'header.lock_station': 'Kandado',
    'header.lock_terminal': 'Kandadohon ang POS',
    'header.terminal_locked': 'Nakakandado ang Tindahan',
    'header.enter_pin': 'Isulod ang PIN para maablihan',
    'header.light_mode': 'Hayag nga Panagway',
    'header.dark_mode': 'Ngitngit nga Panagway',

    // Ticket & Cart Actions
    'ticket.title': 'Karon nga Resibo',
    'ticket.clear_all': 'Papasa Tanan',
    'ticket.empty_title': 'Walay Sulod ang Resibo',
    'ticket.empty_desc': 'Pindota ang mga baligya para makasulod sa listahan',
    'ticket.items': 'Mga Palitonon',
    'ticket.total': 'Kinatibuk-an',
    'ticket.total_due': 'Tanan Bayranan',
    'ticket.cash_charge': 'Bayad / Kwarta',
    'ticket.charge_pautang': 'Ilista sa Utang',
    'ticket.each': 'ang usa',

    // Register / Catalog
    'catalog.categories_actions': 'Klase sa Baligya & Laktod nga Buhaton',
    'catalog.tap_category_hint': 'Pislita ang klase para makita ang baligya',
    'catalog.all_categories': 'Tanan Klase',
    'catalog.all_items': 'Tanan Baligya',
    'catalog.custom_amount': 'Kinaugalingong ₱ Presyo',
    'catalog.custom_item': 'Kinaugalingong Palitonon',
    'catalog.pull_reveal': 'Ibira paubos para motungha',
    'catalog.items_count': 'kabuok baligya',
    'catalog.search_placeholder': 'Pangitaa ang baligya, SKU, o snacks...',
    'catalog.no_items_match': 'Walay nakit-an nga baligya sa',
    'catalog.clear_search': 'Papasa ang gipangita',
    'catalog.left': 'nahabilin',

    // Financials & Stock
    'finance.cost': 'Puhonan',
    'finance.cost_puhunan': 'Presyo sa Puhonan',
    'finance.profit': 'Gansya',
    'finance.kita_margin': 'Tubo / Gansya kada piraso',
    'finance.lugi_margin': 'Lugi kada piraso',
    'finance.retail_srp': 'Presyo sa Tinda (SRP)',
    'finance.selling_price': 'Presyo Ibaligya (₱)',
    'finance.in_stock': 'Naay Stock',
    'finance.low_stock': 'Hapit Mahurot',
    'finance.out_of_stock': 'Hurot na',
    'finance.current_stock': 'Kasamtangang Stock',
    'finance.current_on_hand': 'Anaa sa Estante',
    'finance.low_stock_alert': 'Pahinumdom kon Hapit Mahurot',
    'finance.available_credit': 'Mahimo pang Utangon',
    'finance.utang_balance': 'Tanan Utang Karon',

    // Item Profile Drawer
    'item_profile.create_title': 'Magdugang og Bag-ong Baligya',
    'item_profile.edit_title': 'Usba ang Profile sa Baligya',
    'item_profile.add_subtitle': 'Ilista ang bag-ong produkto sa imbentaryo',
    'item_profile.upload_photo': 'Kuha og Hulagway / Kamera',
    'item_profile.replace_photo': 'Ilisi ang Hulagway',
    'item_profile.remove_photo': 'Papasa',
    'item_profile.no_image': 'Walay Hulagway',
    'item_profile.processing': 'Giandam pa...',
    'item_profile.sync_hint': 'Makita dayon sa Register tile ug sa resibo',
    'item_profile.core_details': 'Pangunang Impormasyon',
    'item_profile.item_name': 'Tibuok Ngalan sa Baligya',
    'item_profile.tile_short_name': 'Mubo nga Ngalan sa Tile',
    'item_profile.category': 'Klase sa Baligya',
    'item_profile.unit_label': 'Sukod / Porma (pc, sachet, pack)',
    'item_profile.sku_barcode': 'Barcode / SKU',
    'item_profile.pricing_margin': 'Presyo ug Gansya',
    'item_profile.inventory_pinning': 'Imbentaryo & Pag-pin',
    'item_profile.top_favorite': 'Paborito nga Baligya',
    'item_profile.top_favorite_desc': 'Ibutang sa ibabaw sa mga paboritong baligya',
    'item_profile.save_changes': 'Tipigi ang Kausaban',
    'item_profile.create_item': 'Himoa ang Baligya',
    'item_profile.cancel': 'Undangi',

    // Inventory Hub
    'inventory.add_new_item': 'Dugang Baligya',
    'inventory.ai_ocr': 'AI OCR',
    'inventory.stock_count_restock': 'Ihap ug Puno sa Stock',
    'inventory.quick_edit': 'Daliang Usab',
    'inventory.item_profile_photo': 'Profile & Hulagway',
  },
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  toggleLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'ceb') {
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'en';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
    } catch {
      // Ignore localStorage errors
    }
  };

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'ceb' : 'en');
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.en;
    if (dict[key]) {
      return dict[key];
    }
    const enDict = TRANSLATIONS.en;
    if (enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  // Cross-tab storage synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY) {
        if (e.newValue === 'en' || e.newValue === 'ceb') {
          setLocaleState(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
