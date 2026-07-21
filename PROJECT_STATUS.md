# PROJECT_STATUS.md

更新日: 2026-07-21

## 現在の状態
- 第1版UI: 実装済み・自動テスト済み
- Study Canvas初期登録: 実装済み・自動テスト済み
- GitHub公開API取得: 実装済み・自動テスト済み
- 詳細表示: 実装済み・自動テスト済み
- 取得失敗時の安全表示: 実装済み・自動テスト済み
- 設定データによるアプリ追加: 実装済み・自動テスト済み
- Pull Request #1: mainへ反映済み
- 通常テスト: ローカル6件成功・GitHub Actions成功
- 本番ビルド: ローカル成功・GitHub Actions成功
- Chromium: ローカル5件成功・GitHub Actions成功
- WebKit: GitHub Actions成功
- iPad横向き相当: ローカル5件成功・WebKit GitHub Actions成功
- iPad縦向き相当: ローカル5件成功・WebKit GitHub Actions成功
- スマートフォン相当: ローカル5件成功・GitHub Actions成功
- main最終CI: 9ジョブ成功（Actions run 29838087418）
- GitHub Pages初回設定: 完了
- GitHub Pages: 最新mainから再公開処理中
- 公開予定URL: https://soutarounaka1016-max.github.io/codex/
- 公開URL起動確認: Pages公開後にワークフローで自動実行
- iPad Safari実機: 実装済み・実機未確認

## セキュリティ
- GitHubトークン、APIキー、パスワード: 不使用
- npm audit: 脆弱性0件
- ダッシュボード内のGitHub操作: 読み取り専用
- localStorage: 公開情報の前回取得結果だけを保存
- Pages有効化のために秘密情報をコードへ追加する代替案: 不採用

## 公開処理
GitHub Pagesの発行元は `GitHub Actions` に設定済み。今回の通常コミットを起点に、CI成功後、最新mainだけをGitHub Pagesへ公開し、公開URLをChromiumで自動確認する。
