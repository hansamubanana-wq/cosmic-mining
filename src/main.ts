import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE, // 画面に合わせて変形
    parent: 'game-container',
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  // --- ここが画質向上のカギ ---
  render: {
    pixelArt: false,
    antialias: true,
  },
  // デバイスの解像度倍率（スマホだと2〜3倍）を適用
  resolution: window.devicePixelRatio, 
  backgroundColor: '#0d1117',
  scene: [GameScene],
};

new Phaser.Game(config);