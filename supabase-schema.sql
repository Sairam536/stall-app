-- ==============================================================================
-- StallPay - Supabase Database Schema & Realtime Setup
-- Copy and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10, 2) NOT NULL,
    utr TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date TEXT,
    time TEXT,
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    rejection_reason TEXT
);

-- Index for fast UTR and customer lookups
CREATE INDEX IF NOT EXISTS idx_transactions_utr ON public.transactions(utr);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_phone ON public.transactions(customer_phone);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Snacks',
    price NUMERIC(10, 2) NOT NULL,
    description TEXT DEFAULT '',
    emoji TEXT DEFAULT '🍽️',
    badge TEXT DEFAULT '',
    in_stock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Raw Materials',
    amount NUMERIC(10, 2) NOT NULL,
    date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS public.feedback (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL DEFAULT 'Anonymous Student',
    customer_phone TEXT DEFAULT '',
    rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    tag TEXT DEFAULT 'General',
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    college TEXT DEFAULT 'General Visitor',
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STALL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.stall_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT NOT NULL,
    event TEXT NOT NULL,
    upi_id TEXT NOT NULL,
    payee_name TEXT NOT NULL,
    team_pin TEXT NOT NULL DEFAULT '1234',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC ACCESS POLICIES FOR FESTIVAL DEMO
-- ==============================================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stall_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read & write access for fest stall operations
CREATE POLICY "Public full access transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access feedback" ON public.feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access stall_settings" ON public.stall_settings FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- ENABLE REALTIME REPLICATION FOR LIVE MULTI-DEVICE WEBSOCKET SYNC
-- ==============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;

-- ==============================================================================
-- INITIAL SAMPLE DATA SEEDS (Optional - ready for fest day)
-- ==============================================================================

INSERT INTO public.products (id, name, category, price, description, emoji, badge, in_stock)
VALUES 
    ('prod-1', 'Crispy Veg Steamed Momos', 'Snacks', 60.00, '6 pcs authentic steamed dumplings with fiery red chutney & mayo', '🥟', 'Bestseller', true),
    ('prod-2', 'Loaded Cheese Nachos', 'Snacks', 80.00, 'Crunchy tortilla chips with warm cheese sauce, jalapenos & salsa', '🧀', 'Popular', true),
    ('prod-3', 'Classic Paneer Kathi Roll', 'Snacks', 90.00, 'Smoky spiced paneer cubes wrapped in layered paratha with mint sauce', '🌯', '', true),
    ('prod-4', 'Thick Cold Coffee with Ice Cream', 'Beverages', 50.00, 'Rich blended espresso cold coffee topped with vanilla scoop & choco drizzle', '🧋', 'Crowd Favorite', true),
    ('prod-5', 'Virgin Blue Lagoon Mojito', 'Beverages', 45.00, 'Refreshing fizzy blue curacao mocktail with mint leaves & fresh lemon', '🍹', '', true),
    ('prod-6', 'Warm Sizzling Brownie with Ice Cream', 'Desserts', 70.00, 'Gooey chocolate fudge brownie topped with rich vanilla ice cream & hot fudge', '🍨', 'Must Try', true),
    ('prod-7', 'E-Club Founder Vinyl Sticker Pack', 'Merch', 30.00, 'Set of 5 waterproof laptop stickers with tech & startup slogans', '🎨', 'Club Special', true),
    ('prod-8', 'Entrepreneur Club Custom Badge', 'Merch', 25.00, 'Matte metal pin badge Hustle Build Inspire - Fest Edition', '⭐', 'Limited', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stall_settings (id, name, event, upi_id, payee_name, team_pin)
VALUES ('default', 'Entrepreneur Club Stall', 'College Fest 2026', 'stallpay.ecell@upi', 'College Entrepreneur Club', '1234')
ON CONFLICT (id) DO NOTHING;
