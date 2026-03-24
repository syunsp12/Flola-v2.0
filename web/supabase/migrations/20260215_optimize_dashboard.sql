-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_monthly_balances_account_date ON monthly_balances(account_id, record_date);

-- Function to get dashboard stats in one go
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_start_date text,
  p_end_date text,
  p_current_month_start text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_net_worth numeric;
  v_total_assets numeric;
  v_total_liabilities numeric;
  v_monthly_flow json;
  v_category_ranking json;
  v_recent_transactions json;
  v_current_month_expense numeric;
BEGIN
  -- 1. Net Worth Calculation (Latest balances)
  WITH latest_balances AS (
    SELECT DISTINCT ON (account_id)
      account_id,
      amount
    FROM monthly_balances
    ORDER BY account_id, record_date DESC
  ),
  account_totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN a.is_liability = false THEN lb.amount ELSE 0 END), 0) as assets,
      COALESCE(SUM(CASE WHEN a.is_liability = true THEN lb.amount ELSE 0 END), 0) as liabilities
    FROM latest_balances lb
    JOIN accounts a ON a.id = lb.account_id
  )
  SELECT
    assets - liabilities,
    assets,
    liabilities
  INTO
    v_net_worth,
    v_total_assets,
    v_total_liabilities
  FROM account_totals;

  -- 2. Monthly Flow (Income/Expense) for the requested range
  WITH monthly_data AS (
     SELECT
       to_char(COALESCE(user_date, date)::date, 'YYYY-MM') as month_key,
       SUM(CASE WHEN type = 'income' THEN COALESCE(user_amount, amount) ELSE 0 END) as income,
       SUM(CASE WHEN type = 'expense' THEN COALESCE(user_amount, amount) ELSE 0 END) as expense
     FROM transactions
     WHERE
       status = 'confirmed'
       AND COALESCE(user_date, date) >= p_start_date
       AND COALESCE(user_date, date) <= p_end_date
     GROUP BY 1
  )
  SELECT json_agg(
    json_build_object(
      'month', month_key, -- Client can format this
      'income', income,
      'expense', expense
    ) ORDER BY month_key
  ) INTO v_monthly_flow
  FROM monthly_data;

  -- 3. Category Ranking (Current Month)
  WITH current_month_txns AS (
    SELECT
      t.id,
      COALESCE(t.user_amount, t.amount) as amount,
      COALESCE(uc.name, c.name) as category_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN categories uc ON t.user_category_id = uc.id
    WHERE
      t.status = 'confirmed'
      AND t.type = 'expense'
      AND to_char(COALESCE(t.user_date, t.date)::date, 'YYYY-MM') = p_current_month_start
  ),
  category_sums AS (
    SELECT
      category_name as name,
      SUM(amount) as value
    FROM current_month_txns
    GROUP BY 1
  )
  SELECT json_agg(
    json_build_object('name', name, 'value', value)
    ORDER BY value DESC
    LIMIT 5
  ) INTO v_category_ranking
  FROM category_sums;

  -- Total expense for current month
  SELECT COALESCE(SUM(value), 0) INTO v_current_month_expense FROM category_sums;

  -- 4. Recent Transactions
  SELECT json_agg(t) INTO v_recent_transactions
  FROM (
    SELECT
      t.id,
      COALESCE(t.user_amount, t.amount) as amount,
      t.type,
      COALESCE(t.user_date, t.date) as date,
      COALESCE(t.user_description, t.description) as description,
      COALESCE(uc.name, c.name) as category_name,
      a.name as account_name,
      a.icon_url as account_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN categories uc ON t.user_category_id = uc.id
    LEFT JOIN accounts a ON COALESCE(t.user_from_account_id, t.from_account_id) = a.id
    WHERE t.status = 'confirmed'
    ORDER BY COALESCE(t.user_date, t.date) DESC
    LIMIT 5
  ) t;

  RETURN json_build_object(
    'netWorth', COALESCE(v_net_worth, 0),
    'totalAssets', COALESCE(v_total_assets, 0),
    'totalLiabilities', COALESCE(v_total_liabilities, 0),
    'monthlyFlowData', COALESCE(v_monthly_flow, '[]'::json),
    'categoryRanking', COALESCE(v_category_ranking, '[]'::json),
    'currentMonthTotalExpense', COALESCE(v_current_month_expense, 0),
    'recentTransactions', COALESCE(v_recent_transactions, '[]'::json)
  );
END;
$$;
