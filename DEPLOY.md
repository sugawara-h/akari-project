# ダッシュボード公開手順

## Netlifyで共有する

このプロジェクトのダッシュボードは `app/index.html` の単一HTMLです。
Netlifyでは `app` フォルダを公開対象にします。

### 方法1: ドラッグ&ドロップ

1. Netlifyにログイン
2. Add new site から Deploy manually を選ぶ
3. `app` フォルダをアップロード
4. 発行されたURLを共有

### 方法2: Git連携

1. このプロジェクトをGitHubなどに置く
2. NetlifyでGitリポジトリを接続
3. Publish directory に `app` を指定
4. Build command は空欄でOK
5. Deploy

## 更新するとき

- ローカルで `app/index.html` を更新
- ドラッグ&ドロップの場合は `app` フォルダを再アップロード
- Git連携の場合は変更をpush

## チーム運用

- 進捗や担当者はGoogle Sheetsの `共同ダッシュボード` タブで管理
- 閲覧用の見た目はNetlifyの公開URLで共有
- 商品や投稿データを変えたら、`app/index.html` を更新して再デプロイ
