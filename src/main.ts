import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1080, // ゲーム内の解像度（横）
  height: 1920, // ゲーム内の解像度（縦・スマホ向け縦長）
  backgroundColor: '#0d1117', // 宇宙っぽい暗い青
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT, // 画面に合わせて比率を保ったまま拡大縮小
    autoCenter: Phaser.Scale.CENTER_BOTH, // 画面中央に配置
  },
  scene: [GameScene], // ここにゲームのシーンを追加していく
};

new Phaser.Game(config);