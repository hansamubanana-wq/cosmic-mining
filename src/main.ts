import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

// 設定オブジェクトを作成（型チェックを回避するために一旦変数に入れる）
const configData = {
  type: Phaser.AUTO,
  scale: {
    // 画面サイズに合わせて拡大縮小（縦横比維持）
    mode: Phaser.Scale.FIT,
    // 常に画面中央へ配置
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // 基準サイズをHD画質に設定
    width: 720,
    height: 1280,
  },
  render: {
    // ドット絵モードをオフ
    pixelArt: false,
    // アンチエイリアス（滑らか補正）をオン
    antialias: true,
    // 座標を整数に丸めない（滑らかな動きのため）
    roundPixels: false,
  },
  // 【最重要】デバイスの本来の画質比率を適用する
  // これが効けば、文字や線がクッキリするはず
  resolution: window.devicePixelRatio || 1,
  
  parent: 'game-container',
  backgroundColor: '#0d1117',
  scene: [GameScene],
};

// 最終奥義：'as any' を使って強制的にPhaserに設定を渡す
new Phaser.Game(configData as any);