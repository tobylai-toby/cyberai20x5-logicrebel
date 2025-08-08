// Type definitions for the game
export interface Position {
  x: number;
  y: number;
}

export interface Direction {
  dx: number;
  dy: number;
}

export interface Robot {
  position: Position;
  direction: Direction;
  health?: number; // Player health
}

export interface Enemy {
  id: number;
  position: Position;
  direction: Direction;
  health: number;
  behavior: EnemyAction[]; // Enemy movement pattern
  currentBehaviorIndex: number;
}

export interface EnemyAction {
  action: 'move_forward' | 'turn_left' | 'turn_right';
}

export interface WinCondition {
  requiredCoins?: number;
  goal?: Position;
  requiredEnemies?: number;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  hint?: string;
  story?: string; // Story markdown content for the level
  map: string[]; // Simple string array representation of the map
  robotStart: {
    position: Position;
    direction: Direction;
  };
  goals: Position[]; // Positions that need to be reached to win
  enemies?: Enemy[]; // Enemy positions and behaviors
  coins?: Position[]; // Coin positions
  winCondition: WinCondition; // Win condition for the level
}