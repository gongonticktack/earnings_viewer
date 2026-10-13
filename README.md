🌐 **Webアプリ：[Earnings Atelierを開く](https://earningsviewer.gongonticktack.workers.dev/)**

# Earnings Atelier（earnings_viewer）

## 概要

企業ごとの四半期業績、公式IR資料、株価推移をブラウザで確認するダッシュボードです。業績データはSupabaseから読み込み、週足株価はCloudflare Workers経由で取得します。

## 主な機能

- 左側の企業メニューから表示対象を切替。
- 売上・利益などの業績推移と四半期データの表示。
- 公式IRページ・PDFへのリンク。
- 直近1年の週足株価表示。

## 推奨要件

| 項目 | 環境 |
| --- | --- |
| 閲覧 | JavaScript対応の現行ブラウザ、インターネット接続 |
| 開発・公開 | Node.jsの現行LTS、Wrangler、Cloudflareアカウント |
| データベース | Supabaseプロジェクト |

静的画面だけならHTTPサーバーでも閲覧できます。株価APIも確認する場合はWorkers環境で起動してください。

## 必要なライブラリ

画面はHTML / CSS / JavaScriptで実装しており、npmのビルドは不要です。SupabaseはREST APIを直接利用します。Workersのローカル実行・公開にはWranglerを使用します。

## 使い方

### 初期設定

1. SupabaseのSQL Editorで`schema.sql`を確認して実行します。企業・四半期業績テーブルと初期データを登録します。
2. `config.json`の`supabase.url`と`supabase.key`に自分の接続先を設定します。
3. 公開用キーから必要なテーブルを読み取れることをRLSポリシーで確認します。

設定形式：

```json
{
  "supabase": {
    "url": "https://YOUR_PROJECT.supabase.co",
    "key": "YOUR_PUBLIC_ANON_KEY"
  }
}
```

ブラウザに配信される設定には公開用キーを使用し、管理用のservice_roleキーは設定しないでください。

### ローカル起動・公開

ルートで実行します。

```bash
npx wrangler dev
```

表示されたURLを開きます。公開するときは `npx wrangler deploy` を実行します。`wrangler.jsonc`のWorkers名などを自分の環境に合わせてください。

### 画面操作

企業を選び、業績推移・四半期内訳・株価を確認します。IRリンクから元資料を開けます。業績更新はSupabaseのデータ更新で行います。

## フォルダ構成

実装はルートに配置する構成です。

| 相対パス | 役割 |
| --- | --- |
| `index.html` | ダッシュボード画面 |
| `app.js` | 設定・業績取得と画面描画 |
| `styles.css` | 画面デザイン |
| `worker.js` | 株価APIと静的ファイル配信 |
| `config.json` | Supabase接続設定 |
| `schema.sql` | DB定義、RLS、初期データ |
| `wrangler.jsonc` | Cloudflare Workers設定 |
| `.assetsignore` | 公開アセットの除外設定 |

## 仕組み

画面がSupabaseの企業・業績テーブルを読み、選択企業の情報を表示します。株価は`GET /api/stock-prices?symbol=7203.T`などでWorkersへ問い合わせ、Yahoo Financeの週足データを受け取ります。Workerは株価レスポンスをキャッシュします。

## トラブル対処・確認

- 業績が空：`config.json`、テーブル登録、RLSのSELECT権限を確認してください。
- 株価APIが404：静的サーバーだけで起動していないか確認してください。
- 株価APIが502：外部株価サービスの応答とブラウザのNetworkを確認してください。
- ローカル起動後に企業切替、業績表示、IRリンク、株価取得を確認してください。

業績値・会計期間・単位は元のIR資料と照合してください。
