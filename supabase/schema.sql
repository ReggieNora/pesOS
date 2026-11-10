-- ==============================================================================
-- pesOS Supabase Multi-Tenant & Google OAuth Database Schema
-- Run this migration in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    owner_email TEXT,
    store_name TEXT,
    name TEXT,
    owner_name TEXT,
    phone TEXT,
    barangay_location TEXT,
    location TEXT,
    pin_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure newly added columns exist if table was already created
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS barangay_location TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Drop NOT NULL constraints if any were set previously
ALTER TABLE public.stores ALTER COLUMN pin_hash DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN store_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_name DROP NOT NULL;

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on stores" ON public.stores;
CREATE POLICY "Allow public read on stores" ON public.stores
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on stores" ON public.stores;
CREATE POLICY "Allow public insert on stores" ON public.stores
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on stores" ON public.stores;
CREATE POLICY "Allow public update on stores" ON public.stores
    FOR UPDATE USING (true);

-- 2. ADD store_id & user_id TO PRODUCTS
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on products" ON public.products;
CREATE POLICY "Allow all on products" ON public.products
    FOR ALL USING (true) WITH CHECK (true);

-- 3. ADD store_id & user_id TO CUSTOMERS
ALTER TABLE public.customers 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.customers 
    ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on customers" ON public.customers;
CREATE POLICY "Allow all on customers" ON public.customers
    FOR ALL USING (true) WITH CHECK (true);

-- 4. ADD store_id & user_id TO PAUTANG_LEDGER
ALTER TABLE public.pautang_ledger 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.pautang_ledger 
    ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.pautang_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on pautang_ledger" ON public.pautang_ledger;
CREATE POLICY "Allow all on pautang_ledger" ON public.pautang_ledger
    FOR ALL USING (true) WITH CHECK (true);

-- 5. ADD store_id & user_id TO SALES_TICKETS
ALTER TABLE public.sales_tickets 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.sales_tickets 
    ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.sales_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on sales_tickets" ON public.sales_tickets;
CREATE POLICY "Allow all on sales_tickets" ON public.sales_tickets
    FOR ALL USING (true) WITH CHECK (true);

-- 6. PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_owner_email ON public.stores(owner_email);
CREATE INDEX IF NOT EXISTS idx_stores_phone ON public.stores(phone);
CREATE INDEX IF NOT EXISTS idx_stores_name ON public.stores(store_name);

CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

CREATE INDEX IF NOT EXISTS idx_pautang_ledger_store_id ON public.pautang_ledger(store_id);
CREATE INDEX IF NOT EXISTS idx_pautang_ledger_user_id ON public.pautang_ledger(user_id);

CREATE INDEX IF NOT EXISTS idx_sales_tickets_store_id ON public.sales_tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_tickets_user_id ON public.sales_tickets(user_id);
