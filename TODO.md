# TODO.md

## 完了
- [x] 通常テスト（ローカル6件・GitHub Actions）
- [x] 本番ビルド（ローカル・GitHub Actions）
- [x] Chromium（ローカル・GitHub Actions）
- [x] WebKit（GitHub Actions）
- [x] iPad横向き相当（ローカル・WebKit GitHub Actions）
- [x] iPad縦向き相当（ローカル・WebKit GitHub Actions）
- [x] スマートフォン相当（ローカル・GitHub Actions）
- [x] API失敗時の安全表示
- [x] npm audit（脆弱性0件）

## main反映後
- [ ] GitHub Pages公開
- [ ] 公開URL起動確認

## 実機未確認
- [ ] iPad Safariで公開URLを開く
- [ ] 横向きでカード、詳細、外部リンクを確認する
- [ ] 縦向きで横スクロールがないことを確認する

## 改善案
- 各アプリが共通形式の公開用状態JSONを生成するActionsテンプレート
- アプリ数が増えた後の検索と絞り込み
- 匿名APIのレート制限残量表示

## 不採用（第1版）
GitHub書き込み、ワークフロー操作、PRマージ、ログイン、外部DB、有料サービス、通知、複雑なグラフ。
