# Earnings Atelier

複数企業の決算情報を表示するダッシュボードです。左側の会社メニューから対象企業を切り替え、四半期の売上・営業利益・税引前利益・純利益、キャッシュフロー、株価チャート、公式IR PDFを確認できます。

このサイトでは、次の3つの機能を分けて扱います。

- EDINET APIから書類一覧とXBRL数値を取得し、DBへ保存します。保存したXBRL数値から `earn_quarterly_results` と `earn_annual_profit_flows` を更新し、チャート表示に使います。
- EDINETとは別に各社の公式IRサイトを参照し、四半期決算PDFのリンクをサイトに表示します。
- 株価JSONを取得し、対象企業の週足ローソクチャートを表示します。

## ローカル表示

静的ファイルだけでも画面は開けますが、株価・EDINET同期・公式IR PDF一覧は `/api/*` のWorker APIを使うため、Cloudflare Workersへ配信した環境で有効になります。

ローカルで静的表示だけ確認する場合は、Pythonが入っていれば次のコマンドで開けます。

```powershell
python -m http.server 5173
```

ブラウザで `http://localhost:5173` を開いてください。

## 設定

設定は `config.json` に集約しています。`config.js` は使いません。

- `supabase.url`: Supabase Project URL
- `supabase.key`: Supabase anon key
- `api.stocks`: 株価APIルート
- `api.officialIr`: 公式IR PDF APIルート
- `api.edinetSync`: EDINET同期APIルート
- `edinet.apiKey`: EDINET APIキー
- `edinet.historyDays`: 画面からまとめて同期する対象日数
- `edinet.batchDays`: 1回の同期リクエストで処理する日数。EDINET APIの制約に合わせて最大31日までにしてください。

`config.json` はブラウザにも配信される公開設定です。この構成では Cloudflare Worker Secret は使いません。

## Supabase 接続

Supabase SQL Editorで `schema.sql` を実行してください。既存環境でも不足列を追加できるように `alter table ... add column if not exists` を含めています。

ブラウザとWorkerはいずれも `config.json` の Supabase anon key を使います。そのため、`schema.sql` では対象テーブルに対して anon の select / insert / update を許可しています。

DBへ保存する単位は百万円です。EDINETのXBRL数値は円単位で取得し、DB登録時に百万円へ変換します。

## Cloudflare Worker

`wrangler.jsonc` では Cron Trigger を設定していません。EDINET同期は自動実行ではなく、画面の更新操作または手動POSTで実行します。

```powershell
curl.exe -X POST "https://<worker-domain>/api/edinet/sync?date=2026-06-01"
```

複数日を同期する場合は `days` を指定します。

```powershell
curl.exe -X POST "https://<worker-domain>/api/edinet/sync?date=2026-06-01&days=31"
```

画面の更新では `config.json` の `edinet.historyDays` を `edinet.batchDays` ごとに分割してEDINET同期APIへ問い合わせます。

## データの扱い

- EDINET同期では、書類メタデータを `earn_edinet_documents`、XBRL数値を `earn_edinet_facts` に保存します。
- チャート用の四半期値は、EDINETの累計値から前四半期累計を差し引いて `earn_quarterly_results` に保存します。
- 年次のキャッシュフローと前年差分は `earn_annual_profit_flows` に保存します。
- 公式IR PDFリンクは各社公式IRサイトを直接参照します。PDF本文の解析やWorkers AIは使いません。
- 株価はWorker経由で無料の株価JSONを読み込み、表示中の企業の週足ローソクチャートに反映します。
- 四半期報告書制度は2024年4月1日以後に廃止されたため、Q1・Q3の決算短信をEDINETだけで補完することはできません。
