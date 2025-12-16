import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scale: {
    // RESIZEをやめてFITに変更（これが一番安定します）
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH, // 常に画面中央へ
    // 基準サイズを「720x1280 (HD)」に固定
    width: 720,
    height: 1280,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  // ↓ この行で高画質化（エラーが出ないよう無視させる）
  // @ts-ignore
  resolution: window.devicePixelRatio, 
  
  parent: 'game-container',
  backgroundColor: '#0d1117',
  scene: [GameScene],
};

new Phaser.Game(config);