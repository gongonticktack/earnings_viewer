-- 既存DBにこのファイルだけを適用します。希望は企業マスタとは分けて管理します。
create table if not exists public.earn_company_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(btrim(company_name)) between 1 and 120),
  stock_code text check (stock_code is null or stock_code ~ '^[0-9A-Z]{4}$'),
  status text not null default 'pending' check (status in ('pending', 'added', 'declined')),
  created_at timestamptz not null default now()
);
comment on table public.earn_company_requests is 'サイトから受け付けた企業の追加希望';
alter table public.earn_company_requests enable row level security;
revoke all on public.earn_company_requests from anon, authenticated;
grant insert (company_name, stock_code) on public.earn_company_requests to anon, authenticated;
drop policy if exists "企業追加希望を送信" on public.earn_company_requests;
create policy "企業追加希望を送信" on public.earn_company_requests
  for insert to anon, authenticated with check (status = 'pending');
-- 公開ユーザーには一覧取得・更新・削除を許可しません。
notify pgrst, 'reload schema';
