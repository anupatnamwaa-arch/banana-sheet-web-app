const fs = require('fs');
const path = require('path');

const wealthCsvPath = "C:\\Users\\DELL\\Downloads\\wealth_rows.csv";
const debtCsvPath = "C:\\Users\\DELL\\Downloads\\debt_rows.csv";
const outputSqlPath = "C:\\Users\\DELL\\Downloads\\Side Project\\banana-sheet-web-app\\supabase\\seed_user_history.sql";

const monthsMap = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'March': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
  'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

const userId = '8a3fc00b-df49-4b2d-aa4e-90a2abafae65';

function parseNum(val) {
  if (!val) return 0.0;
  const cleaned = val.trim().replace(/฿/g, '').replace(/,/g, '').replace(/\s/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0.0 : num;
}

function parseCSV(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',');
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = values[idx] ? values[idx].trim() : '';
    });
    results.push(obj);
  }
  return results;
}

// 1. Read files
const wealthContent = fs.readFileSync(wealthCsvPath, 'utf8');
const debtContent = fs.readFileSync(debtCsvPath, 'utf8');

const wealthRows = parseCSV(wealthContent);
const debtRows = parseCSV(debtContent);

// 2. Parse Wealth
const wealthData = [];
for (const row of wealthRows) {
  const year = row.year;
  const month = row.month;
  const mNum = monthsMap[month];
  if (!mNum) continue;
  const monthKey = `${year}-${mNum}`;

  const assets = {
    cash: parseNum(row.cash),
    coperative: parseNum(row.coperative),
    gpf: parseNum(row.gpf),
    ssf: parseNum(row.ssf),
    us_stock: parseNum(row.us_stock),
    btc: parseNum(row.btc),
    gold: parseNum(row.gold)
  };

  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  if (totalAssets > 0) {
    wealthData.push({
      month: monthKey,
      assets,
      total_assets: totalAssets
    });
  }
}

// 3. Parse Debt
const debtData = {};
for (const row of debtRows) {
  const year = row.year;
  const month = row.month;
  const mNum = monthsMap[month];
  if (!mNum) continue;
  const monthKey = `${year}-${mNum}`;

  const carDebt = parseNum(row.car);
  if (carDebt > 0) {
    debtData[monthKey] = carDebt;
  }
}

// 4. Merge data by month
const allMonths = new Set([...wealthData.map(w => w.month), ...Object.keys(debtData)]);
const sortedMonths = Array.from(allMonths).sort((a, b) => a.localeCompare(b));

const latestValues = {
  cash: 0.0, coperative: 0.0, gpf: 0.0, ssf: 0.0, us_stock: 0.0, btc: 0.0, gold: 0.0,
  car: 0.0
};

const mergedHistory = {};

for (const m of sortedMonths) {
  let assets = { cash: 0.0, coperative: 0.0, gpf: 0.0, ssf: 0.0, us_stock: 0.0, btc: 0.0, gold: 0.0 };
  const wMatch = wealthData.find(x => x.month === m);
  if (wMatch) {
    assets = wMatch.assets;
    for (const [k, v] of Object.entries(assets)) {
      if (v > 0) latestValues[k] = v;
    }
  }

  const carDebt = debtData[m] || 0.0;
  if (carDebt > 0) {
    latestValues.car = carDebt;
  }

  const totAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  const totLiab = carDebt;
  const netWorth = totAssets - totLiab;

  mergedHistory[m] = {
    assets,
    car: carDebt,
    total_assets: totAssets,
    total_liabilities: totLiab,
    net_worth: netWorth
  };
}

// Generate SQL
const sql = [];
sql.push(`-- SEED HISTORY FOR USER ${userId}
DO $$
DECLARE
  v_user_id uuid := '${userId}';
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
`);

sql.push(`  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Cash & Bank', 'asset', ${latestValues.cash.toFixed(2)}, true, now()) RETURNING id INTO v_cash_id;
`);
sql.push(`  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Cooperative (สหกรณ์)', 'asset', ${latestValues.coperative.toFixed(2)}, false, now()) RETURNING id INTO v_coop_id;
`);
sql.push(`  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'GPF (กบข.)', 'asset', ${latestValues.gpf.toFixed(2)}, false, now()) RETURNING id INTO v_gpf_id;
`);
sql.push(`  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'SSF', 'asset', ${latestValues.ssf.toFixed(2)}, false, now()) RETURNING id INTO v_ssf_id;
`);
sql.push(`  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'US Stocks', 'asset', ${latestValues.us_stock.toFixed(2)}, false, now()) RETURNING id INTO v_stock_id;
`);
sql.push(`  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Bitcoin', 'asset', ${latestValues.btc.toFixed(2)}, false, now()) RETURNING id INTO v_btc_id;
`);
sql.push(`  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Gold', 'asset', ${latestValues.gold.toFixed(2)}, false, now()) RETURNING id INTO v_gold_id;
`);
sql.push(`  INSERT INTO public.wealth_debt (user_id, name, type, value, is_liquid, updated_at)
  VALUES (v_user_id, 'Car Loan (หนี้รถ)', 'liability', ${latestValues.car.toFixed(2)}, false, now()) RETURNING id INTO v_car_id;
`);

sql.push(`\n  -- 4. INSERT MONTHLY SNAPSHOTS`);

for (const m of sortedMonths) {
  const data = mergedHistory[m];
  sql.push(`\n  -- === ${m} ===`);

  if (data.assets.cash > 0) {
    sql.push(`  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_cash_id, '${m}', 'Cash & Bank', 'asset', ${data.assets.cash.toFixed(2)});`);
  }
  if (data.assets.coperative > 0) {
    sql.push(`  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_coop_id, '${m}', 'Cooperative (สหกรณ์)', 'asset', ${data.assets.coperative.toFixed(2)});`);
  }
  if (data.assets.gpf > 0) {
    sql.push(`  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gpf_id, '${m}', 'GPF (กบข.)', 'asset', ${data.assets.gpf.toFixed(2)});`);
  }
  if (data.assets.ssf > 0) {
    sql.push(`  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_ssf_id, '${m}', 'SSF', 'asset', ${data.assets.ssf.toFixed(2)});`);
  }
  if (data.assets.us_stock > 0) {
    sql.push(`  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_stock_id, '${m}', 'US Stocks', 'asset', ${data.assets.us_stock.toFixed(2)});`);
  }
  if (data.assets.btc > 0) {
    sql.push(`  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_btc_id, '${m}', 'Bitcoin', 'asset', ${data.assets.btc.toFixed(2)});`);
  }
  if (data.assets.gold > 0) {
    sql.push(`  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_gold_id, '${m}', 'Gold', 'asset', ${data.assets.gold.toFixed(2)});`);
  }
  if (data.car > 0) {
    sql.push(`  INSERT INTO public.wealth_item_snapshots (user_id, item_id, month, name, type, value) VALUES (v_user_id, v_car_id, '${m}', 'Car Loan (หนี้รถ)', 'liability', ${data.car.toFixed(2)});`);
  }

  sql.push(`  INSERT INTO public.net_worth_snapshots (user_id, month, net_worth, total_assets, total_liabilities, updated_at) VALUES (v_user_id, '${m}', ${data.net_worth.toFixed(2)}, ${data.total_assets.toFixed(2)}, ${data.total_liabilities.toFixed(2)}, now());`);
}

sql.push(`\nEND $$;`);

fs.writeFileSync(outputSqlPath, sql.join('\n'), 'utf8');
console.log(`Generated successfully: ${outputSqlPath}`);
