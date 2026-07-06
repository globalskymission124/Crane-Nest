# Crane Nest — スマホアプリ化ガイド

## 1. PWA（今すぐ・無料・審査なし）

すでに対応済みです。デプロイ先（例: https://crane-nest-cmn2.vercel.app/stays ）をスマホで開き:

- **iPhone (Safari)**: 共有ボタン → 「ホーム画面に追加」
- **Android (Chrome)**: メニュー → 「アプリをインストール」（または自動でインストールバナーが表示）

ホーム画面のアイコンから全画面のアプリとして起動します。長押しで「宿を探す/旅程/送迎予約/オーナー管理」のショートカットも使えます。

## 2. ストア公開版（Google Play / App Store）

Capacitorで本番サイトをネイティブアプリに包みます。設定ファイル `capacitor.config.json` は同梱済み
（`server.url` を自分のVercel URLに変更してください）。

### 事前に必要なもの
- Google Play: 開発者登録 $25（買い切り）
- App Store: Apple Developer Program $99/年 + Mac + Xcode

### 手順（プロジェクト直下で）
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# Android
npx cap add android
npx cap open android   # Android Studioが開く → Build > Generate Signed App Bundle → Play Consoleへ提出

# iOS（Macのみ）
npx cap add ios
npx cap open ios       # Xcodeが開く → Signing設定 → Product > Archive → App Store Connectへ提出
```

`server.url` 方式なので、**Webを更新すればアプリも自動で最新**になります（ストア再審査不要）。

### 審査のポイント
- App Storeは「Webサイトを包んだだけのアプリ」を却下することがあります。プッシュ通知
  （`@capacitor/push-notifications`）やカメラ連携（パスポート撮影を`@capacitor/camera`に置換）を
  追加してネイティブ機能を持たせると通過しやすくなります。
- プライバシーポリシーのURL提出が必須です（公式サイト `/site` 配下に用意することを推奨）。

## 3. 推奨ロードマップ
1. **今日**: PWAとして案内開始（QRコードを宿・公式サイトに掲示）
2. **数週間後**: Play Store版を公開（審査が緩く、$25のみ）
3. **軌道に乗ったら**: App Store版 + プッシュ通知（予約承認・メッセージ受信を通知）
