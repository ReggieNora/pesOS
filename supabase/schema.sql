-- ==============================================================================
-- pesOS Supabase Multi-Tenant Database Schema
-- Run this migration in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT,
    barangay_location TEXT,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on stores" ON public.stores
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on stores" ON public.stores
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on stores" ON public.stores
    FOR UPDATE USING (true);

-- 2. ADD store_id TO PRODUCTS
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Enable RLS and store policies on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on products" ON public.products;
CREATE POLICY "Allow all on products" ON public.products
    FOR ALL USING (true) WITH CHECK (true);

-- 3. ADD store_id TO CUSTOMERS
ALTER TABLE public.customers 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on customers" ON public.customers;
CREATE POLICY "Allow all on customers" ON public.customers
    FOR ALL USING (true) WITH CHECK (true);

-- 4. ADD store_id TO PAUTANG_LEDGER
ALTER TABLE public.pautang_ledger 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.pautang_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on pautang_ledger" ON public.pautang_ledger;
CREATE POLICY "Allow all on pautang_ledger" ON public.pautang_ledger
    FOR ALL USING (true) WITH CHECK (true);

-- 5. ADD store_id TO SALES_TICKETS
ALTER TABLE public.sales_tickets 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.sales_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on sales_tickets" ON public.sales_tickets;
CREATE POLICY "Allow all on sales_tickets" ON public.sales_tickets
    FOR ALL USING (true) WITH CHECK (true);

-- Create performance indexes for store_id lookups
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_pautang_ledger_store_id ON public.pautang_ledger(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_tickets_store_id ON public.sales_tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_phone ON public.stores(phone);
CREATE INDEX IF NOT EXISTS idx_stores_name ON public.stores(store_name);
