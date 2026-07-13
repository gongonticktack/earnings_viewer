# Earnings Atelier

複数企業の決算情報を表示する静的ダッシュボードです。左側の会社メニューから対象企業を切り替え、登録済みの業績推移、四半期内訳、公式IR PDFを確認できます。

このサイトでは、次の機能を扱います。

- 画面内に登録済みの決算数値を使い、四半期ごとの業績推移と損益内訳を表示します。
- 登録済みの決算データに含まれる公式IR PDFリンクを表示します。
- Workerを使わない静的構成のため、株価チャートの自動取得は行いません。

## ローカル表示

静的ファイルだけで画面を開けます。Pythonが入っていれば次のコマンドで確認できます。

```powershell
python -m http.server 5173
```

ブラウザで `http://localhost:5173` を開いてください。

## 設定

設定は `config.json` に集約しています。現在は静的構成のため、必須設定はありません。`config.js` は使いません。

`config.json` はブラウザにも配信される公開設定です。APIキーやSecretは入れないでください。

## データの扱い

- 業績推移と四半期内訳は、`app.js` 内に登録済みのデータを使います。
- 公式IR PDFリンクは、登録済みの決算データ内の `sourceUrl` を使います。
- `schema.sql` は任意のDB保存用です。現在の画面表示はDB接続を必要としません。

`schema.sql` では次のテーブルを作成します。

- `earn_companies`: 会社マスタ
- `earn_quarterly_results`: 四半期業績
- `earn_ir_documents`: 公式IR PDFリンク

## Cloudflare Workers deploy

This app is a static site. `wrangler.jsonc` deploys the repository root as static assets, so no build command such as `npx hugo` is required.

```powershell
npx wrangler deploy
```

Files that should not be published, such as `schema.sql` and repository metadata, are excluded by `.assetsignore`.
