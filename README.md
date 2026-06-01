# Earnings Atelier

複数企業の公式IR資料をもとに、四半期単独の営業収益、営業コスト、営業利益、親会社所有者帰属利益を表示するダッシュボードです。左側の会社メニューから表示対象を切り替えられます。

通期資料がある企業については、前年度の営業利益から当年度の営業利益までの変化をウォーターフォールで表示します。営業費用の内訳と投資活動キャッシュフローも確認できます。

現在は次の企業に対応しています。

- トヨタ自動車
- NTT

## ローカル表示

静的ファイルだけでデモ表示できます。`index.html` をブラウザで直接開いてください。

ローカルサーバーを使う場合は、Python がインストールされていれば次のコマンドでも表示できます。

```powershell
python -m http.server 5173
```

ブラウザで `http://localhost:5173` を開いてください。

## Supabase 接続

1. Supabase プロジェクトを作成します。
2. SQL Editor で `supabase/schema.sql` を実行します。
3. Edge Function をデプロイします。

```powershell
supabase functions deploy sync-earnings
```

4. `supabase-config.json` に接続情報を設定します。
5. 定期同期を有効にする場合は `supabase/schedule.sql` のプレースホルダーを置換し、SQL Editor で実行します。

## データの扱い

- 出典は [トヨタ自動車 決算資料](https://global.toyota/jp/ir/financial-results/) と [NTT 決算説明会資料](https://group.ntt/jp/ir/library/presentation/financial/) です。
- 表示単位は百万円です。カードでは十億円へ変換しています。
- 公式資料の累計値から前四半期累計を差し引き、四半期単独値を保存しています。
- 営業コストは `営業収益 - 営業利益` の算出値です。

現在の Edge Function はトヨタ FY2026、NTT FY2025 の公式IRページを定期確認し、登録済みの四半期データを取り込みます。新しい決算発表を完全自動で解析して追加する場合は、PDF本文を構造化する抽出処理または XBRL 連携を追加してください。
