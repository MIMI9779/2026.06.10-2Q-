# 🎮 Neon Arcade - 究極のブラウザゲームポータル

「Neon Arcade（ネオン・アーケード）」は、美しいネオングラデーション、洗練されたアニメーション、動的な効果音合成エンジンを搭載したプレミアムなブラウザゲームポータルです。

## 🕹️ 収録ゲーム

### 1. 🎮 Neon Crush (マルバツゲーム / 三目並べ)
洗練されたグラフィックスと、ミニマックス法による無敗のAIを搭載した究極のマルバツゲーム。
- **特徴:** 
  - 3段階のAI難易度（イージー、ノーマル、最強）
  - 最強モードはミニマックス（Minimax）アルゴリズムにより絶対に勝てない思考ルーチン
  - 2プレイヤー対戦（PvP）対応
  - Web Audio APIによるネオンSEと、勝利時のダイナミックな紙吹雪＆勝利ライン描画
- **ファイル:** [tictactoe.html](file:///workspaces/2026.06.10-2Q-/tictactoe.html) | [tictactoe.css](file:///workspaces/2026.06.10-2Q-/tictactoe.css) | [tictactoe.js](file:///workspaces/2026.06.10-2Q-/tictactoe.js)

### 2. 🚀 Neon Striker (2Dスペースシューティング)
立ちはだかる敵機や弾幕を避けながら、宇宙を駆け抜ける爽快な縦スクロール・スペースシューティング。
- **特徴:** 
  - マウスドラッグ、タッチ、キーボード（WASD / 矢印キー）による直感的な操作
  - 敵を倒すことでドロップするパワーアップアイテム（3方向/5方向ショット強化、シールド回復、ボム補充）
  - 画面全体の敵と弾を消し去る強力な「ボム」演出（衝撃波グラフィックス）
  - Web Audio APIによるショット、被弾、爆発音のリアルタイム合成、およびBGMとしてのテクノビート自動生成
  - 敵の撃破時のネオンパーティクル爆発エフェクト
- **ファイル:** [shooting.html](file:///workspaces/2026.06.10-2Q-/shooting.html) | [shooting.css](file:///workspaces/2026.06.10-2Q-/shooting.css) | [shooting.js](file:///workspaces/2026.06.10-2Q-/shooting.js)

---

## 🛠️ 技術スタック

- **Markup:** HTML5 (セマンティックタグ、ARIAフレンドリー、インタラクティブランチャー)
- **Styling:** CSS3 (Vanilla CSS, CSS Variables, Backdrop-filter, 3D Perspective, Keyframe Animations)
- **Scripting:** Modern JavaScript (ES6+, Canvas 2D API, Web Audio API Sound Synthesizer)
- **Fonts:** Outfit, Space Grotesk (Google Fonts)

---

## 🚀 起動方法

### 1. ブラウザで直接開く
本リポジトリの `index.html` をブラウザ（Chrome、Edge、Safari、Firefoxなど）でダブルクリックして開くだけで、サーバー不要で今すぐ遊ぶことができます。

### 2. ローカルサーバーを使用する
Python や Node.js を使用して簡易サーバーを立ち上げてプレイすることも可能です。

**Python:**
```bash
python3 -m http.server 8000
```
起動後、ブラウザで `http://localhost:8000` にアクセスしてください。

**Node.js (http-server):**
```bash
npx http-server .
```
起動後、表示されるURL（例: `http://localhost:8080`）にアクセスしてください。

---

*Enjoy the ultimate neon gaming experience!*