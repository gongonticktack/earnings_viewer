# Earnings Atelier

複数企業の決算情報を表示するダッシュボードです。左側の会社メニューから対象企業を切り替え、EDINETの上期・通期累計の売上・営業利益・税引前利益・純利益、キャッシュフロー、株価チャート、公式IR PDFを確認できます。

このサイトでは、次の3つの機能を分けて扱います。

- EDINET APIから書類一覧とXBRL数値を取得し、DBへ保存します。保存したXBRL数値から `earn_period_results` と `earn_annual_profit_flows` を更新し、チャート表示に使います。
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
- `edinet.historyDays`: 通常更新で遡る日数。短時間の過剰照会を避けるため画面側では最大60日です。
- `edinet.batchDays`: 1回の同期リクエストで処理する日数。EDINET APIの制約に合わせて最大31日までにしてください。
- `edinet.bootstrapDates`: DB未登録企業を初期化するための既知の半期・通期提出日です。通常更新では使いません。

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

画面の更新では `config.json` の `edinet.historyDays` を `edinet.batchDays` ごとに分割してEDINET同期APIへ問い合わせます。DBに期間データがない企業は、先に `edinet.bootstrapDates` の2日だけを照会します。同じ企業を同日中に再表示した場合は通常同期を省略し、更新ボタンを押した場合のみ再取得します。

## データの扱い

- EDINET同期では、書類メタデータを `earn_edinet_documents`、XBRL数値を `earn_edinet_facts` に保存します。
- チャート用の期間値は、半期報告書を `H1`（上期累計）、有価証券報告書を `FY`（通期累計）として `earn_period_results` に保存します。
- 半期報告書の書類メタデータが会計年度全体を示す場合も、XBRLコンテキストから実際の上期期間を判定します。
- 年次のキャッシュフローと前年差分は `earn_annual_profit_flows` に保存します。
- 公式IR PDFリンクは各社公式IRサイトを直接参照します。PDF本文の解析やWorkers AIは使いません。
- 株価はWorker経由で無料の株価JSONを読み込み、表示中の企業の週足ローソクチャートに反映します。
- 四半期報告書制度は2024年4月1日以後に廃止されたため、画面はEDINETで継続取得できる上期・通期単位に統一しています。
