# TingiPOS — Futuristic Sari-Sari Store POS

A sleek, high-contrast cyberpunk/glassmorphic mobile Point of Sale (POS) application built for Philippine micro-retailers (*Sari-Sari* stores). Engineered for **3-tap or fewer** transaction speeds, zero typing friction, offline-first persistence, and role-based loss prevention.

## Quick Start

```bash
npm install
npm run dev
```

## Key Modules Implemented
1. **Role-Based Access Control (RBAC) & Blind Shift Handover**:
   - **Cashier (`PIN: 1234` Ate Nena / `2468` Kuya Jun)**: Access to visual sales grid, expandable cart dock, cash calculator, Pautang credit checkout, and dynamic QR Ph generator. Wholesale costs, net profit margins, and expected cash drawer balances are strictly hidden.
   - **Owner (`PIN: 9999` Bossing)**: Full access to Gross Sales, Net Profit (`₱` & `%`), Pautang collection, Live Cashier Overwatch, AI Inventory Alerts, and the immutable Security Audit Trail.
2. **3-Tap Cashier Screen (`CashierRegister.tsx`)**:
   - **Category Carousel**: Top/Favorites, Beverages, Soap/Personal Care, Instant Noodles, Tobacco, Rice, Snacks.
   - **4×3 High-Density Visual Grid**: 1-tap to add, tap again to increment glowing cyan badge (`+1`, `+2`).
   - **Sticky Expandable Mini-Cart Dock**: Collapsed bar with running total, floating Voice Dictation mic, and `≥56px` payment triggers (`Pautang`, `QR Ph`, `Cash`). Expands to reveal `+`/`-` steppers and preset bill calculators (`Exact`, `₱100`, `₱200`, `₱500`).
3. **Voice Dictation NLP (`voiceParser.ts`)**:
   - Parses natural English and Taglish phrases (e.g., *"Two Pantene, one Coke 1.5, paid 100"*), populates the cart, and computes change automatically.
4. **Payment Workflows (`PaymentModals.tsx`)**:
   - **Cash Checkout**: Big bold Mint Green (`#00E676`) change display + haptic audio/vibration feedback.
   - **Pautang (Neighborhood Credit)**: Customer credit ceiling validation with progress bar and Owner override flow.
   - **Dynamic GCash / QR Ph**: Scannable QR Ph matrix locked to exact cart subtotal with simulated live webhook verification.
5. **Owner Overwatch & AI Alerts (`OwnerDashboard.tsx`)**:
   - Real-time sales velocity depletion alerts (*"Coke 1.5L running out in ~4.0 hours"*) and Dead Stock detection (*"Ligo Sardines: 0 sales in 30 days"*).
6. **Camera OCR Stock-In & Inventory Hub (`InventoryHub.tsx`)**:
   - Simulated wholesaler invoice OCR scanner (Puregold / Suy Sing presets) with 1-tap stock commit and inline editable selling prices.
