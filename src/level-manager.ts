import { Level } from './types';
import level1 from '../levels/level1';
import level2 from '../levels/level2';
import { level3 } from '../levels/level3';
import { level4 } from '../levels/level4';
import { level5 } from '../levels/level5';
import { level6 } from '../levels/level6';
import { level7 } from '../levels/level7';
import { level8 } from '../levels/level8';
import { level9 } from '../levels/level9';

export class LevelManager {
  private levels: Level[] = [level1, level2, level3, level4, level5, level6, level7, level8, level9];
  private currentLevelIndex: number = 0;
  
  // Get the current level
  public getCurrentLevel(): Level {
    return this.levels[this.currentLevelIndex];
  }
  
  // Get all levels
  public getLevels(): Level[] {
    return this.levels;
  }
  
  // Get a level by ID
  public getLevelById(id: string): Level | undefined {
    return this.levels.find(level => level.id === id);
  }
  
  // Load a specific level
  public loadLevel(id: string): Level | undefined {
    const level = this.getLevelById(id);
    if (level) {
      const index = this.levels.findIndex(l => l.id === id);
      if (index !== -1) {
        this.currentLevelIndex = index;
      }
    }
    return level;
  }
  
  // Load the next level
  public loadNextLevel(): Level | undefined {
    if (this.currentLevelIndex < this.levels.length - 1) {
      this.currentLevelIndex++;
      return this.getCurrentLevel();
    }
    return undefined;
  }
  
  // Check if there's a next level
  public hasNextLevel(): boolean {
    return this.currentLevelIndex < this.levels.length - 1;
  }
  
  // Get the current level index
  public getCurrentLevelIndex(): number {
    return this.currentLevelIndex;
  }
  
  // Get the total number of levels
  public getTotalLevels(): number {
    return this.levels.length;
  }
}