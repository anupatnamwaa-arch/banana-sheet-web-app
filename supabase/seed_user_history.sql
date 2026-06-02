-- SEED HISTORY FOR USER 8a3fc00b-df49-4b2d-aa4e-90a2abafae65
DO $$
DECLARE
  v_user_id uuid := '8a3fc00b-df49-4b2d-aa4e-90a2abafae65';
  v_cash_id uuid;
  v_coop_id uuid;
  v_gpf_id uuid;
  v_ssf_id uuid;
  v_stock_id uuid;
  v_btc_id uuid;
  v_gold_id uuid;
  v_car_id uuid;
BEGIN
  -- 1. ACTIVATE PROFILE
  INSERT INTO public.profiles (id, is_active, plan_type, plan_expires_at, created_at)
  VALUES (v_user_id, true, 'lifetime', null, now())
  ON CONFLICT (id) DO UPDATE 
  SET is_active = true, plan_type = 'lifetime', plan_expires_at = null;

  -- 2. CLEAR ALL PREVIOUS ENTRIES FOR THIS USER
  DELETE FROM public.wealth_debt WHERE user_id = v_user_id;
  DELETE FROM public.wealth_item_snapshots WHERE user_id = v_user_id;
  DELETE FROM public.net_worth_snapshots WHERE user_id = v_user_id;

  -- 3. INSERT WEALTH & DEBT ITEMS (WITH LATEST LIVE VALUATIONS)

  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Cash & Bank', 'asset', 23088.07, true, now()) RETURNING id INTO v_cash_id;

  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Cooperative (สหกรณ์)', 'asset', 186000.00, false, now()) RETURNING id INTO v_coop_id;

  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'GPF (กบข.)', 'asset', 575102.02, false, now()) RETURNING id INTO v_gpf_id;

  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'SSF', 'asset', 104411.18, false, now()) RETURNING id INTO v_ssf_id;

  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'US Stocks', 'asset', 331723.04, false, now()) RETURNING id INTO v_stock_id;

  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Bitcoin', 'asset', 1125.17, false, now()) RETURNING id INTO v_btc_id;

  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Gold', 'asset', 513.56, false, now()) RETURNING id INTO v_gold_id;

  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Car Loan (หนี้รถ)', 'liability', 16115.00, false, now()) RETURNING id INTO v_car_id;


  -- 4. INSERT MONTHLY SNAPSHOTS

  -- === 2023-01 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-01', 'Cooperative (สหกรณ์)', 'asset', 66000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-01', 'GPF (กบข.)', 'asset', 155382.25);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-01', 'SSF', 'asset', 76416.80);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-01', 'Car Loan (หนี้รถ)', 'liability', 612370.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-01', -314570.95, 297799.05, 612370.00, now());

  -- === 2023-02 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-02', 'Cooperative (สหกรณ์)', 'asset', 69000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-02', 'GPF (กบข.)', 'asset', 156372.70);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-02', 'SSF', 'asset', 74484.84);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-02', 'Car Loan (หนี้รถ)', 'liability', 596255.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-02', -296397.46, 299857.54, 596255.00, now());

  -- === 2023-03 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-03', 'Cooperative (สหกรณ์)', 'asset', 72000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-03', 'GPF (กบข.)', 'asset', 161095.30);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-03', 'SSF', 'asset', 75490.34);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-03', 'Car Loan (หนี้รถ)', 'liability', 580140.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-03', -271554.36, 308585.64, 580140.00, now());

  -- === 2023-04 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-04', 'Cooperative (สหกรณ์)', 'asset', 75000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-04', 'GPF (กบข.)', 'asset', 165611.20);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-04', 'SSF', 'asset', 76496.50);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-04', 'Car Loan (หนี้รถ)', 'liability', 564025.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-04', -246917.30, 317107.70, 564025.00, now());

  -- === 2023-05 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-05', 'Cooperative (สหกรณ์)', 'asset', 78000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-05', 'GPF (กบข.)', 'asset', 173003.69);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-05', 'SSF', 'asset', 78037.84);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-05', 'Car Loan (หนี้รถ)', 'liability', 547910.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-05', -218868.47, 329041.53, 547910.00, now());

  -- === 2023-06 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-06', 'Cooperative (สหกรณ์)', 'asset', 81000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-06', 'GPF (กบข.)', 'asset', 184429.79);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-06', 'SSF', 'asset', 80980.10);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2023-06', 'US Stocks', 'asset', 49166.83);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-06', 'Car Loan (หนี้รถ)', 'liability', 531795.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-06', -136218.28, 395576.72, 531795.00, now());

  -- === 2023-07 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-07', 'Cooperative (สหกรณ์)', 'asset', 84000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-07', 'GPF (กบข.)', 'asset', 191585.31);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-07', 'SSF', 'asset', 83178.78);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2023-07', 'US Stocks', 'asset', 50148.30);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-07', 'Car Loan (หนี้รถ)', 'liability', 515680.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-07', -106767.61, 408912.39, 515680.00, now());

  -- === 2023-08 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2023-08', 'Cash & Bank', 'asset', 7083.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-08', 'Cooperative (สหกรณ์)', 'asset', 87000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-08', 'GPF (กบข.)', 'asset', 194325.05);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-08', 'SSF', 'asset', 82170.59);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2023-08', 'US Stocks', 'asset', 129448.63);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-08', 'Car Loan (หนี้รถ)', 'liability', 499565.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-08', 462.27, 500027.27, 499565.00, now());

  -- === 2023-09 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2023-09', 'Cash & Bank', 'asset', 10083.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-09', 'Cooperative (สหกรณ์)', 'asset', 90000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-09', 'GPF (กบข.)', 'asset', 195846.72);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-09', 'SSF', 'asset', 77885.69);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2023-09', 'US Stocks', 'asset', 133656.07);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-09', 'Car Loan (หนี้รถ)', 'liability', 483450.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-09', 24021.48, 507471.48, 483450.00, now());

  -- === 2023-10 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2023-10', 'Cash & Bank', 'asset', 13883.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-10', 'Cooperative (สหกรณ์)', 'asset', 93000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-10', 'GPF (กบข.)', 'asset', 193699.93);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-10', 'SSF', 'asset', 74976.99);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2023-10', 'US Stocks', 'asset', 161830.30);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-10', 'Car Loan (หนี้รถ)', 'liability', 467335.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-10', 70055.22, 537390.22, 467335.00, now());

  -- === 2023-11 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2023-11', 'Cash & Bank', 'asset', 20000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-11', 'Cooperative (สหกรณ์)', 'asset', 96000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-11', 'GPF (กบข.)', 'asset', 208564.08);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-11', 'SSF', 'asset', 81769.44);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2023-11', 'US Stocks', 'asset', 183014.83);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-11', 'Car Loan (หนี้รถ)', 'liability', 451220.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-11', 138128.35, 589348.35, 451220.00, now());

  -- === 2023-12 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2023-12', 'Cash & Bank', 'asset', 25000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2023-12', 'Cooperative (สหกรณ์)', 'asset', 99000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2023-12', 'GPF (กบข.)', 'asset', 219211.34);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2023-12', 'SSF', 'asset', 84946.59);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2023-12', 'US Stocks', 'asset', 229962.29);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2023-12', 'Car Loan (หนี้รถ)', 'liability', 435105.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2023-12', 223015.22, 658120.22, 435105.00, now());

  -- === 2024-01 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-01', 'Cash & Bank', 'asset', 35098.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-01', 'Cooperative (สหกรณ์)', 'asset', 102000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-01', 'GPF (กบข.)', 'asset', 231719.18);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-01', 'SSF', 'asset', 87123.97);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-01', 'US Stocks', 'asset', 222501.17);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-01', 'Car Loan (หนี้รถ)', 'liability', 418990.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-01', 259452.32, 678442.32, 418990.00, now());

  -- === 2024-02 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-02', 'Cash & Bank', 'asset', 45098.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-02', 'Cooperative (สหกรณ์)', 'asset', 105000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-02', 'GPF (กบข.)', 'asset', 250180.99);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-02', 'SSF', 'asset', 89809.22);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-02', 'US Stocks', 'asset', 258014.85);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-02', 'Car Loan (หนี้รถ)', 'liability', 402875.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-02', 345228.06, 748103.06, 402875.00, now());

  -- === 2024-03 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-03', 'Cash & Bank', 'asset', 60000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-03', 'Cooperative (สหกรณ์)', 'asset', 108000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-03', 'GPF (กบข.)', 'asset', 265631.65);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-03', 'SSF', 'asset', 92838.17);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-03', 'US Stocks', 'asset', 283393.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-03', 'Car Loan (หนี้รถ)', 'liability', 386760.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-03', 423102.82, 809862.82, 386760.00, now());

  -- === 2024-04 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-04', 'Cash & Bank', 'asset', 70000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-04', 'Cooperative (สหกรณ์)', 'asset', 111000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-04', 'GPF (กบข.)', 'asset', 270945.84);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-04', 'SSF', 'asset', 90187.75);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-04', 'US Stocks', 'asset', 256480.21);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-04', 'Car Loan (หนี้รถ)', 'liability', 370645.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-04', 427968.80, 798613.80, 370645.00, now());

  -- === 2024-05 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-05', 'Cash & Bank', 'asset', 80000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-05', 'Cooperative (สหกรณ์)', 'asset', 114000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-05', 'GPF (กบข.)', 'asset', 284574.52);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-05', 'SSF', 'asset', 92295.96);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-05', 'US Stocks', 'asset', 287778.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-05', 'Car Loan (หนี้รถ)', 'liability', 354530.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-05', 504118.48, 858648.48, 354530.00, now());

  -- === 2024-06 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-06', 'Cash & Bank', 'asset', 81031.48);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-06', 'Cooperative (สหกรณ์)', 'asset', 117000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-06', 'GPF (กบข.)', 'asset', 295793.38);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-06', 'SSF', 'asset', 94052.42);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-06', 'US Stocks', 'asset', 284007.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-06', 'Car Loan (หนี้รถ)', 'liability', 338415.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-06', 533469.28, 871884.28, 338415.00, now());

  -- === 2024-07 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-07', 'Cash & Bank', 'asset', 81100.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-07', 'Cooperative (สหกรณ์)', 'asset', 120000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-07', 'GPF (กบข.)', 'asset', 290882.35);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-07', 'SSF', 'asset', 92463.26);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-07', 'US Stocks', 'asset', 284481.43);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-07', 'Car Loan (หนี้รถ)', 'liability', 322300.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-07', 546627.04, 868927.04, 322300.00, now());

  -- === 2024-08 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-08', 'Cash & Bank', 'asset', 81200.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-08', 'Cooperative (สหกรณ์)', 'asset', 123000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-08', 'GPF (กบข.)', 'asset', 290006.13);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-08', 'SSF', 'asset', 94456.34);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-08', 'US Stocks', 'asset', 278006.26);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-08', 'Car Loan (หนี้รถ)', 'liability', 306185.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-08', 560483.73, 866668.73, 306185.00, now());

  -- === 2024-09 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-09', 'Cash & Bank', 'asset', 60000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-09', 'Cooperative (สหกรณ์)', 'asset', 126000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-09', 'GPF (กบข.)', 'asset', 293081.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-09', 'SSF', 'asset', 96491.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-09', 'US Stocks', 'asset', 260361.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-09', 'Car Loan (หนี้รถ)', 'liability', 290070.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-09', 545863.00, 835933.00, 290070.00, now());

  -- === 2024-10 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-10', 'Cash & Bank', 'asset', 69020.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-10', 'Cooperative (สหกรณ์)', 'asset', 129000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-10', 'GPF (กบข.)', 'asset', 309694.04);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-10', 'SSF', 'asset', 97661.11);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-10', 'US Stocks', 'asset', 261750.77);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-10', 'Car Loan (หนี้รถ)', 'liability', 273955.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-10', 593170.92, 867125.92, 273955.00, now());

  -- === 2024-11 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-11', 'Cash & Bank', 'asset', 52060.48);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-11', 'Cooperative (สหกรณ์)', 'asset', 132000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-11', 'GPF (กบข.)', 'asset', 320799.21);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-11', 'SSF', 'asset', 101017.29);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-11', 'US Stocks', 'asset', 279152.97);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-11', 'Car Loan (หนี้รถ)', 'liability', 257840.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-11', 627189.95, 885029.95, 257840.00, now());

  -- === 2024-12 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2024-12', 'Cash & Bank', 'asset', 4215.48);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2024-12', 'Cooperative (สหกรณ์)', 'asset', 135000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2024-12', 'GPF (กบข.)', 'asset', 323454.29);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2024-12', 'SSF', 'asset', 99086.55);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2024-12', 'US Stocks', 'asset', 276388.73);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2024-12', 'Car Loan (หนี้รถ)', 'liability', 241725.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2024-12', 596420.05, 838145.05, 241725.00, now());

  -- === 2025-01 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-01', 'Cash & Bank', 'asset', 6779.14);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-01', 'Cooperative (สหกรณ์)', 'asset', 138000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-01', 'GPF (กบข.)', 'asset', 331453.96);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-01', 'SSF', 'asset', 99424.73);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-01', 'US Stocks', 'asset', 283906.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_btc_id, '2025-01', 'Bitcoin', 'asset', 1020.75);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-01', 'Car Loan (หนี้รถ)', 'liability', 225610.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-01', 634974.58, 860584.58, 225610.00, now());

  -- === 2025-02 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-02', 'Cash & Bank', 'asset', 5780.14);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-02', 'Cooperative (สหกรณ์)', 'asset', 141000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-02', 'GPF (กบข.)', 'asset', 340289.15);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-02', 'SSF', 'asset', 96616.42);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-02', 'US Stocks', 'asset', 278782.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_btc_id, '2025-02', 'Bitcoin', 'asset', 2004.72);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-02', 'Car Loan (หนี้รถ)', 'liability', 209495.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-02', 654977.43, 864472.43, 209495.00, now());

  -- === 2025-03 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-03', 'Cash & Bank', 'asset', 1501.47);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-03', 'Cooperative (สหกรณ์)', 'asset', 144000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-03', 'GPF (กบข.)', 'asset', 339393.33);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-03', 'SSF', 'asset', 91936.01);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-03', 'US Stocks', 'asset', 257054.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_btc_id, '2025-03', 'Bitcoin', 'asset', 2789.02);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gold_id, '2025-03', 'Gold', 'asset', 511.05);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-03', 'Car Loan (หนี้รถ)', 'liability', 193380.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-03', 643804.88, 837184.88, 193380.00, now());

  -- === 2025-04 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-04', 'Cash & Bank', 'asset', 1001.50);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-04', 'Cooperative (สหกรณ์)', 'asset', 147000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-04', 'GPF (กบข.)', 'asset', 318966.15);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-04', 'SSF', 'asset', 90896.40);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-04', 'US Stocks', 'asset', 267669.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_btc_id, '2025-04', 'Bitcoin', 'asset', 3366.10);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gold_id, '2025-04', 'Gold', 'asset', 513.56);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-04', 'Car Loan (หนี้รถ)', 'liability', 177265.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-04', 652147.71, 829412.71, 177265.00, now());

  -- === 2025-05 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-05', 'Cash & Bank', 'asset', 5069.88);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-05', 'Cooperative (สหกรณ์)', 'asset', 150000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-05', 'GPF (กบข.)', 'asset', 354099.01);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-05', 'SSF', 'asset', 96366.56);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-05', 'US Stocks', 'asset', 287439.28);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-05', 'Car Loan (หนี้รถ)', 'liability', 161150.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-05', 731824.73, 892974.73, 161150.00, now());

  -- === 2025-06 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-06', 'Cash & Bank', 'asset', 6106.98);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-06', 'Cooperative (สหกรณ์)', 'asset', 153000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-06', 'GPF (กบข.)', 'asset', 373925.21);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-06', 'SSF', 'asset', 99882.27);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-06', 'US Stocks', 'asset', 314004.05);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-06', 'Car Loan (หนี้รถ)', 'liability', 145035.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-06', 801883.51, 946918.51, 145035.00, now());

  -- === 2025-07 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-07', 'Cash & Bank', 'asset', 7106.98);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-07', 'Cooperative (สหกรณ์)', 'asset', 156000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-07', 'GPF (กบข.)', 'asset', 387726.79);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-07', 'SSF', 'asset', 102646.82);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-07', 'US Stocks', 'asset', 357159.96);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-07', 'Car Loan (หนี้รถ)', 'liability', 128920.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-07', 881720.55, 1010640.55, 128920.00, now());

  -- === 2025-08 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-08', 'Cash & Bank', 'asset', 8106.98);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-08', 'Cooperative (สหกรณ์)', 'asset', 159000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-08', 'GPF (กบข.)', 'asset', 400673.35);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-08', 'SSF', 'asset', 104469.39);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-08', 'US Stocks', 'asset', 347844.76);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-08', 'Car Loan (หนี้รถ)', 'liability', 112805.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-08', 907289.48, 1020094.48, 112805.00, now());

  -- === 2025-09 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-09', 'Cash & Bank', 'asset', 10006.98);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-09', 'Cooperative (สหกรณ์)', 'asset', 162000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-09', 'GPF (กบข.)', 'asset', 421878.39);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-09', 'SSF', 'asset', 106835.23);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-09', 'US Stocks', 'asset', 380529.18);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-09', 'Car Loan (หนี้รถ)', 'liability', 96690.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-09', 984559.78, 1081249.78, 96690.00, now());

  -- === 2025-10 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-10', 'Cash & Bank', 'asset', 11006.98);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-10', 'Cooperative (สหกรณ์)', 'asset', 165000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-10', 'GPF (กบข.)', 'asset', 446601.04);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-10', 'SSF', 'asset', 109205.71);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-10', 'US Stocks', 'asset', 413800.49);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-10', 'Car Loan (หนี้รถ)', 'liability', 80575.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-10', 1065039.22, 1145614.22, 80575.00, now());

  -- === 2025-11 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-11', 'Cash & Bank', 'asset', 12006.98);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-11', 'Cooperative (สหกรณ์)', 'asset', 168000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-11', 'GPF (กบข.)', 'asset', 444037.31);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-11', 'SSF', 'asset', 107724.25);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-11', 'US Stocks', 'asset', 347504.92);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-11', 'Car Loan (หนี้รถ)', 'liability', 64460.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-11', 1014813.46, 1079273.46, 64460.00, now());

  -- === 2025-12 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2025-12', 'Cash & Bank', 'asset', 13240.30);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2025-12', 'Cooperative (สหกรณ์)', 'asset', 171000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2025-12', 'GPF (กบข.)', 'asset', 444921.68);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2025-12', 'SSF', 'asset', 106894.18);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2025-12', 'US Stocks', 'asset', 341083.74);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2025-12', 'Car Loan (หนี้รถ)', 'liability', 48345.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2025-12', 1028794.90, 1077139.90, 48345.00, now());

  -- === 2026-01 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2026-01', 'Cash & Bank', 'asset', 15240.42);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2026-01', 'Cooperative (สหกรณ์)', 'asset', 174000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2026-01', 'GPF (กบข.)', 'asset', 479580.89);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2026-01', 'SSF', 'asset', 107527.43);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2026-01', 'US Stocks', 'asset', 327750.58);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2026-01', 'Car Loan (หนี้รถ)', 'liability', 32230.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2026-01', 1071869.32, 1104099.32, 32230.00, now());

  -- === 2026-02 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2026-02', 'Cash & Bank', 'asset', 17244.99);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2026-02', 'Cooperative (สหกรณ์)', 'asset', 177000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2026-02', 'GPF (กบข.)', 'asset', 496394.75);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2026-02', 'SSF', 'asset', 105992.89);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2026-02', 'US Stocks', 'asset', 320760.80);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '2026-02', 'Car Loan (หนี้รถ)', 'liability', 16115.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2026-02', 1101278.43, 1117393.43, 16115.00, now());

  -- === 2026-03 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2026-03', 'Cash & Bank', 'asset', 20052.63);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2026-03', 'Cooperative (สหกรณ์)', 'asset', 180000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2026-03', 'GPF (กบข.)', 'asset', 479513.71);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2026-03', 'SSF', 'asset', 97394.93);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2026-03', 'US Stocks', 'asset', 292632.30);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_btc_id, '2026-03', 'Bitcoin', 'asset', 1000.00);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2026-03', 1070593.57, 1070593.57, 0.00, now());

  -- === 2026-04 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2026-04', 'Cash & Bank', 'asset', 22074.11);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2026-04', 'Cooperative (สหกรณ์)', 'asset', 183000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2026-04', 'GPF (กบข.)', 'asset', 533494.78);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2026-04', 'SSF', 'asset', 108640.32);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2026-04', 'US Stocks', 'asset', 299062.78);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_btc_id, '2026-04', 'Bitcoin', 'asset', 1171.66);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2026-04', 1147443.65, 1147443.65, 0.00, now());

  -- === 2026-05 ===
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '2026-05', 'Cash & Bank', 'asset', 23088.07);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '2026-05', 'Cooperative (สหกรณ์)', 'asset', 186000.00);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '2026-05', 'GPF (กบข.)', 'asset', 575102.02);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '2026-05', 'SSF', 'asset', 104411.18);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '2026-05', 'US Stocks', 'asset', 331723.04);
  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_btc_id, '2026-05', 'Bitcoin', 'asset', 1125.17);
  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '2026-05', 1221449.48, 1221449.48, 0.00, now());

END $$;