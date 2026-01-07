# Visual Tool - 総合画像編集ツール

高機能なオンライン画像編集ツールです。フロントエンド完全処理で、高速で応答性の高い画像編集体験を提供します。

## 特徴

✨ **完全クライアント側処理** - サーバーへのアップロード不要  
🎨 **直感的UI** - Apple HIG準拠の洗練されたデザイン  
⚡ **高速処理** - Canvas APIを使用した高速画像処理  
🔧 **多機能** - リサイズ、回転、フィルターなど豊富な機能  
📱 **レスポンシブ** - モバイル対応

## 機能

### リサイズ
- 固定サイズでのリサイズ
- アスペクト比を保持したリサイズ

### 回転・反転
- 自由な角度での回転
- 水平反転
- 垂直反転

### フィルター
- 明度調整
- コントラスト調整
- 彩度調整
- グレースケール
- セピア効果
- ぼかし効果

## 技術スタック

- **フレームワーク**: Nuxt 4
- **UIフレームワーク**: Vue 3 Composition API
- **状態管理**: Pinia
- **スタイリング**: CSS 3 with CSS Scoped
- **画像処理**: HTML5 Canvas API
- **型安全**: TypeScript

## プロジェクト構造

```
app/
├── components/              # UIコンポーネント
│   ├── ui/                  # 汎用UIコンポーネント
│   │   ├── Button.vue       # ボタン
│   │   ├── Slider.vue       # スライダー
│   │   ├── FileInput.vue    # ファイル入力
│   │   ├── ToolPanel.vue    # ツールパネル
│   │   └── index.ts         # UIエクスポート
│   ├── modals/              # モーダルダイアログ
│   │   ├── OperationModal.vue    # 基底モーダル
│   │   ├── ResizeModal.vue       # リサイズ
│   │   ├── CropModal.vue         # 切り抜き
│   │   ├── TransformModal.vue    # 変形
│   │   ├── BrightnessContrastModal.vue
│   │   ├── HueSaturationModal.vue
│   │   ├── ToneCurveModal.vue
│   │   ├── WatermarkModal.vue
│   │   └── index.ts         # モーダルエクスポート
│   ├── editor/              # エディター専用コンポーネント
│   │   ├── EditorMenuBar.vue    # メニューバー
│   │   ├── ImagePreview.vue     # 画像プレビュー
│   │   ├── InteractiveCrop.vue  # インタラクティブ切り抜き
│   │   ├── BatchQueue.vue       # バッチキュー
│   │   └── index.ts         # エディターエクスポート
│   └── index.ts             # 全コンポーネントエクスポート
├── pages/                   # ページ
│   ├── index.vue            # ホーム
│   ├── editor.vue           # 画像エディター
│   ├── convert.vue          # フォーマット変換
│   ├── compress.vue         # 画像圧縮
│   ├── organize.vue         # 画像整理
│   ├── privacy.vue          # プライバシーポリシー
│   └── terms.vue            # 利用規約
├── stores/                  # Piniaストア（状態管理）
│   ├── image.ts             # 画像処理ストア
│   ├── batch.ts             # バッチ処理ストア
│   └── index.ts             # ストアエクスポート
├── utils/                   # ユーティリティ関数
│   ├── imageProcessor.ts    # 画像処理エンジン
│   ├── imageCompressor.ts   # 圧縮処理
│   ├── advancedResampler.ts # 高度なリサンプリング
│   └── index.ts             # ユーティリティエクスポート
├── composables/             # Composition API フック
│   ├── useEditorModals.ts   # モーダル管理
│   ├── useKeyboardShortcuts.ts # キーボードショートカット
│   └── index.ts             # composablesエクスポート
├── types/                   # TypeScript型定義
│   └── index.ts             # 全型定義
├── styles/                  # スタイルシート
│   ├── tokens.css           # デザイントークン（Apple HIG準拠）
│   ├── base.css             # ベーススタイル
│   ├── layout.css           # レイアウトスタイル
│   ├── components.css       # コンポーネントスタイル
│   ├── editor.css           # エディタースタイル
│   ├── modals.css           # モーダルスタイル
│   ├── pages.css            # ページスタイル
│   └── main.css             # メインエントリー
├── layouts/                 # レイアウト
│   └── default.vue          # デフォルトレイアウト
└── app.vue                  # ルートコンポーネント
```

## セットアップ

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

開発サーバーが起動します: [http://localhost:3001](http://localhost:3001)

### プロダクションビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

## デザインシステム

デザイントークンファイル（`app/styles/tokens.css`）で以下をCSS変数として一元管理：
- カラーパレット（Apple HIG準拠）
- タイポグラフィ
- スペーシング
- ボーダー半径
- シャドウ
- アニメーション

スタイルは機能別にCSSファイルに分離：
- `tokens.css` - デザイントークン
- `base.css` - リセットと基本スタイル
- `layout.css` - アプリレイアウト
- `components.css` - 汎用コンポーネント
- `editor.css` - エディター関連
- `modals.css` - モーダルダイアログ
- `pages.css` - ページ固有スタイル

すべてのコンポーネントはCSS変数を参照し、一貫性のあるデザインを維持します。

## コンポーネント原則

- **OOP原則** - 明確な責任分離と再利用性
- **プロップスベース設定** - 柔軟なカスタマイズ
- **Composition API** - 最新のVue開発パターン
- **型安全** - TypeScript により安全性を確保

## ブラウザ互換性

- Chrome/Chromium（最新）
- Firefox（最新）
- Safari（最新）
- Edge（最新）

Canvas APIサポートが必要です。

## ライセンス

MIT

## 備考

すべての画像処理がクライアント側で行われるため、プライバシーが完全に保護されます。
