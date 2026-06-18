// src/main.ts
import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { SaveSystem } from './systems/SaveSystem';

// Initialize Save System Autosave Listeners
SaveSystem.initAutoSaveListeners();

// Start the Phaser Game
const game = new Phaser.Game(GameConfig);

// Resize game when window dimensions change
window.addEventListener('resize', () => {
  if (game && game.scale) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

console.log("Wild Haven loaded successfully.");
