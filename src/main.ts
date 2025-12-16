import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  // width/heightを固定せず、親要素(ブラウザ)に合わせる設定
  scale: {
    mode: Phaser.Scale.RESIZE, // 画面サイズに合わせてキャンバスを変形
    parent: 'game-container',
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.NO_CENTER, // リサイズモードなのでセンタリング不要
  },
  backgroundColor: '#0d1117',
  scene: [GameScene],
};

new Phaser.Game(config);