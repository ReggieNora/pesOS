export type Locale = 'en' | 'ceb';

export const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation / Bottom Nav / Session
    'nav.register': 'Register',
    'nav.inventory': 'Inventory',
    'nav.pautang': 'Pautang',
    'nav.dashboard': 'Dashboard',
    'nav.switch_user': 'Switch User',
    'nav.owner': 'Owner',
    'nav.cashier': 'Cashier',
    'nav.shift_active': 'Shift #1 Active',
    'nav.pin_clock_in': 'PIN Clock-In',
    'nav.switch_desc': 'Switch between Owner & Cashier',
    'nav.lock_station': 'Lock Station',
    'nav.lock_terminal': 'Lock Terminal',
    'nav.lock_desc': 'Secure POS terminal; requires PIN to resume',

    // Header & Security
    'header.demo_mode': 'Demo Mode',
    'header.exit_demo': 'Exit Demo',
    'header.switch_user': 'Switch User',
    'header.lock_station': 'Lock Station',
    'header.lock_terminal': 'Lock Terminal',
    'header.terminal_locked': 'POS Terminal Locked',
    'header.enter_pin': 'Enter PIN to unlock station',
    'header.active_session': 'Active Session',
    'header.owner_pin_hint': 'Owner (9999) • Cashier (1234)',
    'header.invalid_pin': 'Incorrect PIN code. Try again.',
    'header.light_mode': 'Switch to Daylight Light Mode',
    'header.dark_mode': 'Switch to Dark Mode',

    // Categories
    'category.favorites': 'Top Favorites',
    'category.beverages': 'Beverages',
    'category.soap': 'Soap & Care',
    'category.noodles': 'Noodles & Cans',
    'category.tobacco': 'Tobacco & Tingi',
    'category.rice': 'Rice (Bigas)',
    'category.snacks': 'Snacks & Biscuits',
    'category.all': 'All Categories',

    // Units
    'unit.bottle': 'bottle',
    'unit.bottles': 'bottles',
    'unit.sachet': 'sachet',
    'unit.sachets': 'sachets',
    'unit.pack': 'pack',
    'unit.packs': 'packs',
    'unit.bar': 'bar',
    'unit.bars': 'bars',
    'unit.can': 'can',
    'unit.cans': 'cans',
    'unit.piece': 'pc',
    'unit.pieces': 'pcs',
    'unit.stick': 'stick',
    'unit.sticks': 'sticks',
    'unit.kg': 'kg',
    'unit.item': 'item',
    'unit.items': 'items',

    // Register / Catalog / Quick Actions
    'register.categories_actions': 'Categories & Quick Actions',
    'register.tap_category_hint': 'Tap category to view items',
    'register.all_categories': 'All Categories',
    'register.all_items': 'All Items',
    'register.custom_amount': 'Custom ₱ Amount',
    'register.custom_item': 'Custom Item',
    'register.quick_keypad': 'Quick Keypad',
    'register.manual': 'Manual',
    'register.pull_reveal': 'Pull down to reveal',
    'register.search_placeholder': 'Search products, SKU, snacks...',
    'register.no_items_found': 'No items match your filter',
    'register.try_adjusting_search': 'Try adjusting your search query',
    'register.left': 'left',
    'register.out_of_stock': 'Out of Stock',
    'register.items_count': 'items',

    // Ticket & Order Summary
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
    'ticket.change': 'Change',
    'ticket.tendered': 'Tendered',
    'ticket.exact_amount': 'Exact Amount',
    'ticket.customer': 'Customer',

    // Pautang Book / Customer Credit Hub
    'pautang.title': 'Pautang Ledger',
    'pautang.subtitle': 'Trusted neighborhood credit & repayment tracker',
    'pautang.suki_directory': 'Suki Credit Directory',
    'pautang.search_customer': 'Search customer name or phone...',
    'pautang.add_customer': 'Add New Suki',
    'pautang.sort_highest_balance': 'Highest Debt First',
    'pautang.sort_oldest_debt': 'Oldest Debt First',
    'pautang.current_balance': 'Current Utang Balance',
    'pautang.credit_limit': 'Credit Limit',
    'pautang.available_credit': 'Available Room',
    'pautang.status_good': 'Good Standing',
    'pautang.status_near_limit': 'Near Limit',
    'pautang.status_overdue': 'Overdue',
    'pautang.record_repayment': 'Record Cash Repayment',
    'pautang.instant_update': 'Instant balance update',
    'pautang.quick_presets': 'Quick Preset Amounts',
    'pautang.full_balance': 'Full Balance',
    'pautang.amount_to_pay': 'Amount to Pay (₱)',
    'pautang.optional_note': 'Optional Note (e.g. Partial, Sabado bayad)',
    'pautang.confirm_repayment': 'Confirm Cash Repayment',
    'pautang.history_tab': 'Credit & Repayment History',
    'pautang.no_customers': 'No credit customers found',
    'pautang.overdue_warning': 'This customer has overdue balance or exceeded limit',
    'pautang.pin_override_required': 'Owner PIN required to increase credit limit',
    'pautang.enter_owner_pin': 'Enter Owner PIN',
    'pautang.unlock': 'Unlock',
    'pautang.clear': 'Clear',

    // Inventory & Item Profile
    'inventory.title': 'Inventory Management',
    'inventory.add_new_item': 'Add New Item',
    'inventory.ai_ocr': 'AI OCR',
    'inventory.snap_invoice_hint': 'Snap wholesaler invoice to auto-commit',
    'inventory.stock_count_restock': 'Stock Count & Restock',
    'inventory.quick_edit': 'Quick Edit',
    'inventory.item_profile_photo': 'Item Profile & Photo',
    'inventory.current_on_hand': 'Current On-Hand',
    'inventory.retail_srp': 'Retail SRP',
    'inventory.wholesale_cost': 'Wholesale Cost',
    'inventory.profit_margin': 'Profit Margin',
    'inventory.profit_per_unit': 'profit/unit',
    'inventory.stock_adjustment': 'Stock Adjustment & Count In',
    'inventory.case_presets': 'Quick Add Case Presets',
    'inventory.confirm_restock': 'Confirm Restock',
    'inventory.min_alert': 'Min Alert',
    'inventory.in_stock': 'In Stock',
    'inventory.low_stock': 'Low Stock',
    'inventory.out_of_stock': 'Out of Stock',

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
    'item_profile.selling_price': 'Retail Selling Price (₱)',
    'item_profile.cost_puhunan': 'Cost Price / Puhunan (₱)',
    'item_profile.kita_margin': 'Kita / Tubo per unit',
    'item_profile.lugi_margin': 'Lugi per unit',
    'item_profile.inventory_pinning': 'Inventory & Pinning',
    'item_profile.current_stock': 'Current Stock',
    'item_profile.low_stock_alert': 'Low Stock Alert At',
    'item_profile.top_favorite': 'Top Favorite',
    'item_profile.top_favorite_desc': 'Pin to top of Cashier Register quick tiles',
    'item_profile.save_changes': 'Save Changes',
    'item_profile.create_item': 'Create Item',
    'item_profile.cancel': 'Cancel',

    // Dashboard & RBAC
    'dashboard.title': 'Owner Analytics & Shift Reports',
    'dashboard.today_sales': "Today's Gross Sales",
    'dashboard.net_profit': 'Estimated Net Profit',
    'dashboard.unpaid_pautang': 'Total Uncollected Pautang',
    'dashboard.low_stock_items': 'Low Stock SKU Alerts',
    'dashboard.shift_performance': 'Cashier Shift Performance',
    'dashboard.audit_logs': 'Shift Audit Trail',
    'dashboard.access_denied_title': 'Owner Access Required',
    'dashboard.access_denied_desc': 'Only the store owner can view financial analytics, wholesale supplier costs, and shift audit discrepancy reports.',
    'dashboard.unlock_owner_pin': 'Unlock with Owner PIN (9999)',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.delete': 'Delete',
    'common.search': 'Search',
    'common.loading': 'Loading...',
  },

  ceb: {
    // Navigation / Bottom Nav / Session
    'nav.register': 'Tinda',
    'nav.inventory': 'Imbentaryo',
    'nav.pautang': 'Utang',
    'nav.dashboard': 'Taho/Halin',
    'nav.switch_user': 'Ilis og Tindera',
    'nav.owner': 'Tag-iya',
    'nav.cashier': 'Tindera',
    'nav.shift_active': 'Shift #1 Kasamtangan',
    'nav.pin_clock_in': 'PIN Clock-In',
    'nav.switch_desc': 'Pagbalhin tali sa Tag-iya ug Tindera',
    'nav.lock_station': 'Kandado',
    'nav.lock_terminal': 'Kandadohon ang POS',
    'nav.lock_desc': 'Seguradong nakasirado; kinahanglan ang PIN aron maablihan',

    // Header & Security
    'header.demo_mode': 'Demo Pa',
    'header.exit_demo': 'Gawas sa Demo',
    'header.switch_user': 'Ilis og Tindera',
    'header.lock_station': 'Kandado',
    'header.lock_terminal': 'Kandadohon ang POS',
    'header.terminal_locked': 'Nakakandado ang Tindahan',
    'header.enter_pin': 'Isulod ang PIN para maablihan',
    'header.active_session': 'Kasamtangang Naggamit',
    'header.owner_pin_hint': 'Tag-iya (9999) • Tindera (1234)',
    'header.invalid_pin': 'Sayop ang PIN. Sulayi pag-usab.',
    'header.light_mode': 'Hayag nga Panagway',
    'header.dark_mode': 'Ngitngit nga Panagway',

    // Categories
    'category.favorites': 'Paboritong Baligya',
    'category.beverages': 'Ilimnon',
    'category.soap': 'Sabon & Panghinlo',
    'category.noodles': 'Noodles & Delata',
    'category.tobacco': 'Sigarilyo & Tingi',
    'category.rice': 'Bugas (Kada Kilo)',
    'category.snacks': 'Snacks & Biskwit',
    'category.all': 'Tanan Klase',

    // Units
    'unit.bottle': 'botelya',
    'unit.bottles': 'mga botelya',
    'unit.sachet': 'sachet',
    'unit.sachets': 'mga sachet',
    'unit.pack': 'putos',
    'unit.packs': 'mga putos',
    'unit.bar': 'bareta',
    'unit.bars': 'mga bareta',
    'unit.can': 'lata',
    'unit.cans': 'mga lata',
    'unit.piece': 'buok',
    'unit.pieces': 'kabuok',
    'unit.stick': 'upos',
    'unit.sticks': 'mga upos',
    'unit.kg': 'kilo',
    'unit.item': 'buok',
    'unit.items': 'kabuok baligya',

    // Register / Catalog / Quick Actions
    'register.categories_actions': 'Klase sa Baligya & Laktod nga Buhaton',
    'register.tap_category_hint': 'Pislita ang klase para makita ang baligya',
    'register.all_categories': 'Tanan Klase',
    'register.all_items': 'Tanan Baligya',
    'register.custom_amount': 'Kinaugalingong ₱ Presyo',
    'register.custom_item': 'Kinaugalingong Palitonon',
    'register.quick_keypad': 'Daliang Keypad',
    'register.manual': 'Kaugalingon',
    'register.pull_reveal': 'Ibira paubos para motungha',
    'register.search_placeholder': 'Pangitaa ang baligya, SKU, o snacks...',
    'register.no_items_found': 'Walay nakit-an nga baligya sa gipangita',
    'register.try_adjusting_search': 'Sulayi pag-usab ang imong gipangita',
    'register.left': 'nahabilin',
    'register.out_of_stock': 'Hurot na',
    'register.items_count': 'kabuok baligya',

    // Ticket & Order Summary
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
    'ticket.change': 'Sukli',
    'ticket.tendered': 'Gidawat nga Kwarta',
    'ticket.exact_amount': 'Eksaktong Kwarta',
    'ticket.customer': 'Pangalan sa Suki',

    // Pautang Book / Customer Credit Hub
    'pautang.title': 'Libro sa Pautang',
    'pautang.subtitle': 'Talaan sa utang ug bayad sa kasaligang mga suki',
    'pautang.suki_directory': 'Listahan sa mga Suki',
    'pautang.search_customer': 'Pangitaa ang suki o numero sa telepono...',
    'pautang.add_customer': 'Dugang Bag-ong Suki',
    'pautang.sort_highest_balance': 'Pinakadakog Utang Una',
    'pautang.sort_oldest_debt': 'Pinakadugayng Utang Una',
    'pautang.current_balance': 'Tanan Utang Karon',
    'pautang.credit_limit': 'Kinutoban sa Utang',
    'pautang.available_credit': 'Mahimo pang Utangon',
    'pautang.status_good': 'Maayong Mobayad',
    'pautang.status_near_limit': 'Hapit na sa Limit',
    'pautang.status_overdue': 'Lapapas na sa Adlaw',
    'pautang.record_repayment': 'Isulat ang Gibayad nga Kwarta',
    'pautang.instant_update': 'Mausab dayon ang balanse',
    'pautang.quick_presets': 'Daliang Pilianan sa Kwarta',
    'pautang.full_balance': 'Tibuok Bayad',
    'pautang.amount_to_pay': 'Kantidad nga Ibayad (₱)',
    'pautang.optional_note': 'Mubo nga sulat (e.g. Kulang pa, Sabado tiwason)',
    'pautang.confirm_repayment': 'Kumpirmaha ang Gibayad',
    'pautang.history_tab': 'Kaagi sa Utang ug Bayad',
    'pautang.no_customers': 'Walay nakit-ang suki nga naay utang',
    'pautang.overdue_warning': 'Kini nga suki lapas na sa gitagal o subra na sa limit',
    'pautang.pin_override_required': 'Kinahanglan ang PIN sa Tag-iya aron patas-an ang limit',
    'pautang.enter_owner_pin': 'Isulod ang PIN sa Tag-iya',
    'pautang.unlock': 'Ablihi',
    'pautang.clear': 'Papasa',

    // Inventory & Item Profile
    'inventory.title': 'Pagdumala sa Imbentaryo',
    'inventory.add_new_item': 'Dugang Baligya',
    'inventory.ai_ocr': 'AI OCR Resibo',
    'inventory.snap_invoice_hint': 'Piktyuri ang resibo sa komprador aron masulod dayon',
    'inventory.stock_count_restock': 'Ihap ug Puno sa Stock',
    'inventory.quick_edit': 'Daliang Usab',
    'inventory.item_profile_photo': 'Profile & Hulagway',
    'inventory.current_on_hand': 'Anaa sa Estante',
    'inventory.retail_srp': 'Presyo sa Tinda (SRP)',
    'inventory.wholesale_cost': 'Puhonan',
    'inventory.profit_margin': 'Gansya (%)',
    'inventory.profit_per_unit': 'gansya kada usa',
    'inventory.stock_adjustment': 'Pag-usab ug Pagsusi sa Stock',
    'inventory.case_presets': 'Daliang Puno kada Kahon',
    'inventory.confirm_restock': 'Kumpirmaha ang Pagpuno',
    'inventory.min_alert': 'Pahinumdom kon gamay na',
    'inventory.in_stock': 'Naay Stock',
    'inventory.low_stock': 'Hapit Mahurot',
    'inventory.out_of_stock': 'Hurot na',

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
    'item_profile.unit_label': 'Sukod / Porma (pc, sachet, putos)',
    'item_profile.sku_barcode': 'Barcode / SKU',
    'item_profile.pricing_margin': 'Presyo ug Gansya',
    'item_profile.selling_price': 'Presyo Ibaligya (₱)',
    'item_profile.cost_puhunan': 'Presyo sa Puhonan (₱)',
    'item_profile.kita_margin': 'Tubo / Gansya kada piraso',
    'item_profile.lugi_margin': 'Lugi kada piraso',
    'item_profile.inventory_pinning': 'Imbentaryo & Pag-pin',
    'item_profile.current_stock': 'Kasamtangang Stock',
    'item_profile.low_stock_alert': 'Pahinumdom kon Hapit Mahurot',
    'item_profile.top_favorite': 'Paborito nga Baligya',
    'item_profile.top_favorite_desc': 'Ibutang sa ibabaw sa mga paboritong baligya',
    'item_profile.save_changes': 'Tipigi ang Kausaban',
    'item_profile.create_item': 'Himoa ang Baligya',
    'item_profile.cancel': 'Undangi',

    // Dashboard & RBAC
    'dashboard.title': 'Taho sa Halin ug Performance sa Shift',
    'dashboard.today_sales': 'Tibuok Halin Karon',
    'dashboard.net_profit': 'Tantiya nga Gansya',
    'dashboard.unpaid_pautang': 'Tanan Utang nga Wala pa Mabayri',
    'dashboard.low_stock_items': 'Mga Baligya nga Hapit Mahurot',
    'dashboard.shift_performance': 'Halin sa Kada Tindera',
    'dashboard.audit_logs': 'Talaan sa Kausaban sa Tindahan',
    'dashboard.access_denied_title': 'Kinahanglan ang Tag-iya',
    'dashboard.access_denied_desc': 'Ang tag-iya ra sa tindahan ang makakita sa taho sa kwarta, puhonan sa komprador, ug listahan sa discrepancy sa shift.',
    'dashboard.unlock_owner_pin': 'Ablihi gamit ang PIN sa Tag-iya (9999)',

    // Common
    'common.save': 'Tipigi',
    'common.cancel': 'Undangi',
    'common.confirm': 'Kumpirmaha',
    'common.close': 'Sirad-i',
    'common.back': 'Balik',
    'common.delete': 'Papasa',
    'common.search': 'Pangitaa',
    'common.loading': 'Gikarga pa...',
  },
};

/**
 * Maps raw Category names/IDs to localized label
 */
export function getLocalizedCategory(category: string, locale: Locale): string {
  const norm = category.toLowerCase().trim();

  const keyMap: Record<string, string> = {
    favorites: 'category.favorites',
    beverages: 'category.beverages',
    soap: 'category.soap',
    'soap / personal care': 'category.soap',
    'soap & care': 'category.soap',
    noodles: 'category.noodles',
    'instant noodles & canned': 'category.noodles',
    tobacco: 'category.tobacco',
    'tobacco / tingi': 'category.tobacco',
    rice: 'category.rice',
    'rice / bigas (per kg)': 'category.rice',
    snacks: 'category.snacks',
    'snacks & biscuits': 'category.snacks',
    all: 'category.all',
  };

  const translationKey = keyMap[norm];
  if (translationKey && TRANSLATIONS[locale]?.[translationKey]) {
    return TRANSLATIONS[locale][translationKey];
  }
  return category;
}

/**
 * Maps raw product unit strings (e.g. "bottle", "sachet", "pack", "kg") to localized words
 */
export function getLocalizedUnit(unit: string, count: number = 1, locale: Locale): string {
  const norm = unit.toLowerCase().trim();

  // If Cebuano
  if (locale === 'ceb') {
    if (norm === 'bottle' || norm === 'bottles' || norm === 'btl') {
      return count === 1 ? 'botelya' : 'mga botelya';
    }
    if (norm === 'sachet' || norm === 'sachets') {
      return 'sachet';
    }
    if (norm === 'pack' || norm === 'packs' || norm === 'pck') {
      return count === 1 ? 'putos' : 'mga putos';
    }
    if (norm === 'bar' || norm === 'bars') {
      return count === 1 ? 'bareta' : 'mga bareta';
    }
    if (norm === 'can' || norm === 'cans') {
      return count === 1 ? 'lata' : 'mga lata';
    }
    if (norm === 'pc' || norm === 'pcs' || norm === 'piece' || norm === 'pieces') {
      return count === 1 ? 'buok' : 'kabuok';
    }
    if (norm === 'stick' || norm === 'sticks') {
      return count === 1 ? 'upos' : 'mga upos';
    }
    if (norm === 'kg' || norm === 'kilos' || norm === 'kilo') {
      return 'kilo';
    }
    if (norm === 'item' || norm === 'items') {
      return count === 1 ? 'buok' : 'kabuok';
    }
    return unit;
  }

  // English pluralization
  if (count === 1) {
    return unit;
  }
  if (norm.endsWith('s') || norm === 'kg') {
    return unit;
  }
  return `${unit}s`;
}
