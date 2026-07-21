# AI工場ダッシュボード

複数のWebアプリについて、開発状態、GitHub Actions、テスト、ビルド、GitHub Pages公開状態を一画面で確認する読み取り専用ダッシュボードです。

## 初期登録
- Study Canvas
- `soutarounaka1016-max/study-canvas`
- `https://soutarounaka1016-max.github.io/study-canvas/`

## 開発と確認
```bash
npm ci
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

## アプリの追加
`src/apps.js` の `apps` 配列へ設定を1件追加してください。画面ロジックを書き換える必要はありません。

## セキュリティ
公開GitHub APIだけを匿名で取得します。GitHubトークン、APIキー、パスワードは使用・保存しません。
