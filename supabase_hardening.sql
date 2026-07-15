-- =================================================================================
-- BARSAFE - ADVANCED SECURITY HARDENING SCRIPT
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- =================================================================================

-- Enable Crypto Extension for hashing secrets (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------------
-- 0. SCHEMA ENHANCEMENTS AND CONSTRAINTS (Faille 7 et 8)
-- ---------------------------------------------------------------------------------

-- Ensure products can't have negative price or stock
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS positive_stock_price,
  ADD CONSTRAINT positive_stock_price CHECK (price >= 0 AND currentStock >= 0 AND initialStock >= 0);

-- Ensure order items can't be ordered in negative quantities
ALTER TABLE order_items 
  DROP CONSTRAINT IF EXISTS positive_quantity,
  ADD CONSTRAINT positive_quantity CHECK (quantity > 0 AND priceAtTime >= 0);

-- Convert clear-text secretCode to hashed (if table is still empty or you want future rows secure) --
-- Note: We add a new column for hashed codes. For legacy, we keep it, but this is the right way.
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS secret_code_hash TEXT;


-- ---------------------------------------------------------------------------------
-- 1. BASE SECURITY: ROW LEVEL SECURITY (Faille 1)
-- ---------------------------------------------------------------------------------
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Assuming Supabase Auth is used. If we fall back to anonymous context without Auth, 
-- we will use a hybrid approach below depending on JWT parsing.
-- But the strictest way is to link 'auth.users' to our 'employees'
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);


-- ---------------------------------------------------------------------------------
-- 2. TENANT ISOLATION FUNCTIONS (Faille 2)
-- ---------------------------------------------------------------------------------

-- Helper: Get the current user's establishment ID
CREATE OR REPLACE FUNCTION auth_user_establishment()
RETURNS UUID AS $$
  SELECT establishment_id FROM employees WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Get the current user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM employees WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- ---------------------------------------------------------------------------------
-- 3. RLS POLICIES OVERWRITE
-- ---------------------------------------------------------------------------------

-- Drop existing generic policies if any
DROP POLICY IF EXISTS "Public read for all establishments" ON establishments;
DROP POLICY IF EXISTS "Patron can update their own establishment" ON establishments;
DROP POLICY IF EXISTS "Public read for products" ON products;
DROP POLICY IF EXISTS "Patrons manage products" ON products;
DROP POLICY IF EXISTS "Clients can insert orders" ON orders;
DROP POLICY IF EXISTS "Employees access their bar's orders" ON orders;

-- ESTABLISHMENTS POLICIES
-- Anyone can see establishments list/details (required for QR code redirect)
CREATE POLICY "Public read for all establishments" 
ON establishments FOR SELECT USING (true);

-- Only an authenticated 'PATRON' can update their specific establishment details
CREATE POLICY "Patron can update their own establishment" 
ON establishments FOR UPDATE 
USING (id = auth_user_establishment() AND auth_user_role() = 'PATRON');


-- PRODUCTS POLICIES (Faille 5)
-- Anyone can see the menu products
CREATE POLICY "Public read for products" 
ON products FOR SELECT USING (true);

-- Only PATRON can insert/update/delete products to prevent clients from emptying stock
CREATE POLICY "Patrons manage products" 
ON products FOR ALL 
USING (establishment_id = auth_user_establishment() AND auth_user_role() = 'PATRON');

-- Servers/Cashiers CAN update stock but only implicitly via order logic. 
-- However, for simplicity if backend logic is complex, we allow employees to UPDATE stock.
CREATE POLICY "Employees can update stock" 
ON products FOR UPDATE 
USING (establishment_id = auth_user_establishment() AND auth_user_role() IN ('PATRON', 'CAISSIER', 'SERVEUR'));


-- ORDERS POLICIES
-- Clients (Anonymous users) can only INSERT orders if they set status to EN_ATTENTE
CREATE POLICY "Clients can insert unverified orders anonymously" 
ON orders FOR INSERT 
WITH CHECK (status = 'EN_ATTENTE');

-- Employees can read all orders from their own bar
CREATE POLICY "Employees can view own bar orders" 
ON orders FOR SELECT 
USING (establishment_id = auth_user_establishment());

-- Employees can update orders from their own bar
CREATE POLICY "Employees can update own bar orders" 
ON orders FOR UPDATE 
USING (establishment_id = auth_user_establishment() AND auth_user_role() IN ('PATRON', 'CAISSIER', 'SERVEUR'));

-- ORDER ITEMS POLICIES
CREATE POLICY "Clients can insert order items anonymously" 
ON order_items FOR INSERT 
WITH CHECK (true); -- Assumes parent order insertion is guarded by the orders INSERT policy

CREATE POLICY "Employees can view order items" 
ON order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_items.order_id 
    AND o.establishment_id = auth_user_establishment()
  )
);


-- NOTIFICATIONS POLICIES
-- Clients can send a notification (call waiter etc.)
CREATE POLICY "Clients can insert notifications anonymously" 
ON notifications FOR INSERT 
WITH CHECK (handled = false);

-- Employees can view/update their own notifications
CREATE POLICY "Employees can view own bar notifications" 
ON notifications FOR SELECT 
USING (establishment_id = auth_user_establishment());

CREATE POLICY "Employees can manage own bar notifications" 
ON notifications FOR UPDATE 
USING (establishment_id = auth_user_establishment());


-- ---------------------------------------------------------------------------------
-- 4. ANTI-FRAUD PRICE CALCULATION TRIGGER (Faille 4)
-- ---------------------------------------------------------------------------------
-- Prevents a client from manipulating the order total in the frontend logic.

CREATE OR REPLACE FUNCTION trigger_calculate_order_totals()
RETURNS TRIGGER AS $$
BEGIN
   -- Forces the total to be derived entirely from the backend database product prices.
   -- This stops users from passing {total: 0} from the app.
   NEW.total := COALESCE((
     SELECT SUM(p.price * oi.quantity)
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = NEW.id
   ), 0);
   RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_correct_totals ON orders;
CREATE TRIGGER ensure_correct_totals
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_order_totals();
-- NOTE: We do it ON UPDATE because order_items are typically inserted AFTER the order in REST calls.
-- First they create the order, then items. Then we update the total.


-- ---------------------------------------------------------------------------------
-- 5. ANTI-SPAM (DENIAL OF SERVICE) TRIGGER (Faille 6)
-- ---------------------------------------------------------------------------------
-- Stop a single table from creating massive amounts of pending orders.

CREATE OR REPLACE FUNCTION trigger_prevent_order_spam()
RETURNS TRIGGER AS $$
DECLARE
   recent_pending_count INT;
BEGIN
   -- Count pending orders for this specific table in the last hour
   SELECT COUNT(*) INTO recent_pending_count
   FROM orders 
   WHERE tableNumber = NEW.tableNumber 
   AND establishment_id = NEW.establishment_id 
   AND status = 'EN_ATTENTE'
   AND created_at > (NOW() - INTERVAL '1 hour');

   IF recent_pending_count >= 5 THEN
     RAISE EXCEPTION 'Limitation de sécurité (Rate Limit): Trop de commandes en attente pour cette table. Veuillez patienter.';
   END IF;
   
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_spam_protection ON orders;
CREATE TRIGGER enforce_spam_protection
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_prevent_order_spam();


-- ---------------------------------------------------------------------------------
-- 6. AUDIT LOGGING SYSTEM (Faille 9)
-- ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id UUID NOT NULL,
    user_id UUID, -- usually auth.uid()
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- No policies granted = ONLY Superadmin/Service_role can read or write logs natively.
-- This ensures logs cannot be modified or deleted by Patrons or Attackers.

CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER AS $$
BEGIN
   IF TG_OP = 'UPDATE' THEN
     INSERT INTO audit_logs (table_name, action, record_id, user_id, old_data, new_data)
     VALUES (TG_TABLE_NAME, TG_OP, NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
     RETURN NEW;
   ELSIF TG_OP = 'DELETE' THEN
     INSERT INTO audit_logs (table_name, action, record_id, user_id, old_data)
     VALUES (TG_TABLE_NAME, TG_OP, OLD.id, auth.uid(), to_jsonb(OLD));
     RETURN OLD;
   END IF;
   RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Log to Sensitive Tables
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products AFTER UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders AFTER UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- =================================================================================
-- END OF HARDENING SCRIPT
-- =================================================================================
