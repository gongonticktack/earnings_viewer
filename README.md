# Earnings Atelier

複数企業の決算情報を表示するダッシュボードです。左側の会社メニューから対象企業を切り替え、Supabaseに登録した業績推移、四半期内訳、公式IR PDF、直近1年の週足株価を確認できます。

このサイトでは、次の機能を扱います。

- Supabaseの公開テーブルから会社、四半期業績、公式IR PDFを読み込みます。
- DBを取得できない場合は、`app.js` 内の予備データを表示します。
- Cloudflare Worker経由で直近1年の週足株価を取得し、ローソク足で表示します。

## ローカル表示

Pythonが入っていれば次のコマンドで画面を確認できます。

```powershell
python -m http.server 5173
```

ブラウザで `http://localhost:5173` を開いてください。

この方法ではCloudflare Workerが起動しないため、週足株価APIは利用できません。DB表示と株価をまとめて確認する場合は、Wranglerが利用できる環境で `npx wrangler dev` を実行します。

## 設定

設定は `config.json` に集約しています。`config.js` は使いません。

```json
{
  "supabase": {
    "url": "https://PROJECT.supabase.co",
    "key": "SUPABASE_ANON_KEY"
  }
}
```

`config.json` はブラウザにも配信される公開設定です。RLSを設定した公開読取用のSupabase anon keyだけを使用し、service role keyやSecretは入れないでください。

## データの扱い

- 業績推移と四半期内訳は、`earn_quarterly_results` を使います。
- 公式IR PDFリンクは、`earn_ir_documents` と四半期業績の `source_url` を使います。
- DB取得に失敗した場合だけ、`app.js` 内の予備データへ切り替わります。

`schema.sql` では次のテーブルを作成します。

- `earn_companies`: 会社マスタ
- `earn_quarterly_results`: 四半期業績
- `earn_ir_documents`: 公式IR PDFリンク

## Cloudflare Workers deploy

`wrangler.jsonc` はリポジトリ直下の静的ファイルと `worker.js` の株価APIをまとめてデプロイします。`npx hugo` などのビルドコマンドは不要です。

```powershell
npx wrangler deploy
```

`schema.sql` やリポジトリ管理ファイルなど、公開不要なファイルは `.assetsignore` で除外しています。
