# PROJECT_STATUS.md

更新日: 2026-07-22

## 現在の状態
- 第1版UI: 実装済み・自動テスト済み・公開確認済み
- GitHub Pages公開アプリの自動検出: 実装済み・自動テスト済み・公開確認済み
- 事業アイデア管理アプリ: 自動検出・一覧表示・詳細表示・公開リンク確認済み
- Study Canvas: 自動検出・一覧表示・詳細表示・公開リンク確認済み
- その他のPages公開アプリ: `Codex1` と `Market` を自動検出済み
- 公開画面での検出数: 4アプリ
- GitHub公開API取得: 実装済み・自動テスト済み・公開確認済み
- API失敗時の主要アプリ表示継続: 実装済み・自動テスト済み
- Pull Request #3: mainへ反映済み
- 通常テスト: GitHub Actions成功
- 本番ビルド: GitHub Actions成功
- Chromium: GitHub Actions成功
- WebKit: GitHub Actions成功
- iPad横向き相当: WebKit GitHub Actions成功
- iPad縦向き相当: WebKit GitHub Actions成功
- スマートフォン相当: GitHub Actions成功
- main最終CI: 成功（Actions run 29874963190）
- GitHub Pages公開: 成功（Actions run 29875053143）
- 公開URL: https://soutarounaka1016-max.github.io/codex/
- 公開URL起動確認: Chromiumによる自動確認成功
- 公開後の実画面証拠: `事業アイデア管理アプリ` を含む4件のカード表示を確認
- 公開後の重大なJavaScriptエラー: なし
- iPad Safari実機: 実装済み・実機未確認

## 新しいアプリの追加条件
同じGitHubアカウントに公開リポジトリを作り、GitHub Pagesを有効にすると、ダッシュボードの次回更新時に自動追加される。ダッシュボード自身、Pages無効、非公開、アーカイブ済み、フォークされたリポジトリは除外する。

## セキュリティ
- GitHubトークン、APIキー、パスワード: 不使用
- ダッシュボード内のGitHub操作: 読み取り専用
- localStorage: 公開アプリ一覧と公開情報の前回取得結果だけを保存
- 匿名GitHub APIの取得失敗時は、主要アプリの固定情報と前回取得データで表示を継続

## 完成判定
事業アイデア管理アプリの反映と、新しいGitHub Pages公開アプリの自動追加を実装した。単体テスト、ビルド、Chromium、WebKit、iPad縦横相当、スマートフォン相当、main反映、GitHub Pages公開、公開実画面確認まで完了し、既知の重大な不具合はない。iPad Safari実機での確認だけを、実装済み・実機未確認として残す。
