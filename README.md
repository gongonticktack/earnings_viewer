# TOYOTA Earnings Atelier

トヨタ自動車の公式IR資料をもとに、四半期単独の営業収益、営業コスト、営業利益、親会社所有者帰属利益を表示するダッシュボードです。

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
supabase functions deploy sync-toyota-results
```

4. `config.js` の `supabaseUrl` と `supabaseAnonKey` を設定します。

## データの扱い

- 出典は [トヨタ自動車 決算資料](https://global.toyota/jp/ir/financial-results/) です。
- 表示単位は百万円です。カードでは十億円へ変換しています。
- 公式資料の累計値から前四半期累計を差し引き、四半期単独値を保存しています。
- 営業コストは `営業収益 - 営業利益` の算出値です。

現在の Edge Function は FY2026 の決算要旨PDF URLを公式IRページ上で照合して取り込みます。別年度へ広げる場合は、PDF本文を構造化する抽出処理または XBRL 連携を追加してください。
