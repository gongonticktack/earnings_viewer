# Earnings Atelier

複数企業の公式IR資料をもとに、四半期単独の営業収益、営業コスト、営業利益、親会社所有者帰属利益を表示するダッシュボードです。左側の会社メニューから表示対象を切り替えられます。

通期資料がある企業については、前年度の営業利益から当年度の営業利益までの変化をウォーターフォールで表示します。営業費用の内訳と投資活動キャッシュフローも確認できます。

現在は次の企業に対応しています。

- トヨタ自動車
- NTT
- ソフトバンクグループ
- 三菱UFJフィナンシャル・グループ
- ファーストリテイリング
- 日立製作所
- 三井住友フィナンシャルグループ

トヨタ自動車、NTT、ソフトバンクグループは直近2年度分の四半期データを表示します。提出情報は EDINET API から取得してDBへ保存し、決算PDFのリンクは各企業の公式IRサイトから取得します。

## ローカル表示

静的ファイルだけでデモ表示できます。`index.html` をブラウザで直接開いてください。

株価チャートは `/api/stocks/:symbol`、EDINET提出書類同期は `/api/edinet/sync`、公式IR PDF一覧は `/api/ir/:companyCode` を使うため、ローカルで `index.html` を直接開いた場合は表示されません。Cloudflare Workers へ配信した環境で有効になります。

ローカルサーバーを使う場合は、Python がインストールされていれば次のコマンドでも表示できます。

```powershell
python -m http.server 5173
```

ブラウザで `http://localhost:5173` を開いてください。

## Supabase 接続

1. Supabase プロジェクトを作成します。
2. SQL Editor で直下の `schema.sql` を実行します。
3. `config.json` にブラウザ表示用の Supabase URL、anon key、公開APIルートを設定します。

既存環境でも、項目追加後は `schema.sql` を再実行してください。`alter table ... add column if not exists` で不足列だけを追加します。

テーブル名は他アプリとの同居を考慮して `earn_` 接頭辞で統一しています。以前の接頭辞なしテーブルは `schema.sql` 実行時に削除されません。

ブラウザから Supabase REST API を呼び出して表示用データを読み込みます。手動更新時のEDINET書類は、Worker側のservice role keyが未設定の場合にブラウザのSupabase接続で保存します。

## Cloudflare Worker 設定

EDINET API キーは `config.json` の `edinet.apiKey` に設定します。Worker Secret の `EDINET_API_KEY` が登録されている場合は、そちらを優先します。日次CronでEDINET書類をDBへ保存する場合は、Supabase の接続情報も登録します。

```powershell
npx wrangler secret put EDINET_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

EDINET API キーは [EDINET API利用登録](https://api.edinet-fsa.go.jp/api/auth/index.aspx?mode=1) から発行します。

`config.json` はブラウザへ配信される公開設定です。EDINET API キーも閲覧可能になります。Supabase service role key は格納せず、Worker Secret に登録してください。

## 更新タイミング

Cloudflare Cron Trigger が毎日 00:15 JST に当日分のEDINET書類一覧を取得します。対象企業の有価証券報告書、半期報告書、旧四半期報告書と各訂正報告書を `earn_edinet_documents` へ保存します。

画面の `更新` を押すと、公式IR PDF一覧と当日分のEDINET提出情報を再取得します。過去日を取り込む場合は、配信済みWorkerに対して日付を指定します。

```powershell
curl.exe -X POST "https://<worker-domain>/api/edinet/sync?date=2026-06-01"
```

書類一覧 API は日付単位で取得します。初回バックフィルでは、次のように終了日と日数を指定して最大31日ずつ取り込んでください。

```powershell
curl.exe -X POST "https://<worker-domain>/api/edinet/sync?date=2026-06-01&days=31"
```

画面下部の `Sync Log` には、DB読込とEDINET同期の結果が残ります。

## データの扱い

- 現在の数値はランダムなサンプルではなく、公式IR資料をもとにJSへ登録したデータです。ただし、公式サイトからのリアルタイム自動取得ではありません。
- 出典は [トヨタ自動車 決算資料](https://global.toyota/jp/ir/financial-results/)、[NTT 決算短信等](https://group.ntt/jp/ir/library/results/)、[ソフトバンクグループ 決算資料](https://group.softbank/ir/financials/financial_reports) です。
- DBへ保存する単位は百万円です。画面では兆・億円へ変換しています。
- 公式資料の累計値から前四半期累計を差し引き、四半期単独値を保存しています。
- 営業コストは `営業収益 - 営業利益` の算出値です。
- キャッシュフロー欄には、前期末現金から今期末現金までの増減をウォーターフォールで表示します。売上収益、原価・人件費などの費用、投資活動、財務活動を順に反映し、税金、非現金項目、運転資本の増減、為替影響などをその他調整として表示します。
- 株価欄には、Cloudflare Worker 経由で無料の株価JSONから読み込んだ、表示中の企業の週足ローソクチャートを表示します。
- EDINET API のAPIキーはブラウザへ渡しません。
- PDFリンクは各企業の公式IRサイトを直接指します。PDFを開くときに Worker や EDINET API は経由しません。
- PDF本文の解析と Workers AI は使用しません。
- 現在のチャート数値は既存の登録済みデータです。EDINET同期は提出書類メタデータを扱います。
- 四半期報告書制度は2024年4月1日以後に廃止されたため、Q1・Q3の決算短信をEDINETだけで補完することはできません。
