import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1080,
  height: 2400, // 1920から変更。最近の縦長スマホに合わせて長くする
  backgroundColor: '#0d1117',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT, // 画面比率を保ったまま最大化
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, // 横方向は中央揃え（PC用）
  },
  scene: [GameScene],
};

new Phaser.Game(config);