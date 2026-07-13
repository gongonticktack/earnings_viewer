create table if not exists public.earn_companies (
  code text primary key,
  name text not null,
  stock_code text not null,
  ir_url text not null,
  active boolean not null default true,
  display_order integer not null default 999,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.earn_companies
  add column if not exists active boolean not null default true,
  add column if not exists display_order integer not null default 999,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

insert into public.earn_companies (code, name, stock_code, ir_url, display_order)
values
  ('toyota', 'トヨタ自動車', '7203', 'https://global.toyota/jp/ir/financial-results/', 1),
  ('kioxia', 'キオクシアホールディングス', '285A', 'https://www.kioxia-holdings.com/ja-jp/ir/library/data.html', 2),
  ('mufg', '三菱UFJフィナンシャル・グループ', '8306', 'https://www.mufg.jp/ir/fs/index.html?link_id=ir_contents_fs', 3),
  ('softbank-group', 'ソフトバンクグループ', '9984', 'https://group.softbank/ir/financials/financial_reports', 4),
  ('tokyo-electron', '東京エレクトロン', '8035', 'https://www.tel.co.jp/ir/', 5),
  ('fast-retailing', 'ファーストリテイリング', '9983', 'https://www.fastretailing.com/jp/ir/library/tanshin.html', 6),
  ('smfg', '三井住友フィナンシャルグループ', '8316', 'https://www.smfg.co.jp/investor/financial/latest_statement.html', 7),
  ('advantest', 'アドバンテスト', '6857', 'https://www.advantest.com/ja/investors/ir-library/result/', 8),
  ('hitachi', '日立製作所', '6501', 'https://www.hitachi.com/ja-jp/ir/library/fr/', 9),
  ('mizuho', 'みずほフィナンシャルグループ', '8411', 'https://www.mizuho-fg.co.jp/investors/financial/tanshin/index.html', 10),
  ('sony', 'ソニーグループ', '6758', 'https://www.sony.com/ja/SonyInfo/IR/library/presen/er/', 11),
  ('murata', '村田製作所', '6981', 'https://corporate.murata.com/ja-jp/ir/library/results', 12),
  ('keyence', 'キーエンス', '6861', 'https://www.keyence.co.jp/investor/', 13),
  ('recruit', 'リクルートホールディングス', '6098', 'https://recruit-holdings.com/ja/ir/financials/', 14),
  ('mitsubishi-corp', '三菱商事', '8058', 'https://www.mitsubishicorp.com/jp/ja/ir/library/earnings/', 15),
  ('itochu', '伊藤忠商事', '8001', 'https://www.itochu.co.jp/ja/ir/financial_statements/', 16),
  ('tokio-marine', '東京海上ホールディングス', '8766', 'https://www.tokiomarinehd.com/ir/financial/', 17),
  ('shin-etsu', '信越化学工業', '4063', 'https://www.shinetsu.co.jp/jp/ir/ir-data/', 18),
  ('ntt', 'NTT', '9432', 'https://group.ntt/jp/ir/library/results/', 19),
  ('mitsui', '三井物産', '8031', 'https://www.mitsui.com/jp/ja/ir/library/meeting/index.html', 20)
on conflict (code) do update set
  name = excluded.name,
  stock_code = excluded.stock_code,
  ir_url = excluded.ir_url,
  display_order = excluded.display_order,
  active = excluded.active,
  updated_at = now();

alter table public.earn_companies enable row level security;

drop policy if exists "Earn companies are public" on public.earn_companies;
create policy "Earn companies are public"
  on public.earn_companies
  for select
  to anon, authenticated
  using (true);

create table if not exists public.earn_quarterly_results (
  id text primary key,
  company_code text not null references public.earn_companies(code) on delete cascade,
  fiscal_year integer not null,
  quarter integer not null check (quarter between 1 and 4),
  period_end date not null,
  revenue bigint not null,
  operating_cost bigint,
  operating_income bigint,
  pretax_income bigint,
  net_income bigint not null,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_code, fiscal_year, quarter)
);

alter table public.earn_quarterly_results
  add column if not exists operating_cost bigint,
  add column if not exists operating_income bigint,
  add column if not exists pretax_income bigint,
  add column if not exists source_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.earn_quarterly_results enable row level security;

drop policy if exists "Earn quarterly results are public" on public.earn_quarterly_results;
create policy "Earn quarterly results are public"
  on public.earn_quarterly_results
  for select
  to anon, authenticated
  using (true);

create index if not exists earn_quarterly_results_company_period_idx
  on public.earn_quarterly_results (company_code, period_end desc);

create table if not exists public.earn_ir_documents (
  id text primary key,
  company_code text not null references public.earn_companies(code) on delete cascade,
  fiscal_year integer,
  quarter integer check (quarter between 1 and 4),
  title text not null,
  url text not null,
  source_name text not null default 'official_ir',
  published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_code, url)
);

alter table public.earn_ir_documents
  add column if not exists fiscal_year integer,
  add column if not exists quarter integer check (quarter between 1 and 4),
  add column if not exists source_name text not null default 'official_ir',
  add column if not exists published_at date,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.earn_ir_documents enable row level security;

drop policy if exists "Earn IR documents are public" on public.earn_ir_documents;
create policy "Earn IR documents are public"
  on public.earn_ir_documents
  for select
  to anon, authenticated
  using (true);

create index if not exists earn_ir_documents_company_period_idx
  on public.earn_ir_documents (company_code, fiscal_year desc, quarter desc);

-- 2025年度（2025年4月〜2026年3月）の四半期業績です。
-- 決算短信は「第2四半期までの累計」のように合計で出ることが多いので、
-- ここでは画面で比べやすいように、各四半期だけの数字へ差し引いて登録します。
-- 単位は各社の決算短信と同じ「百万円」です。
-- 銀行系は売上高ではなく「経常収益」を revenue に、
-- 「経常利益」を pretax_income に入れます。
insert into public.earn_quarterly_results (
  id,
  company_code,
  fiscal_year,
  quarter,
  period_end,
  revenue,
  operating_cost,
  operating_income,
  pretax_income,
  net_income,
  source_url
)
values
  ('toyota-2025-q1', 'toyota', 2025, 1, '2025-06-30', 12253326, 11087185, 1166141, null, 841345, 'https://global.toyota/pages/global_toyota/ir/financial-results/2026_1q_summary_jp.pdf'),
  ('toyota-2025-q2', 'toyota', 2025, 2, '2025-09-30', 12377427, 11537876, 839551, null, 932081, 'https://global.toyota/pages/global_toyota/ir/financial-results/2026_2q_summary_jp.pdf'),
  ('toyota-2025-q3', 'toyota', 2025, 3, '2025-12-31', 13456851, 12265821, 1191030, null, 1257465, 'https://global.toyota/pages/global_toyota/ir/financial-results/2026_3q_summary_jp.pdf'),
  ('toyota-2025-q4', 'toyota', 2025, 4, '2026-03-31', 12597348, 12027854, 569494, null, 817207, 'https://global.toyota/pages/global_toyota/ir/financial-results/2026_4q_summary_jp.pdf'),

  ('mufg-2025-q1', 'mufg', 2025, 1, '2025-06-30', 3253932, null, null, 708535, 546068, 'https://www.mufg.jp/dam/ir/fs/2025/pdf/summary2506_ja.pdf'),
  ('mufg-2025-q2', 'mufg', 2025, 2, '2025-09-30', 3639843, null, null, 1038140, 746887, 'https://www.mufg.jp/dam/ir/fs/2025/pdf/summary2509_ja.pdf'),
  ('mufg-2025-q3', 'mufg', 2025, 3, '2025-12-31', 3750030, null, null, 762575, 520553, 'https://www.mufg.jp/dam/ir/fs/2025/pdf/summary2512_ja.pdf'),
  ('mufg-2025-q4', 'mufg', 2025, 4, '2026-03-31', 3977038, null, null, 900942, 613721, 'https://www.mufg.jp/dam/ir/fs/2025/pdf/summary2603_ja.pdf'),

  ('softbank-group-2025-q1', 'softbank-group', 2025, 1, '2025-06-30', 1820341, null, null, 689941, 421819, 'https://group.softbank/media/Project/sbg/sbg/pdf/ir/financials/financial_reports/financial-report_q1fy2025_01_ja.pdf'),
  ('softbank-group-2025-q2', 'softbank-group', 2025, 2, '2025-09-30', 1916502, null, null, 2996441, 2502247, 'https://group.softbank/media/Project/sbg/sbg/pdf/ir/financials/financial_reports/financial-report_q2fy2025_01_ja.pdf'),
  ('softbank-group-2025-q3', 'softbank-group', 2025, 3, '2025-12-31', 1982404, null, null, 482778, 248587, 'https://group.softbank/media/Project/sbg/sbg/pdf/ir/financials/financial_reports/financial-report_q3fy2025_01_ja.pdf'),
  ('softbank-group-2025-q4', 'softbank-group', 2025, 4, '2026-03-31', 2079403, null, null, 1965745, 1829618, 'https://group.softbank/media/Project/sbg/sbg/pdf/ir/financials/financial_reports/financial-report_q4fy2025_01_ja.pdf'),

  ('smfg-2025-q1', 'smfg', 2025, 1, '2025-06-30', 2444404, null, null, 483337, 376898, 'https://www.smfg.co.jp/investor/financial/latest_statement/2026_3/2026_1q_01.pdf'),
  ('smfg-2025-q2', 'smfg', 2025, 2, '2025-09-30', 2761483, null, null, 794786, 556607, 'https://www.smfg.co.jp/investor/financial/latest_statement/2026_3/2026_2q_01.pdf'),
  ('smfg-2025-q3', 'smfg', 2025, 3, '2025-12-31', 2728479, null, null, 620932, 461263, 'https://www.smfg.co.jp/investor/financial/latest_statement/2026_3/2026_3q_01.pdf'),
  ('smfg-2025-q4', 'smfg', 2025, 4, '2026-03-31', 2856487, null, null, 404295, 188205, 'https://www.smfg.co.jp/investor/financial/latest_statement/2026_3/2026_fy_01.pdf'),

  ('kioxia-2025-q1', 'kioxia', 2025, 1, '2025-06-30', 342799, 297900, 44899, 27294, 18284, 'https://ssl4.eir-parts.net/doc/285A/tdnet/2717185/00.pdf'),
  ('kioxia-2025-q2', 'kioxia', 2025, 2, '2025-09-30', 448346, 362425, 85921, 56716, 40662, 'https://ssl4.eir-parts.net/doc/285A/tdnet/2773896/00.pdf'),
  ('kioxia-2025-q3', 'kioxia', 2025, 3, '2025-12-31', 543631, 400877, 142754, 121740, 87810, 'https://ssl4.eir-parts.net/doc/285A/tdnet/2832582/00.pdf'),
  ('kioxia-2025-q4', 'kioxia', 2025, 4, '2026-03-31', 1002852, 406057, 596795, 578345, 407734, 'https://ssl4.eir-parts.net/doc/285A/tdnet/2886166/00.pdf'),

  ('tokyo-electron-2025-q1', 'tokyo-electron', 2025, 1, '2025-06-30', 549586, 404892, 144694, 147347, 117801, 'https://www.tel.co.jp/ir/library/report/g81vm600000000gp-att/fy26q1tanshin-j.pdf'),
  ('tokyo-electron-2025-q2', 'tokyo-electron', 2025, 2, '2025-09-30', 630082, 471623, 158459, 159549, 123825, 'https://www.tel.co.jp/ir/library/report/g81vm600000000gp-att/fy26q2tanshin-j.pdf'),
  ('tokyo-electron-2025-q3', 'tokyo-electron', 2025, 3, '2025-12-31', 552047, 435907, 116140, 116900, 118538, 'https://www.tel.co.jp/ir/library/report/g81vm600000000gp-att/fy26q3tanshin-j.pdf'),
  ('tokyo-electron-2025-q4', 'tokyo-electron', 2025, 4, '2026-03-31', 711818, 506175, 205643, 206542, 214290, 'https://www.tel.co.jp/ir/library/report/g81vm600000000gp-att/fy26q4tanshin-j.pdf'),

  ('advantest-2025-q1', 'advantest', 2025, 1, '2025-06-30', 263776, 139824, 123952, 121357, 90180, 'https://www.advantest.com/document/ja/investors/ir-library/result/J_FR_FY2025_1Q.pdf'),
  ('advantest-2025-q2', 'advantest', 2025, 2, '2025-09-30', 262957, 154474, 108483, 109160, 79633, 'https://www.advantest.com/document/ja/investors/ir-library/result/J_FR_FY2025_2Q.pdf'),
  ('advantest-2025-q3', 'advantest', 2025, 3, '2025-12-31', 273804, 160233, 113571, 113832, 78713, 'https://www.advantest.com/document/ja/investors/ir-library/result/J_FR_FY2025_3Q.pdf'),
  ('advantest-2025-q4', 'advantest', 2025, 4, '2026-03-31', 328073, 174959, 153114, 172371, 126827, 'https://www.advantest.com/document/ja/investors/ir-library/result/J_FR_FY2025_FY.pdf'),

  ('hitachi-2025-q1', 'hitachi', 2025, 1, '2025-06-30', 2258325, 2047309, 211016, 272043, 192204, 'https://www.hitachi.co.jp/New/cnews/month/2025/07/0731/2025_1Q.pdf'),
  ('hitachi-2025-q2', 'hitachi', 2025, 2, '2025-09-30', 2529081, 2232054, 297027, 408126, 280658, 'https://www.hitachi.co.jp/New/cnews/month/2025/10/1030/2025_2Q.pdf'),
  ('hitachi-2025-q3', 'hitachi', 2025, 3, '2025-12-31', 2714391, 2396719, 317672, 346028, 165698, 'https://www.hitachi.co.jp/New/cnews/month/2026/01/3000/2025_3Q.pdf'),
  ('hitachi-2025-q4', 'hitachi', 2025, 4, '2026-03-31', 3084984, 2711424, 373560, 246912, 163808, 'https://www.hitachi.co.jp/New/cnews/month/2026/04/2800/2025_4Q.pdf'),

  ('fast-retailing-2025-q1', 'fast-retailing', 2025, 1, '2025-05-31', 826510, 679775, 146735, 156782, 105533, 'https://www.fastretailing.com/jp/ir/library/pdf/tanshin202508_3q.pdf'),
  ('fast-retailing-2025-q2', 'fast-retailing', 2025, 2, '2025-08-31', 783831, 670518, 113313, 130068, 93910, 'https://www.fastretailing.com/jp/ir/library/pdf/tanshin202508_4q.pdf'),
  ('fast-retailing-2025-q3', 'fast-retailing', 2025, 3, '2025-11-30', 1027745, 816831, 210914, 226667, 147445, 'https://www.fastretailing.com/jp/ir/library/pdf/tanshin202608_1q.pdf'),
  ('fast-retailing-2025-q4', 'fast-retailing', 2025, 4, '2026-02-28', 1027482, 837730, 189752, 202138, 131845, 'https://www.fastretailing.com/jp/ir/library/pdf/tanshin202608_2q.pdf'),

  ('mizuho-2025-q1', 'mizuho', 2025, 1, '2025-06-30', 2130048, null, null, 368583, 290521, 'https://www.mizuho-fg.co.jp/investors/financial/tanshin/pdf/data2603_1q.pdf'),
  ('mizuho-2025-q2', 'mizuho', 2025, 2, '2025-09-30', 2207489, null, null, 481043, 399426, 'https://www.mizuho-fg.co.jp/investors/financial/tanshin/pdf/data2603_2q.pdf'),
  ('mizuho-2025-q3', 'mizuho', 2025, 3, '2025-12-31', 2275888, null, null, 405039, 329943, 'https://www.mizuho-fg.co.jp/investors/financial/tanshin/pdf/data2603_3q.pdf'),
  ('mizuho-2025-q4', 'mizuho', 2025, 4, '2026-03-31', 2472013, null, null, 318494, 228742, 'https://www.mizuho-fg.co.jp/investors/financial/tanshin/pdf/data2603_fy.pdf'),

  ('sony-2025-q1', 'sony', 2025, 1, '2025-06-30', 2621615, 2281660, 339955, 356601, 259027, 'https://www.sony.com/ja/SonyInfo/IR/library/presen/er/pdf/25q1_sony.pdf'),
  ('sony-2025-q2', 'sony', 2025, 2, '2025-09-30', 3107907, 2678933, 428974, 441761, 311425, 'https://www.sony.com/ja/SonyInfo/IR/library/presen/er/pdf/25q2_sony.pdf'),
  ('sony-2025-q3', 'sony', 2025, 3, '2025-12-31', 3713681, 3198640, 515041, 500209, 377324, 'https://www.sony.com/ja/SonyInfo/IR/library/presen/er/pdf/25q3_sony.pdf'),
  ('sony-2025-q4', 'sony', 2025, 4, '2026-03-31', 3036417, 2872880, 163537, 123803, 83117, 'https://www.sony.com/ja/SonyInfo/IR/library/presen/er/pdf/25q4_sony.pdf'),

  ('murata-2025-q1', 'murata', 2025, 1, '2025-06-30', 416154, 354533, 61621, 62322, 49714, 'https://corporate.murata.com/-/media/corporate/about/newsroom/news/irnews/irnews/2025/0730/25q1-j-fls.ashx?cvid=20250730023650000000&la=ja-jp'),
  ('murata-2025-q2', 'murata', 2025, 2, '2025-09-30', 486624, 383109, 103515, 112460, 82665, 'https://corporate.murata.com/-/media/corporate/about/newsroom/news/irnews/irnews/2025/1031/25q2-j-fls.ashx?cvid=20251031003510000000&la=ja-jp'),
  ('murata-2025-q3', 'murata', 2025, 3, '2025-12-31', 467454, 429578, 37876, 49509, 24969, 'https://corporate.murata.com/-/media/corporate/about/newsroom/news/irnews/irnews/2026/0202/25q3-j-fls.ashx?cvid=20260202015121000000&la=ja-jp'),
  ('murata-2025-q4', 'murata', 2025, 4, '2026-03-31', 460624, 381801, 78823, 84352, 76572, 'https://corporate.murata.com/-/media/corporate/about/newsroom/news/irnews/irnews/2026/0430/25q4-j-fls.ashx?cvid=20260430013812000000&la=ja-jp'),

  ('keyence-2025-q1', 'keyence', 2025, 1, '2025-06-20', 261076, 131775, 129301, 131532, 92116, 'https://www.keyence.co.jp/pdf/EarningsRelease_202507_ja.pdf'),
  ('keyence-2025-q2', 'keyence', 2025, 2, '2025-09-20', 284224, 141346, 142878, 153468, 107843, 'https://www.keyence.co.jp/pdf/EarningsRelease_202510_ja.pdf'),
  ('keyence-2025-q3', 'keyence', 2025, 3, '2025-12-20', 289305, 145103, 144202, 158614, 111208, 'https://www.keyence.co.jp/pdf/EarningsRelease_202601_ja.pdf'),
  ('keyence-2025-q4', 'keyence', 2025, 4, '2026-03-20', 334684, 155306, 179378, 192142, 134018, 'https://www.keyence.co.jp/pdf/EarningsRelease_202604_ja.pdf'),

  ('recruit-2025-q1', 'recruit', 2025, 1, '2025-06-30', 878839, 725105, 153734, 158946, 120936, 'https://recruit-holdings.com/files/ir/library/upload/Recruit_202603Q1_earnings_jp.pdf'),
  ('recruit-2025-q2', 'recruit', 2025, 2, '2025-09-30', 914745, 754954, 159791, 163982, 127444, 'https://recruit-holdings.com/files/ir/library/upload/Recruit_202603Q2_earnings_jp.pdf'),
  ('recruit-2025-q3', 'recruit', 2025, 3, '2025-12-31', 943196, 761041, 182155, 187949, 146538, 'https://file.recruit-holdings.com/files/ja/Recruit_202603Q3_earnings_jp.pdf'),
  ('recruit-2025-q4', 'recruit', 2025, 4, '2026-03-31', 960571, 825684, 134887, 133741, 101994, 'https://file.recruit-holdings.com/files/ja/Recruit_202603Q4_earnings_jp.pdf'),

  ('ntt-2025-q1', 'ntt', 2025, 1, '2025-06-30', 3262039, 2856846, 405193, null, 259714, 'https://group.ntt/jp/newsrelease/2025/08/06/pdf/250806ab.pdf'),
  ('ntt-2025-q2', 'ntt', 2025, 2, '2025-09-30', 3510674, 2970838, 539836, null, 335937, 'https://group.ntt/jp/newsrelease/2025/11/04/pdf/251104ab.pdf'),
  ('ntt-2025-q3', 'ntt', 2025, 3, '2025-12-31', 3648325, 3136209, 512116, null, 330409, 'https://group.ntt/jp/newsrelease/2026/02/05/pdf/260205ab.pdf'),
  ('ntt-2025-q4', 'ntt', 2025, 4, '2026-03-31', 3988083, 3739007, 249076, null, 110972, 'https://group.ntt/jp/newsrelease/2026/05/08/pdf/260508ab.pdf'),

  ('mitsubishi-corp-2025-q1', 'mitsubishi-corp', 2025, 1, '2025-06-30', 4218706, null, null, 252923, 203121, 'https://www.mitsubishicorp.com/jp/ja/ir/library/earnings/pdf/202508j.pdf?250807='),
  ('mitsubishi-corp-2025-q2', 'mitsubishi-corp', 2025, 2, '2025-09-30', 4419137, null, null, 205549, 152675, 'https://www.mitsubishicorp.com/jp/ja/ir/library/earnings/pdf/202511j.pdf'),
  ('mitsubishi-corp-2025-q3', 'mitsubishi-corp', 2025, 3, '2025-12-31', 5043206, null, null, 361490, 252127, 'https://www.mitsubishicorp.com/jp/ja/ir/library/earnings/pdf/202602j.pdf?260210='),
  ('mitsubishi-corp-2025-q4', 'mitsubishi-corp', 2025, 4, '2026-03-31', 5234946, null, null, 276132, 192537, 'https://www.mitsubishicorp.com/jp/ja/ir/library/earnings/pdf/202605j.pdf'),

  ('itochu-2025-q1', 'itochu', 2025, 1, '2025-06-30', 3558933, 3388198, 170735, 374814, 283939, 'https://www.itochu.co.jp/ja/ir/financial_statements/2026/__icsFiles/afieldfile/2025/08/06/26_1st_01.pdf'),
  ('itochu-2025-q2', 'itochu', 2025, 2, '2025-09-30', 3690226, 3506821, 183405, 287145, 216341, 'https://www.itochu.co.jp/ja/ir/financial_statements/2026/__icsFiles/afieldfile/2025/11/05/26_2nd_01.pdf'),
  ('itochu-2025-q3', 'itochu', 2025, 3, '2025-12-31', 3737092, 3564794, 172298, 284140, 205017, 'https://www.itochu.co.jp/ja/ir/financial_statements/2026/__icsFiles/afieldfile/2026/02/13/26_3rd_01.pdf'),
  ('itochu-2025-q4', 'itochu', 2025, 4, '2026-03-31', 3836836, 3661386, 175450, 253367, 194986, 'https://www.itochu.co.jp/ja/ir/financial_statements/2026/__icsFiles/afieldfile/2026/05/01/26_ended_01.pdf'),

  ('tokio-marine-2025-q1', 'tokio-marine', 2025, 1, '2025-06-30', 2268529, null, null, 565287, 466820, 'https://www.tokiomarinehd.com/ir/event/presentation/2025/a16lmp000000r0cn-att/1Q_FY2025_Summary_Report_j.pdf'),
  ('tokio-marine-2025-q2', 'tokio-marine', 2025, 2, '2025-09-30', 2099284, null, null, 314994, 220015, 'https://www.tokiomarinehd.com/ir/event/presentation/2025/r4t8k30000000353-att/2Q_FY2025_Summary_Report_j.pdf'),
  ('tokio-marine-2025-q3', 'tokio-marine', 2025, 3, '2025-12-31', 2306421, null, null, 322164, 212437, 'https://www.tokiomarinehd.com/ir/event/presentation/2025/gi58a80000000ybf-att/3Q_FY2025_Summary_Report_j.pdf'),
  ('tokio-marine-2025-q4', 'tokio-marine', 2025, 4, '2026-03-31', 2198043, null, null, 146185, 81156, 'https://www.tokiomarinehd.com/ir/event/presentation/2025/gi58a80000002zwa-att/4Q_FY2025_Summary_Report_j.pdf'),

  ('shin-etsu-2025-q1', 'shin-etsu', 2025, 1, '2025-06-30', 628549, 461746, 166803, 181621, 126428, 'https://www.shinetsu.co.jp/wp-content/uploads/2025/07/20250724_con_J.pdf'),
  ('shin-etsu-2025-q2', 'shin-etsu', 2025, 2, '2025-09-30', 655973, 488841, 167132, 185718, 131416, 'https://www.shinetsu.co.jp/wp-content/uploads/2025/07/20251024_con_J.pdf'),
  ('shin-etsu-2025-q3', 'shin-etsu', 2025, 3, '2025-12-31', 649478, 485387, 164091, 190075, 126476, 'https://www.shinetsu.co.jp/wp-content/uploads/2025/07/20260127_con_J.pdf'),
  ('shin-etsu-2025-q4', 'shin-etsu', 2025, 4, '2026-03-31', 639969, 502791, 137178, 150867, 90139, 'https://www.shinetsu.co.jp/wp-content/uploads/2025/07/20260428_con_J.pdf'),

  ('mitsui-2025-q1', 'mitsui', 2025, 1, '2025-06-30', 3299943, null, null, 234203, 191647, 'https://www.mitsui.com/jp/ja/ir/library/meeting/pdf/ja_263_1q_ta.pdf'),
  ('mitsui-2025-q2', 'mitsui', 2025, 2, '2025-09-30', 3459172, null, null, 312433, 232086, 'https://www.mitsui.com/jp/ja/ir/library/meeting/pdf/ja_263_2q_ta.pdf'),
  ('mitsui-2025-q3', 'mitsui', 2025, 3, '2025-12-31', 3597152, null, null, 249987, 188217, 'https://www.mitsui.com/jp/ja/ir/library/meeting/pdf/ja_263_3q_ta.pdf'),
  ('mitsui-2025-q4', 'mitsui', 2025, 4, '2026-03-31', 3638955, null, null, 290433, 222021, 'https://www.mitsui.com/jp/ja/ir/library/meeting/pdf/ja_263_4q_ta.pdf')
on conflict (company_code, fiscal_year, quarter) do update set
  period_end = excluded.period_end,
  revenue = excluded.revenue,
  operating_cost = excluded.operating_cost,
  operating_income = excluded.operating_income,
  pretax_income = excluded.pretax_income,
  net_income = excluded.net_income,
  source_url = excluded.source_url,
  updated_at = now();
