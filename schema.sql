create table if not exists public.earn_companies (
  code text primary key,
  name text not null,
  stock_code text not null,
  ir_url text not null,
  active boolean not null default true
);

insert into public.earn_companies (code, name, stock_code, ir_url)
values
  ('kioxia', 'キオクシアホールディングス', '285A', 'https://www.kioxia-holdings.com/ja-jp/ir/library/data.html'),
  ('toyota', 'トヨタ自動車', '7203', 'https://global.toyota/jp/ir/financial-results/'),
  ('ntt', 'NTT', '9432', 'https://group.ntt/jp/ir/library/results/'),
  ('softbank-group', 'ソフトバンクグループ', '9984', 'https://group.softbank/ir/financials/financial_reports'),
  ('mufg', '三菱UFJフィナンシャル・グループ', '8306', 'https://www.mufg.jp/ir/fs/index.html?link_id=ir_contents_fs'),
  ('fast-retailing', 'ファーストリテイリング', '9983', 'https://www.fastretailing.com/jp/ir/library/tanshin.html'),
  ('hitachi', '日立製作所', '6501', 'https://www.hitachi.com/ja-jp/ir/library/fr/'),
  ('smfg', '三井住友フィナンシャルグループ', '8316', 'https://www.smfg.co.jp/investor/financial/latest_statement.html'),
  ('tokyo-electron', '東京エレクトロン', '8035', 'https://www.tel.co.jp/ir/'),
  ('advantest', 'アドバンテスト', '6857', 'https://www.advantest.com/ja/investors/ir-library/result/'),
  ('mizuho', 'みずほフィナンシャルグループ', '8411', 'https://www.mizuho-fg.co.jp/investors/financial/tanshin/index.html'),
  ('sony', 'ソニーグループ', '6758', 'https://www.sony.com/ja/SonyInfo/IR/library/presen/er/'),
  ('murata', '村田製作所', '6981', 'https://corporate.murata.com/ja-jp/ir/library/results'),
  ('keyence', 'キーエンス', '6861', 'https://www.keyence.co.jp/investor/'),
  ('recruit', 'リクルートホールディングス', '6098', 'https://recruit-holdings.com/ja/ir/financials/'),
  ('mitsubishi-corp', '三菱商事', '8058', 'https://www.mitsubishicorp.com/jp/ja/ir/library/earnings/'),
  ('itochu', '伊藤忠商事', '8001', 'https://www.itochu.co.jp/ja/ir/financial_statements/'),
  ('tokio-marine', '東京海上ホールディングス', '8766', 'https://www.tokiomarinehd.com/ir/financial/'),
  ('shin-etsu', '信越化学工業', '4063', 'https://www.shinetsu.co.jp/jp/ir/ir-data/'),
  ('mitsui', '三井物産', '8031', 'https://www.mitsui.com/jp/ja/ir/library/meeting/index.html')
on conflict (code) do update set
  name = excluded.name,
  stock_code = excluded.stock_code,
  ir_url = excluded.ir_url,
  active = excluded.active;

alter table public.earn_companies enable row level security;

drop policy if exists "Earn companies are public" on public.earn_companies;
create policy "Earn companies are public"
  on public.earn_companies
  for select
  to anon, authenticated
  using (true);
