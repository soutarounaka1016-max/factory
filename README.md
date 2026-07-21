# AI工場ダッシュボード

複数のWebアプリについて、開発状態、GitHub Actions、テスト、ビルド、GitHub Pages公開状態を一画面で確認する読み取り専用ダッシュボードです。

## 現在の主要アプリ
- Study Canvas
- 事業アイデア管理アプリ

主要アプリは通信失敗時の表示継続用として `src/apps.js` に固定登録しています。通常時は、GitHub Pagesが有効な公開リポジトリをGitHub APIから自動検出します。

## 開発と確認
```bash
npm install --ignore-scripts
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

## 新しいアプリの追加
新しいアプリ用の公開GitHubリポジトリでGitHub Pagesを有効にすると、ダッシュボードの次回更新時に自動で追加されます。通常はダッシュボード側のコード変更や配列への追記は不要です。

リポジトリ名から表示名と標準Pages URLを作ります。日本語名や説明を固定したい主要アプリだけ、`src/apps.js` の `appOverrides` に上書き情報を追加します。

次のリポジトリは自動検出から除外します。
- ダッシュボード自身
- GitHub Pagesが無効なリポジトリ
- 非公開、アーカイブ済み、フォークされたリポジトリ

## セキュリティ
公開GitHub APIだけを匿名で取得します。GitHubトークン、APIキー、パスワードは使用・保存しません。自動検出した公開アプリ一覧と公開状態の前回取得結果だけをlocalStorageへ保存します。
