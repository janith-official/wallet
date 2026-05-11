-- =============================================
-- WALLET APP: Clear & Seed Script
-- Paste this into Supabase Dashboard > SQL Editor
-- =============================================

DO $$
DECLARE
  uid uuid;
  -- Accounts
  acc_checking uuid;
  acc_savings uuid;
  acc_cash uuid;
  acc_credit uuid;
  -- Expense categories
  cat_food uuid;
  cat_transport uuid;
  cat_shopping uuid;
  cat_entertainment uuid;
  cat_bills uuid;
  cat_health uuid;
  cat_groceries uuid;
  cat_rent uuid;
  cat_education uuid;
  cat_other_exp uuid;
  -- Income categories
  cat_salary uuid;
  cat_freelance uuid;
  cat_investments uuid;
  cat_gifts uuid;
  -- Helpers
  m0 timestamptz; -- start of current month
  m1 timestamptz; -- start of previous month
BEGIN
  -- Get user (first user in database)
  SELECT id INTO uid FROM auth.users LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No users found. Please sign up first, then run this script.';
  END IF;

  m0 := date_trunc('month', now());
  m1 := date_trunc('month', now() - interval '1 month');

  -- ═══════════════════════════════════════════
  -- 1. CLEAR ALL DATA
  -- ═══════════════════════════════════════════
  DELETE FROM transactions WHERE user_id = uid;
  DELETE FROM budgets WHERE user_id = uid;
  DELETE FROM recurring_rules WHERE user_id = uid;
  DELETE FROM categories WHERE user_id = uid;
  DELETE FROM accounts WHERE user_id = uid;

  -- Update profile base currency
  UPDATE profiles SET base_currency = 'LKR' WHERE user_id = uid;

  -- ═══════════════════════════════════════════
  -- 2. ACCOUNTS
  -- ═══════════════════════════════════════════
  INSERT INTO accounts (id, user_id, name, type, currency, opening_balance, sort_order, icon, color)
  VALUES (gen_random_uuid(), uid, 'BOC Savings', 'bank', 'LKR', 485000.00, 0, '🏦', '#60a5fa')
  RETURNING id INTO acc_checking;

  INSERT INTO accounts (id, user_id, name, type, currency, opening_balance, sort_order, icon, color)
  VALUES (gen_random_uuid(), uid, 'FD Account', 'bank', 'LKR', 1500000.00, 1, '💰', '#34d399')
  RETURNING id INTO acc_savings;

  INSERT INTO accounts (id, user_id, name, type, currency, opening_balance, sort_order, icon, color)
  VALUES (gen_random_uuid(), uid, 'Cash Wallet', 'cash', 'LKR', 12500.00, 2, '💵', '#f59e0b')
  RETURNING id INTO acc_cash;

  INSERT INTO accounts (id, user_id, name, type, currency, opening_balance, sort_order, icon, color)
  VALUES (gen_random_uuid(), uid, 'Visa Card', 'card', 'LKR', 0.00, 3, '💳', '#a78bfa')
  RETURNING id INTO acc_credit;

  -- ═══════════════════════════════════════════
  -- 3. EXPENSE CATEGORIES
  -- ═══════════════════════════════════════════
  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Food & Dining', 'expense', '🍔', '#f87171')
  RETURNING id INTO cat_food;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Transportation', 'expense', '🚗', '#60a5fa')
  RETURNING id INTO cat_transport;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Shopping', 'expense', '🛒', '#a78bfa')
  RETURNING id INTO cat_shopping;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Entertainment', 'expense', '🎮', '#f59e0b')
  RETURNING id INTO cat_entertainment;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Bills & Utilities', 'expense', '💡', '#14b8a6')
  RETURNING id INTO cat_bills;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Health', 'expense', '💊', '#ec4899')
  RETURNING id INTO cat_health;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Groceries', 'expense', '🥦', '#fb923c')
  RETURNING id INTO cat_groceries;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Rent', 'expense', '🏠', '#6366f1')
  RETURNING id INTO cat_rent;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Education', 'expense', '📚', '#22d3ee')
  RETURNING id INTO cat_education;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Other', 'expense', '📦', '#9ca3af')
  RETURNING id INTO cat_other_exp;

  -- ═══════════════════════════════════════════
  -- 4. INCOME CATEGORIES
  -- ═══════════════════════════════════════════
  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Salary', 'income', '💰', '#34d399')
  RETURNING id INTO cat_salary;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Freelance', 'income', '💻', '#60a5fa')
  RETURNING id INTO cat_freelance;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Investments', 'income', '📈', '#a78bfa')
  RETURNING id INTO cat_investments;

  INSERT INTO categories (id, user_id, name, kind, icon, color)
  VALUES (gen_random_uuid(), uid, 'Gifts', 'income', '🎁', '#f59e0b')
  RETURNING id INTO cat_gifts;

  -- ═══════════════════════════════════════════
  -- 5. TRANSACTIONS — PREVIOUS MONTH
  -- ═══════════════════════════════════════════

  -- Income
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, cat_salary,      185000.00, 'LKR', 185000.00, 'income',  m1 + interval '0 days 9 hours',   'Monthly salary'),
    (uid, acc_checking, cat_freelance,    45000.00, 'LKR',  45000.00, 'income',  m1 + interval '10 days 15 hours', 'Logo design project'),
    (uid, acc_savings,  cat_investments,  12500.00, 'LKR',  12500.00, 'income',  m1 + interval '15 days 10 hours', 'FD interest');

  -- Rent
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, cat_rent, 45000.00, 'LKR', 45000.00, 'expense', m1 + interval '1 day', 'Monthly rent');

  -- Bills
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, cat_bills, 8500.00, 'LKR', 8500.00, 'expense', m1 + interval '2 days',  'CEB bill'),
    (uid, acc_checking, cat_bills, 3200.00, 'LKR', 3200.00, 'expense', m1 + interval '2 days',  'Internet'),
    (uid, acc_checking, cat_bills, 2800.00, 'LKR', 2800.00, 'expense', m1 + interval '5 days',  'Phone bill'),
    (uid, acc_checking, cat_bills, 1490.00, 'LKR', 1490.00, 'expense', m1 + interval '3 days',  'Netflix');

  -- Groceries
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit, cat_groceries, 8750.00, 'LKR', 8750.00, 'expense', m1 + interval '2 days 16 hours',  'Keells weekly'),
    (uid, acc_credit, cat_groceries, 6200.00, 'LKR', 6200.00, 'expense', m1 + interval '9 days 11 hours',  'Cargills'),
    (uid, acc_credit, cat_groceries, 4800.00, 'LKR', 4800.00, 'expense', m1 + interval '16 days 14 hours', 'Groceries'),
    (uid, acc_cash,   cat_groceries, 3500.00, 'LKR', 3500.00, 'expense', m1 + interval '23 days 17 hours', 'Pola');

  -- Food & Dining
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit, cat_food, 4500.00, 'LKR', 4500.00, 'expense', m1 + interval '3 days 19 hours',  'Restaurant'),
    (uid, acc_cash,   cat_food, 1200.00, 'LKR', 1200.00, 'expense', m1 + interval '8 days 12 hours',  'Tea shop'),
    (uid, acc_credit, cat_food, 7800.00, 'LKR', 7800.00, 'expense', m1 + interval '14 days 20 hours', 'Birthday dinner'),
    (uid, acc_cash,   cat_food,  850.00, 'LKR',  850.00, 'expense', m1 + interval '20 days 8 hours',  'Kottu');

  -- Transportation
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit,   cat_transport, 9500.00, 'LKR', 9500.00, 'expense', m1 + interval '4 days 7 hours', 'Fuel'),
    (uid, acc_cash,     cat_transport, 1500.00, 'LKR', 1500.00, 'expense', m1 + interval '12 days',        'Parking'),
    (uid, acc_checking, cat_transport, 12000.00, 'LKR', 12000.00, 'expense', m1 + interval '6 days',       'Vehicle insurance');

  -- Shopping
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit, cat_shopping, 14500.00, 'LKR', 14500.00, 'expense', m1 + interval '7 days 15 hours',  'Shoes'),
    (uid, acc_credit, cat_shopping,  3800.00, 'LKR',  3800.00, 'expense', m1 + interval '20 days 14 hours', 'Household items');

  -- Entertainment
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_cash,   cat_entertainment, 5000.00, 'LKR', 5000.00, 'expense', m1 + interval '11 days 21 hours', 'Movie tickets'),
    (uid, acc_credit, cat_entertainment, 2500.00, 'LKR', 2500.00, 'expense', m1 + interval '18 days',          'Spotify annual');

  -- Health
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, cat_health,  5000.00, 'LKR',  5000.00, 'expense', m1 + interval '3 days',           'Gym membership'),
    (uid, acc_checking, cat_health, 15000.00, 'LKR', 15000.00, 'expense', m1 + interval '17 days 10 hours', 'Doctor visit');

  -- Education
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit, cat_education, 4500.00, 'LKR', 4500.00, 'expense', m1 + interval '6 days 14 hours', 'Udemy course');

  -- Transfers (previous month)
  INSERT INTO transactions (user_id, account_id, to_account_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, acc_savings, 50000.00, 'LKR', 50000.00, 'transfer', m1 + interval '1 day 11 hours',  'Monthly savings'),
    (uid, acc_checking, acc_cash,    10000.00, 'LKR', 10000.00, 'transfer', m1 + interval '5 days 10 hours', 'ATM withdrawal');

  -- ═══════════════════════════════════════════
  -- 6. TRANSACTIONS — CURRENT MONTH
  -- ═══════════════════════════════════════════

  -- Income
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, cat_salary,    185000.00, 'LKR', 185000.00, 'income', m0 + interval '0 days 9 hours',  'Monthly salary'),
    (uid, acc_checking, cat_freelance,  35000.00, 'LKR',  35000.00, 'income', m0 + interval '5 days 14 hours', 'Website project');

  -- Rent
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, cat_rent, 45000.00, 'LKR', 45000.00, 'expense', m0 + interval '1 day 10 hours', 'Monthly rent');

  -- Bills
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, cat_bills, 7800.00, 'LKR', 7800.00, 'expense', m0 + interval '2 days',  'CEB bill'),
    (uid, acc_checking, cat_bills, 3200.00, 'LKR', 3200.00, 'expense', m0 + interval '2 days',  'Internet'),
    (uid, acc_checking, cat_bills, 1490.00, 'LKR', 1490.00, 'expense', m0 + interval '3 days',  'Netflix');

  -- Groceries
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit, cat_groceries, 9200.00, 'LKR', 9200.00, 'expense', m0 + interval '2 days 16 hours', 'Keells weekly'),
    (uid, acc_credit, cat_groceries, 5400.00, 'LKR', 5400.00, 'expense', m0 + interval '4 days 11 hours', 'Arpico'),
    (uid, acc_cash,   cat_groceries, 2800.00, 'LKR', 2800.00, 'expense', m0 + interval '6 days 18 hours', 'Pola');

  -- Food & Dining
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit, cat_food, 3800.00, 'LKR', 3800.00, 'expense', m0 + interval '1 day 19 hours',  'Dinner with friends'),
    (uid, acc_cash,   cat_food, 1100.00, 'LKR', 1100.00, 'expense', m0 + interval '3 days 12 hours', 'Rice & curry'),
    (uid, acc_credit, cat_food, 4200.00, 'LKR', 4200.00, 'expense', m0 + interval '5 days 20 hours', 'Pizza hut'),
    (uid, acc_cash,   cat_food,  650.00, 'LKR',  650.00, 'expense', m0 + interval '7 days 8 hours',  'Tea & short eats');

  -- Transportation
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit,   cat_transport, 8500.00, 'LKR', 8500.00, 'expense', m0 + interval '1 day 7 hours', 'Fuel'),
    (uid, acc_checking, cat_transport, 12000.00, 'LKR', 12000.00, 'expense', m0 + interval '3 days',      'Vehicle insurance');

  -- Shopping
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_credit, cat_shopping, 18500.00, 'LKR', 18500.00, 'expense', m0 + interval '4 days 15 hours', 'Headphones'),
    (uid, acc_credit, cat_shopping,  2800.00, 'LKR',  2800.00, 'expense', m0 + interval '6 days 14 hours', 'Book');

  -- Entertainment
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_cash,   cat_entertainment, 3500.00, 'LKR', 3500.00, 'expense', m0 + interval '5 days 21 hours', 'Movie tickets'),
    (uid, acc_credit, cat_entertainment, 1800.00, 'LKR', 1800.00, 'expense', m0 + interval '7 days',          'Game purchase');

  -- Health
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, cat_health, 5000.00, 'LKR', 5000.00, 'expense', m0 + interval '4 days 10 hours', 'Gym membership');

  -- Other
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_cash, cat_other_exp, 500.00, 'LKR', 500.00, 'expense', m0 + interval '6 days 9 hours', 'Tip');

  -- Transfers (current month)
  INSERT INTO transactions (user_id, account_id, to_account_id, amount, currency, amount_in_base, type, occurred_at, note) VALUES
    (uid, acc_checking, acc_savings, 40000.00, 'LKR', 40000.00, 'transfer', m0 + interval '1 day 11 hours',  'Monthly savings'),
    (uid, acc_checking, acc_cash,    15000.00, 'LKR', 15000.00, 'transfer', m0 + interval '0 days 10 hours', 'ATM withdrawal');

  -- ═══════════════════════════════════════════
  -- 7. BUDGETS
  -- ═══════════════════════════════════════════
  INSERT INTO budgets (user_id, category_id, period, amount, currency, start_date, name) VALUES
    (uid, cat_groceries,     'monthly', 30000.00, 'LKR', m0::date, 'Grocery Budget'),
    (uid, cat_food,          'monthly', 20000.00, 'LKR', m0::date, 'Dining Out'),
    (uid, cat_entertainment, 'monthly', 10000.00, 'LKR', m0::date, 'Fun Money'),
    (uid, cat_shopping,      'monthly', 25000.00, 'LKR', m0::date, 'Shopping Budget'),
    (uid, cat_transport,     'monthly', 25000.00, 'LKR', m0::date, 'Transportation');

  RAISE NOTICE 'Seeded for user %: 4 accounts, 14 categories, ~45 transactions, 5 budgets (all LKR)', uid;
END $$;
