// Game engine implementation using PixiJS
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Robot, Level, Enemy } from './types';
import * as easystarjs from 'easystarjs';

export class GameEngine {
  private robot: Robot;
  private level: Level;
  private app: PIXI.Application;
  private viewport!: Viewport;
  private robotSprite!: PIXI.Sprite | PIXI.Graphics;
  private cellSize: number = 50;
  private tilemap!: PIXI.Container;
  private initialized: boolean = false;
  private moveDelay: number = 300; // 300ms delay between moves (player)
  private enemyMoveDelay: number = 500; // 500ms delay between moves (enemies)
  private enemyAttackDelay: number = 300; // 300ms delay between enemy attacks
  private collectedCoins: Set<string> = new Set(); // Set of collected coin positions
  private enemies: Enemy[] = []; // Active enemies in the game
  private defeatedEnemies: number = 0; // Count of defeated enemies
  private isGameRunning: boolean = false;
  private hasAnyEnemyEngaged: boolean = false; // Track if any enemy has ever engaged with player
  private levelCompleted: boolean = false;
  public isPreviewing: boolean = false;  // 改为public
  private previewAbortController: AbortController | null = null;  // 添加预览中断控制器
  private enemyMoveTimeoutId: number | null = null;  // 添加缺失的属性定义
  private attackSound: HTMLAudioElement | null = null;
  private soundEnabled: boolean = true;
  
  // Texture assets
  private textures: {
    ground?: PIXI.Texture;
    wall?: PIXI.Texture;
    coin?: PIXI.Texture;
    recoverHpGround?: PIXI.Texture;
    playerRobot?: PIXI.Texture;
    enemyRobot?: PIXI.Texture;
    exit?: PIXI.Texture;
  } = {};
  
  // 缓存缩放比例，避免重复计算
  private spriteScales: {
    playerRobot?: number;
    enemyRobot?: number;
    coin?: number;
  } = {};

  constructor(level: Level, container: HTMLElement) {
    this.level = level;
    
    // Initialize robot at start position with health
    this.robot = {
      position: { ...level.robotStart.position },
      direction: { ...level.robotStart.direction },
      health: 6 // Player starts with 6 health
    };
    
    // Initialize enemies with 2 health points each (so player needs 2 hits to defeat)
    if (level.enemies) {
      this.enemies = level.enemies.map(enemy => ({
        ...enemy,
        health: 2 // Enemies now have 2 health points
      }));
    } else {
      this.enemies = [];
    }
    
    // Create PixiJS application
    this.app = new PIXI.Application();
    
    // Initialize the application asynchronously
    this.initApplication(container);
  }
  
  private async initApplication(container: HTMLElement) {
    // Use a fixed size for the canvas to fill the available space
    const canvasWidth = 800;
    const canvasHeight = 600;
    
    await this.app.init({
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: 0xe0e0e0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    // Add the canvas to the container once initialized
    container.appendChild(this.app.canvas);
    
    // Load textures
    await this.loadTextures();
    
    // Now initialize the rest of the game
    this.initializeGame();
  }
  
  private async loadTextures(): Promise<void> {
    try {
      // 使用HTML Image对象预加载图片，然后传给PIXI
      const loadTexture = async (path: string): Promise<PIXI.Texture | undefined> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            const texture = PIXI.Texture.from(img);
            resolve(texture);
          };
          
          img.onerror = () => {
            console.error(`Failed to load image: ${path}`);
            resolve(undefined);
          };
          
          img.src = path;
        });
      };
      
      this.textures.ground = await loadTexture('./assets/ground.png');
      this.textures.wall = await loadTexture('./assets/wall.png');
      this.textures.coin = await loadTexture('./assets/coin_data_card.png');
      this.textures.recoverHpGround = await loadTexture('./assets/recover_hp_ground.png');
      this.textures.playerRobot = await loadTexture('./assets/robot_player_toward_right.png');
      this.textures.enemyRobot = await loadTexture('./assets/robot_enemy_toward_right.png');
      this.textures.exit = await loadTexture('./assets/exit.png');
      
      // 计算并缓存缩放比例
      if (this.textures.playerRobot) {
        const tempSprite = new PIXI.Sprite(this.textures.playerRobot);
        this.spriteScales.playerRobot = Math.min(this.cellSize / tempSprite.width, this.cellSize / tempSprite.height) * 0.8;
      }
      if (this.textures.enemyRobot) {
        const tempSprite = new PIXI.Sprite(this.textures.enemyRobot);
        this.spriteScales.enemyRobot = Math.min(this.cellSize / tempSprite.width, this.cellSize / tempSprite.height) * 0.8;
      }
      if (this.textures.coin) {
        const tempSprite = new PIXI.Sprite(this.textures.coin);
        this.spriteScales.coin = Math.min(this.cellSize / tempSprite.width, this.cellSize / tempSprite.height) * 0.8;
      }
    } catch (error) {
      console.error('Failed to load textures:', error);
      // Fallback to geometric shapes if textures fail to load
    }
  }
  
  private initializeGame() {
    // Calculate world dimensions based on map size
    const worldWidth = this.level.map[0].length * this.cellSize;
    const worldHeight = this.level.map.length * this.cellSize;
    
    // Use canvas dimensions for screen
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    // Create viewport
    this.viewport = new Viewport({
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      worldWidth: worldWidth,
      worldHeight: worldHeight,
      events: this.app.renderer.events
    });
    
    // Add viewport to stage
    this.app.stage.addChild(this.viewport);
    
    // Activate plugins
    this.viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate();
    
    // Set initial zoom to fit the world
    this.viewport.fitWorld();
    
    // Create tilemap container
    this.tilemap = new PIXI.Container();
    this.viewport.addChild(this.tilemap);
    
    // Create robot sprite (will be properly initialized in drawRobot)
    this.robotSprite = new PIXI.Graphics();
    
    // Add mouse move event listener to show coordinates
    this.viewport.on('pointermove', (event: any) => {
      this.showCoordinates(event);
    });
    
    // Initialize audio
    this.initializeAudio();
    
    // Mark as initialized
    this.initialized = true;
    
    // Draw the initial game state
    this.draw();
  }
  
  // Show coordinates on mouse hover
  private showCoordinates(event: any): void {
    if (!this.initialized) return;
    
    // Get the world position from the event
    const worldPos = this.viewport.toWorld(event.global);
    
    // Calculate grid coordinates (relative to top-left walkable area)
    const gridX = Math.floor(worldPos.x / this.cellSize);
    const gridY = Math.floor(worldPos.y / this.cellSize);
    
    // Find the top-left walkable position in the map
    let minX = this.level.map[0].length;
    let minY = this.level.map.length;
    
    for (let y = 0; y < this.level.map.length; y++) {
      for (let x = 0; x < this.level.map[y].length; x++) {
        if (this.level.map[y][x] === '.' || this.level.map[y][x] === ' ') {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
        }
      }
    }
    
    // Calculate relative coordinates
    const relativeX = gridX - minX;
    const relativeY = gridY - minY;
    
    // Update coordinate display
    const coordinateDisplay = document.getElementById('coordinate-display');
    if (coordinateDisplay) {
      coordinateDisplay.textContent = `坐标: (${relativeX}, ${relativeY})`;
    }
  }
  
  // Reset the robot to the starting position
  public reset(): void {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    // 强制停止所有游戏进程
    this.stopGame(false);
    
    // 完全重置所有状态
    this.hasAnyEnemyEngaged = false;
    this.isPreviewing = false;
    
    // 移除所有提示消息
    const toastContainer = document.getElementById('robot-toast-container');
    if (toastContainer) {
      toastContainer.remove();
    }
    
    // 重置机器人到关卡定义的确切位置和方向
    this.robot.position = { x: this.level.robotStart.position.x, y: this.level.robotStart.position.y };
    this.robot.direction = { dx: this.level.robotStart.direction.dx, dy: this.level.robotStart.direction.dy };
    this.robot.health = 6;
    this.collectedCoins.clear();
    this.defeatedEnemies = 0;
    
    // 完全重新创建敌人，确保位置和方向完全正确
    this.enemies = [];
    if (this.level.enemies) {
      this.enemies = this.level.enemies.map(enemy => ({
        id: enemy.id,
        position: { x: enemy.position.x, y: enemy.position.y },
        direction: { dx: enemy.direction.dx, dy: enemy.direction.dy },
        health: 2,
        behavior: [...enemy.behavior],
        currentBehaviorIndex: 0
      }));
    }
    
    // 确保清除所有定时器
    if (this.enemyMoveTimeoutId !== null) {
      clearTimeout(this.enemyMoveTimeoutId);
      this.enemyMoveTimeoutId = null;
    }
    
    // 强制重绘整个游戏界面
    this.fitWorld();
    this.draw();
  }
  
  // Move the robot forward one step
  public async moveForward(): Promise<void> {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    // Check if game is running
    if (!this.isGameRunning) {
      console.warn('Game is not running');
      return;
    }
    
    // 检查玩家上下左右是否有敌人
    const playerX = this.robot.position.x;
    const playerY = this.robot.position.y;
    
    // 定义四个方向（上、右、下、左）
    const directions = [
      { dx: 0, dy: -1 }, // 上
      { dx: 1, dy: 0 },  // 右
      { dx: 0, dy: 1 },  // 下
      { dx: -1, dy: 0 }  // 左
    ];
    
    // 检查每个方向是否有敌人
    for (const dir of directions) {
      const checkX = playerX + dir.dx;
      const checkY = playerY + dir.dy;
      
      const adjacentEnemy = this.enemies.find(enemy => 
        enemy.position.x === checkX && enemy.position.y === checkY && enemy.health > 0
      );
      
      if (adjacentEnemy) {
        // 如果相邻有敌人，面向该敌人并停止移动
        await this.faceEnemy();
        return;
      }
    }
    
    const newX = this.robot.position.x + this.robot.direction.dx;
    const newY = this.robot.position.y + this.robot.direction.dy;
    
    // Check if there's an enemy in the target position
    const enemyInFront = this.enemies.some(enemy => 
      enemy.position.x === newX && enemy.position.y === newY && enemy.health > 0
    );
    
    // If there's an enemy in front, player should face the enemy instead of just stopping
    if (enemyInFront) {
      // Face the enemy instead of just stopping
      await this.faceEnemy();
      // Add delay to give player time to react
      await this.delay(this.moveDelay);
      // After player tries to move, enemies still move
      // But we need to make sure we don't trigger multiple enemy movements
      if (this.isGameRunning) {
        // Only move enemies if the game is still running
        this.draw();
        await this.delay(this.enemyMoveDelay);
      }
      return;
    }
    
    // Check if the new position is valid (within bounds and not a wall)
    if (this.isValidPosition(newX, newY)) {
      this.robot.position.x = newX;
      this.robot.position.y = newY;
      
      // Check if there's a coin at the new position
      this.checkCoinCollection(newX, newY);
      
      // Check if player stepped on a health restore tile
      this.checkHealthRestore(newX, newY);
      
      // Check win condition
      this.checkWinCondition();
    }
    
    this.draw();
    await this.delay(this.moveDelay);
    
    // After player moves, enemies move
    await this.moveEnemies();
  }
  
  // Turn the robot left (90 degrees counter-clockwise)
  public async turnLeft(): Promise<void> {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    // Check if game is running
    if (!this.isGameRunning) {
      console.warn('Game is not running');
      return;
    }
    
    // Rotate direction vector 90 degrees counter-clockwise
    const newDx = this.robot.direction.dy;
    const newDy = -this.robot.direction.dx;
    this.robot.direction.dx = newDx;
    this.robot.direction.dy = newDy;
    
    this.draw();
    await this.delay(this.moveDelay);
    
    // After player turns, enemies move
    // But we need to make sure we don't trigger multiple enemy movements
    if (this.isGameRunning || this.areEnemiesEngaged()) {
      // Only move enemies if the game is still running or enemies are engaged
      // But don't recursively call moveEnemies to avoid rapid fire attacks
      this.draw();
      await this.delay(this.enemyMoveDelay);
    }
  }
  
  // Turn the robot right (90 degrees clockwise)
  public async turnRight(): Promise<void> {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    // Check if game is running
    if (!this.isGameRunning) {
      console.warn('Game is not running');
      return;
    }
    
    // Rotate direction vector 90 degrees clockwise
    const newDx = -this.robot.direction.dy;
    const newDy = this.robot.direction.dx;
    this.robot.direction.dx = newDx;
    this.robot.direction.dy = newDy;
    
    this.draw();
    await this.delay(this.moveDelay);
    
    // After player turns, enemies move
    // But we need to make sure we don't trigger multiple enemy movements
    if (this.isGameRunning || this.areEnemiesEngaged()) {
      // Only move enemies if the game is still running or enemies are engaged
      // But don't recursively call moveEnemies to avoid rapid fire attacks
      this.draw();
      await this.delay(this.enemyMoveDelay);
    }
  }
  
  // Attack in the direction the robot is facing
  public async attack(): Promise<void> {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    // Check if game is running
    if (!this.isGameRunning) {
      console.warn('Game is not running');
      return;
    }
    
    const attackX = this.robot.position.x + this.robot.direction.dx;
    const attackY = this.robot.position.y + this.robot.direction.dy;
    
    // Check if there's an enemy in the attack position
    const enemyToAttack = this.enemies.find(enemy => 
      enemy.position.x === attackX && enemy.position.y === attackY && enemy.health > 0
    );
    
    if (enemyToAttack) {
      // Play attack sound
      this.playAttackSound();
      
      // Check if enemy is facing away from player
      const isEnemyFacingAway = (
        enemyToAttack.position.x - enemyToAttack.direction.dx === this.robot.position.x &&
        enemyToAttack.position.y - enemyToAttack.direction.dy === this.robot.position.y
      );
      
      // Calculate damage (1 for normal attack, 4 for back attack)
      const damage = isEnemyFacingAway ? 4 : 1;
      
      // Damage the enemy
      enemyToAttack.health -= damage;
      console.log(`Attacked enemy at (${attackX}, ${attackY}). Enemy health: ${enemyToAttack.health}`);
      
      // Show special message for back attack
      if (isEnemyFacingAway) {
        this.showToast('背后攻击! 伤害+3', 2000);
      }
      
      // Check if enemy is defeated
      if (enemyToAttack.health <= 0) {
        this.defeatedEnemies++;
        console.log(`Enemy defeated! Total defeated: ${this.defeatedEnemies}`);
        this.showToast('敌人被击败!', 2000);
      }
      
      this.draw();
      // Add delay for successful attack
      await this.delay(300);
      
      // After player attacks, enemies move
      // But we need to make sure we don't trigger multiple enemy movements
      if (this.isGameRunning) {
        // Only move enemies if the game is still running
        this.draw();
        await this.delay(this.enemyMoveDelay);
      }
      
      // Check win condition (defeat enemies type)
      this.checkWinCondition();
    } else {
      // No toast when attack misses
      // Add delay even when attack misses
      await this.delay(300);
      
      // After player attacks, enemies move
      // But we need to make sure we don't trigger multiple enemy movements
      if (this.isGameRunning) {
        // Only move enemies if the game is still running
        this.draw();
        await this.delay(this.enemyMoveDelay);
      }
    }
  }
  
  // Turn the robot to face the nearest enemy
  public async faceEnemy(): Promise<void> {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    // Check if game is running
    if (!this.isGameRunning) {
      console.warn('Game is not running');
      return;
    }
    
    // 检查玩家上下左右是否有敌人
    const playerX = this.robot.position.x;
    const playerY = this.robot.position.y;
    
    // 定义四个方向（上、右、下、左）
    const directions = [
      { dx: 0, dy: -1 }, // 上
      { dx: 1, dy: 0 },  // 右
      { dx: 0, dy: 1 },  // 下
      { dx: -1, dy: 0 }  // 左
    ];
    
    // 检查每个方向是否有敌人
    for (const dir of directions) {
      const checkX = playerX + dir.dx;
      const checkY = playerY + dir.dy;
      
      const adjacentEnemy = this.enemies.find(enemy => 
        enemy.position.x === checkX && enemy.position.y === checkY && enemy.health > 0
      );
      
      if (adjacentEnemy) {
        // 如果相邻有敌人，直接面向该敌人
        await this.turnToDirection(dir.dx, dir.dy);
        this.draw();
        return; // 退出方法，不再寻找最近敌人
      }
    }
    
    // 如果没有相邻敌人，寻找最近的敌人
    let nearestEnemy: Enemy | null = null;
    let minDistance = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue; // Skip defeated enemies

      const dx = enemy.position.x - this.robot.position.x;
      const dy = enemy.position.y - this.robot.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      // Calculate direction to enemy
      const dx = nearestEnemy.position.x - this.robot.position.x;
      const dy = nearestEnemy.position.y - this.robot.position.y;

      // Determine which direction to face based on the larger distance component
      if (Math.abs(dx) >= Math.abs(dy)) {
        // Face left or right
        if (dx > 0) {
          await this.turnToDirection(1, 0); // Face right
        } else {
          await this.turnToDirection(-1, 0); // Face left
        }
      } else {
        // Face up or down
        if (dy > 0) {
          await this.turnToDirection(0, 1); // Face down
        } else {
          await this.turnToDirection(0, -1); // Face up
        }
      }
      
      // Redraw to show the new direction immediately
      this.draw();
    }
  }
  
  // Move enemies
  private async moveEnemies(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    // 只在游戏运行状态下移动敌人
    if (!this.isGameRunning) {
      return;
    }
    
    // 清除任何现有的定时器
    if (this.enemyMoveTimeoutId !== null) {
      clearTimeout(this.enemyMoveTimeoutId);
      this.enemyMoveTimeoutId = null;
    }
    
    let enemyMoved = false;
    let isAttack = false;
    
    // 移动每个敌人
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue;
      
      const isPlayerAdjacent = this.isPlayerAdjacentToEnemy(enemy);
      
      if (isPlayerAdjacent) {
        this.faceEnemyTowardsPlayer(enemy);
        await this.enemyAttack(enemy);
        enemyMoved = true;
        isAttack = true;
        break;
      } else {
        await this.executeEnemyBehavior(enemy);
        enemyMoved = true;
      }
    }
    
    if (enemyMoved) {
      this.draw();
      // 使用不同的延迟时间，攻击后使用攻击延迟，移动后使用移动延迟
      await this.delay(isAttack ? this.enemyAttackDelay : this.enemyMoveDelay);
    }
    
    // 只在游戏运行状态下继续移动敌人
    if (this.isGameRunning && this.robot.health !== undefined && this.robot.health > 0) {
      this.enemyMoveTimeoutId = window.setTimeout(() => {
        if (this.isGameRunning && this.robot.health !== undefined && this.robot.health > 0) {
          this.moveEnemies();
        }
      }, isAttack ? this.enemyAttackDelay : this.enemyMoveDelay);
    } else {
      this.hasAnyEnemyEngaged = false;
    }
  }
  
  // Check if any enemies are engaged with the player (adjacent)
  private areEnemiesEngaged(): boolean {
    return this.enemies.some(enemy => 
      enemy.health > 0 && this.isPlayerAdjacentToEnemy(enemy)
    );
  }
  
  // Check if player is adjacent to enemy (excluding the back)
  private isPlayerAdjacentToEnemy(enemy: Enemy): boolean {
    // Check positions adjacent to enemy (up, right, down, left)
    const adjacentPositions = [
      { x: enemy.position.x, y: enemy.position.y - 1, dx: 0, dy: -1 }, // Up
      { x: enemy.position.x + 1, y: enemy.position.y, dx: 1, dy: 0 },   // Right
      { x: enemy.position.x, y: enemy.position.y + 1, dx: 0, dy: 1 },   // Down
      { x: enemy.position.x - 1, y: enemy.position.y, dx: -1, dy: 0 }    // Left
    ];
    
    // Exclude the back position based on enemy's current direction
    const backX = enemy.position.x - enemy.direction.dx;
    const backY = enemy.position.y - enemy.direction.dy;
    
    // Check if player is in any adjacent position except the back
    for (const pos of adjacentPositions) {
      // Skip the back position
      if (pos.x === backX && pos.y === backY) {
        continue;
      }
      
      // Check if player is at this position
      if (pos.x === this.robot.position.x && pos.y === this.robot.position.y) {
        return true;
      }
    }
    
    return false;
  }
  
  // Make enemy face the player
  private faceEnemyTowardsPlayer(enemy: Enemy): void {
    const dx = this.robot.position.x - enemy.position.x;
    const dy = this.robot.position.y - enemy.position.y;
    
    // Only change direction if the enemy is not already facing the player
    if (enemy.direction.dx !== dx || enemy.direction.dy !== dy) {
      enemy.direction.dx = dx;
      enemy.direction.dy = dy;
    }
  }
  
  // Enemy attack action
  private async enemyAttack(enemy: Enemy): Promise<void> {
    // Check if game is running
    if (!this.isGameRunning) {
      return;
    }
    
    // Calculate the position in front of the enemy
    const targetX = enemy.position.x + enemy.direction.dx;
    const targetY = enemy.position.y + enemy.direction.dy;
    
    // Check if the player is in front of the enemy
    if (targetX === this.robot.position.x && targetY === this.robot.position.y) {
      // Add a small delay to give player time to react
      await this.delay(300);
      
      // Damage the player (1.2 damage)
      if (this.robot.health) {
        this.robot.health -= 1.2;
        
        // Check if player is defeated
        if (this.robot.health <= 0) {
          this.showToast('Game Over! You were defeated!', 5000);
          // Stop the game when player is defeated
          this.stopGame();
          // Immediately return to prevent further execution
          return;
        }
      }
      
      // Always wait for attack delay to maintain rhythm
      await this.delay(this.enemyAttackDelay);
    } else {
      // If no attack, wait a short time to maintain enemy movement rhythm
      await this.delay(this.enemyMoveDelay / 2);
    }
  }
  
  // Execute enemy behavior
  private async executeEnemyBehavior(enemy: Enemy): Promise<void> {
    if (enemy.behavior.length === 0) return;
    
    // Get the current behavior action
    const action = enemy.behavior[enemy.currentBehaviorIndex];
    
    // Check if this is a move action and if the enemy is engaged with the player
    if (action.action === 'move_forward' && this.isPlayerAdjacentToEnemy(enemy)) {
      // If enemy is engaged with player, skip movement
      enemy.currentBehaviorIndex = (enemy.currentBehaviorIndex + 1) % enemy.behavior.length;
      return;
    }
    
    switch (action.action) {
      case 'move_forward':
        const newX = enemy.position.x + enemy.direction.dx;
        const newY = enemy.position.y + enemy.direction.dy;
        
        // Check if the new position is valid
        if (this.isValidPosition(newX, newY) && !this.isEnemyAtPosition(newX, newY)) {
          enemy.position.x = newX;
          enemy.position.y = newY;
        } else {
          // If movement is blocked, try to find an alternative path
          // For simplicity, we'll just rotate the enemy to try a different direction
          // In a more advanced implementation, we could implement A* pathfinding
          this.rotateEnemyToOpenDirection(enemy);
        }
        break;
        
      case 'turn_left':
        // Rotate direction vector 90 degrees counter-clockwise
        const newDx = enemy.direction.dy;
        const newDy = -enemy.direction.dx;
        enemy.direction.dx = newDx;
        enemy.direction.dy = newDy;
        break;
        
      case 'turn_right':
        // Rotate direction vector 90 degrees clockwise
        const newDx2 = -enemy.direction.dy;
        const newDy2 = enemy.direction.dx;
        enemy.direction.dx = newDx2;
        enemy.direction.dy = newDy2;
        break;
    }
    
    // Move to next behavior, looping back to start if needed
    enemy.currentBehaviorIndex = (enemy.currentBehaviorIndex + 1) % enemy.behavior.length;
  }
  
  // Rotate enemy to find an open direction
  private rotateEnemyToOpenDirection(enemy: Enemy): void {
    // Check all four directions (up, right, down, left) to find an open path
    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: 0 },  // Right
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }  // Left
    ];
    
    // Find the current direction index
    let currentIndex = -1;
    for (let i = 0; i < directions.length; i++) {
      if (directions[i].dx === enemy.direction.dx && directions[i].dy === enemy.direction.dy) {
        currentIndex = i;
        break;
      }
    }
    
    // Try rotating to find an open direction
    if (currentIndex !== -1) {
      // Try turning right first
      const rightIndex = (currentIndex + 1) % directions.length;
      const rightX = enemy.position.x + directions[rightIndex].dx;
      const rightY = enemy.position.y + directions[rightIndex].dy;
      
      if (this.isValidPosition(rightX, rightY) && !this.isEnemyAtPosition(rightX, rightY)) {
        // Turn right
        enemy.direction.dx = directions[rightIndex].dx;
        enemy.direction.dy = directions[rightIndex].dy;
        return;
      }
      
      // Try turning left
      const leftIndex = (currentIndex + 3) % directions.length; // +3 is equivalent to -1 mod 4
      const leftX = enemy.position.x + directions[leftIndex].dx;
      const leftY = enemy.position.y + directions[leftIndex].dy;
      
      if (this.isValidPosition(leftX, leftY) && !this.isEnemyAtPosition(leftX, leftY)) {
        // Turn left
        enemy.direction.dx = directions[leftIndex].dx;
        enemy.direction.dy = directions[leftIndex].dy;
        return;
      }
      
      // Try turning around (reverse direction)
      const reverseIndex = (currentIndex + 2) % directions.length;
      const reverseX = enemy.position.x + directions[reverseIndex].dx;
      const reverseY = enemy.position.y + directions[reverseIndex].dy;
      
      if (this.isValidPosition(reverseX, reverseY) && !this.isEnemyAtPosition(reverseX, reverseY)) {
        // Turn around
        enemy.direction.dx = directions[reverseIndex].dx;
        enemy.direction.dy = directions[reverseIndex].dy;
        return;
      }
    }
  }

  // Preview enemy movement for a specified number of complete cycles
  public async previewEnemyMovement(cycles: number = 2): Promise<void> {
    // 创建中断控制器
    this.previewAbortController = new AbortController();
    this.isPreviewing = true;
    
    // 保存预览前的游戏状态
    const originalEnemies = this.enemies.map(enemy => ({
      id: enemy.id,
      position: { x: enemy.position.x, y: enemy.position.y },
      direction: { dx: enemy.direction.dx, dy: enemy.direction.dy },
      health: enemy.health,
      behavior: [...enemy.behavior],
      currentBehaviorIndex: enemy.currentBehaviorIndex
    }));
    
    // 保存预览前的机器人状态
    const originalRobot = {
      position: { x: this.robot.position.x, y: this.robot.position.y },
      direction: { dx: this.robot.direction.dx, dy: this.robot.direction.dy },
      health: this.robot.health
    };
    
    // 强制停止当前游戏
    this.stopGame();
    
    try {
      for (let cycle = 0; cycle < cycles; cycle++) {
        // 检查控制器是否存在且未被中断
        if (this.previewAbortController && this.previewAbortController.signal.aborted) {
          throw new Error('Preview aborted');
        }
        
        const enemiesCompletedCycle = new Array(this.enemies.length).fill(false);
        
        while (enemiesCompletedCycle.some(completed => !completed)) {
          // 检查控制器是否存在且未被中断
          if (this.previewAbortController && this.previewAbortController.signal.aborted) {
            throw new Error('Preview aborted');
          }
          
          for (let i = 0; i < this.enemies.length; i++) {
            // 检查控制器是否存在且未被中断
            if (this.previewAbortController && this.previewAbortController.signal.aborted) {
              throw new Error('Preview aborted');
            }
            
            const enemy = this.enemies[i];
            
            if (enemy.health <= 0 || enemiesCompletedCycle[i]) {
              enemiesCompletedCycle[i] = true;
              continue;
            }
            
            await this.executeEnemyBehavior(enemy);

            // 在每个敌人执行行为后绘制并添加延迟
            this.drawWithoutViewportMove();
            await this.delay(this.enemyMoveDelay);

            if (enemy.currentBehaviorIndex === 0) {
              enemiesCompletedCycle[i] = true;
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Preview aborted') {
        throw error;
      }
      throw error;
    } finally {
      // 只在预览仍然有效时才执行清理工作
      if (this.isPreviewing) {
        // 强制清理所有定时器
        if (this.enemyMoveTimeoutId !== null) {
          clearTimeout(this.enemyMoveTimeoutId);
          this.enemyMoveTimeoutId = null;
        }
        
        // 恢复原始游戏状态
        this.enemies = originalEnemies;
        this.robot = originalRobot;
        
        // 重置所有预览相关状态
        this.hasAnyEnemyEngaged = false;
        this.isPreviewing = false;
        
        // 保持游戏停止状态
        this.isGameRunning = false;
        
        // 强制重绘
        this.drawWithoutViewportMove();
        
        if (this.previewAbortController) {
          this.previewAbortController = null;
        }
      }
    }
  }

  // 中断预览方法
  public abortPreview(): void {
    if (this.isPreviewing) {
      // 只有当previewAbortController存在时才调用abort
      if (this.previewAbortController) {
        this.previewAbortController.abort();
        this.previewAbortController = null;
      }
      // 立即重置预览状态
      this.isPreviewing = false;
    }
  }

  // Check if there's an enemy at a specific position
  private isEnemyAtPosition(x: number, y: number): boolean {
    return this.enemies.some(enemy => 
      enemy.position.x === x && enemy.position.y === y && enemy.health > 0
    );
  }
  
  // Check if a position is valid (within bounds and not a wall)
  // Note: Position coordinates are in game grid coordinates (0,0) is top-left
  // Map coordinates are also in grid coordinates (0,0) is top-left
  private isValidPosition(x: number, y: number): boolean {
    // Check if within bounds
    if (x < 0 || x >= this.level.map[0].length || y < 0 || y >= this.level.map.length) {
      console.log(`Position (${x}, ${y}) is out of bounds`);
      return false;
    }
    
    // Check if it's a wall ('#' represents walls in our map)
    // Valid walkable positions are '.' (empty space)
    if (this.level.map[y][x] === '#') {
      console.log(`Position (${x}, ${y}) is a wall: '${this.level.map[y][x]}'`);
      return false;
    }
    
    console.log(`Position (${x}, ${y}) is valid: '${this.level.map[y][x]}'`);
    return true;
  }
  
  // Draw the game state
  public draw(): void {
    if (!this.initialized) {
      return;
    }
    
    // Clear the tilemap
    this.tilemap.removeChildren();
    
    // Draw the map
    this.drawMap();
    
    // Draw goals
    this.drawGoals();
    
    // Draw enemies if any
    if (this.enemies.length > 0) {
      this.drawEnemies();
    }
    
    // Draw coins if any
    if (this.level.coins) {
      this.drawCoins();
    }
    
    // Draw the robot last so it's on top
    this.drawRobot();
    if (this.robotSprite && !this.robotSprite.parent) {
      this.tilemap.addChild(this.robotSprite);
    }
    
    // Draw enemy health bars after everything else to ensure they're on top
    if (this.enemies.length > 0) {
      this.drawEnemyHealthBars();
    }
    
    // Update coin counter
    this.updateCoinCounter();
    
    // Center viewport on robot - disabled for fixed view
    // this.centerOnRobot();
  }
  
  // Center the viewport on the robot
  private centerOnRobot(): void {
    if (this.viewport) {
      const robotScreenX = this.robot.position.x * this.cellSize + this.cellSize / 2;
      const robotScreenY = this.robot.position.y * this.cellSize + this.cellSize / 2;
      this.viewport.moveCenter(robotScreenX, robotScreenY);
    }
  }
  
  // Fit the world to the viewport
  public fitWorld(): void {
    if (this.viewport) {
      this.viewport.fitWorld();
    }
  }
  
  // Delay function for animations
  public async delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms);
      
      // Check if game is still running periodically
      const checkInterval = setInterval(() => {
        if (!this.isGameRunning) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          reject(new Error('Game stopped'));
        }
      }, 50);
      
      // Clean up interval when timeout completes
      setTimeout(() => {
        clearInterval(checkInterval);
      }, ms);
    });
  }
  
  // Check if there's a coin at the given position and collect it
  private checkCoinCollection(x: number, y: number): void {
    if (!this.level.coins) return;
    
    const coinKey = `${x},${y}`;
    const coinIndex = this.level.coins.findIndex(coin => coin.x === x && coin.y === y);
    
    if (coinIndex !== -1 && !this.collectedCoins.has(coinKey)) {
      // Collect the coin
      this.collectedCoins.add(coinKey);
      console.log(`Collected coin at (${x}, ${y}). Total collected: ${this.collectedCoins.size}`);
      
      // Update coin counter display
      this.updateCoinCounter();
    }
  }
  
  // Check if player stepped on a health restore tile
  private checkHealthRestore(x: number, y: number): void {
    // Check if the position is within map bounds
    if (y >= 0 && y < this.level.map.length && x >= 0 && x < this.level.map[y].length) {
      const cell = this.level.map[y][x];
      if (cell === 'H') {
        // Restore player health to full
        if (this.robot.health !== undefined && this.robot.health < 6) {
          this.robot.health = 6;
          this.showToast('血量已回满！', 2000);
          console.log(`Health restored at (${x}, ${y})`);
        }
      }
    }
  }
  
  // Check win condition
  private checkWinCondition(): void {
    const winCondition = this.level.winCondition;
    
    // Check if required number of enemies are defeated (if specified)
    const enemiesDefeated = winCondition.requiredEnemies !== undefined ? 
      this.defeatedEnemies >= winCondition.requiredEnemies : true;
    
    // Check if robot is at the goal position (if specified)
    let isAtGoal = true;
    if (winCondition.goal) {
      isAtGoal = this.robot.position.x === winCondition.goal.x && 
               this.robot.position.y === winCondition.goal.y;
    }
    
    // Check if required coins are collected (if specified)
    let requiredCoinsCollected = true;
    if (winCondition.requiredCoins) {
      requiredCoinsCollected = this.collectedCoins.size >= winCondition.requiredCoins;
    }
    
    // Level is completed when all specified conditions are met
    if (enemiesDefeated && isAtGoal && requiredCoinsCollected) {
      console.log('Level completed!');
      this.showLevelComplete();
    }
  }
  
  // Show level complete message
  private showLevelComplete(): void {
    console.log(`Congratulations! You completed ${this.level.name}`);
    this.showToast(`Level Complete!`, 5000);
    this.levelCompleted = true;
    
    // Set level completed flag in localStorage
    localStorage.setItem(`level_${this.level.id}_completed`, 'true');
  }
  
  // Get current robot position (adjusted to be relative to the walkable area)
  public getCurrentPosition(): { x: number; y: number } {
    // Find the top-left walkable position in the map (this is (0,0) in relative coordinates)
    let minX = this.level.map[0].length;
    let minY = this.level.map.length;
    
    for (let y = 0; y < this.level.map.length; y++) {
      for (let x = 0; x < this.level.map[y].length; x++) {
        // Valid walkable positions are '.' or ' ' (empty space)
        if (this.level.map[y][x] === '.' || this.level.map[y][x] === ' ') {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
        }
      }
    }
    
    // Return position relative to the top-left walkable area
    return { 
      x: this.robot.position.x - minX, 
      y: this.robot.position.y - minY 
    };
  }
  
  // Get current X position
  public getXPosition(): number {
    return this.getCurrentPosition().x;
  }
  
  // Get current Y position
  public getYPosition(): number {
    return this.getCurrentPosition().y;
  }
  
  // Get player health
  public getPlayerHealth(): number {
    return this.robot.health || 0;
  }
  
  // Get player max health
  public getPlayerMaxHealth(): number {
    return 6; // Max health is always 6
  }
  
  // Say a message (show toast)
  public async sayMessage(message: string, duration: number = 3000): Promise<void> {
    this.showToast(message, duration * 1000); // Convert to milliseconds
    // Add a small delay to make the message visible
    await this.delay(duration * 250); // 250ms per unit of duration
  }
  
  // Stop the game execution
  public stopGame(resetAfterStop: boolean = true): void {
    console.log('Stopping game...');
    
    // Set game as not running first
    this.isGameRunning = false;
    
    // Clear any existing enemy move timeout to prevent continued movement
    if (this.enemyMoveTimeoutId !== null) {
      clearTimeout(this.enemyMoveTimeoutId);
      this.enemyMoveTimeoutId = null;
    }
    
    // Abort any preview operations
    if (this.isPreviewing) {
      this.abortPreview();
    }
    
    // Clear any pending timeouts by setting a flag
    this.isGameRunning = false;
    
    console.log('Game stopped and all operations cleared');
    
    // Reset the game state to prevent Blockly while loops from continuing
    if (resetAfterStop) {
      this.reset();
    }
  }
  
  // Change the current level
  public changeLevel(newLevel: Level): void {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    this.level = newLevel;
    this.reset();
    this.draw();
  }
  
  // Update the coin counter display
  private updateCoinCounter(): void {
    const coinCounter = document.getElementById('coin-counter');
    const collectedCoinsElement = document.getElementById('collected-coins');
    const totalCoinsElement = document.getElementById('total-coins');
    
    if (coinCounter && collectedCoinsElement && totalCoinsElement) {
      // Only show counter if there are data cards in the level
      if (this.level.coins && this.level.coins.length > 0) {
        coinCounter.style.display = 'block';
        collectedCoinsElement.textContent = this.collectedCoins.size.toString();
        totalCoinsElement.textContent = this.level.coins.length.toString();
      } else {
        coinCounter.style.display = 'none';
      }
    }
  }
  
  // Draw the map
  private drawMap(): void {
    // 第一阶段：绘制所有地面（包括空地和回血点）
    for (let y = 0; y < this.level.map.length; y++) {
      for (let x = 0; x < this.level.map[y].length; x++) {
        const cell = this.level.map[y][x];
        const screenX = x * this.cellSize;
        const screenY = y * this.cellSize;
        
        // 只绘制地面类型的单元格
        if (cell === '.' || cell === ' ' || cell === 'H') {
          let cellSprite: PIXI.Sprite | PIXI.Graphics;
          
          switch (cell) {
            case 'H': // Health restore tile
              if (this.textures.recoverHpGround) {
                cellSprite = new PIXI.Sprite(this.textures.recoverHpGround);
                cellSprite.width = this.cellSize;
                cellSprite.height = this.cellSize;
              } else {
                cellSprite = new PIXI.Graphics();
                cellSprite.rect(0, 0, this.cellSize, this.cellSize);
                cellSprite.fill(0x90EE90); // Light green background
                // Draw a cross symbol for health
                const crossSize = this.cellSize / 4;
                const crossX = this.cellSize / 2 - crossSize / 2;
                const crossY = this.cellSize / 2 - crossSize / 2;
                cellSprite.rect(crossX, crossY, crossSize, crossSize);
                cellSprite.fill(0x32CD32); // Lime green cross
              }
              break;
            case '.': // Empty space
            case ' ': // Empty space
            default:
              if (this.textures.ground) {
                cellSprite = new PIXI.Sprite(this.textures.ground);
                cellSprite.width = this.cellSize;
                cellSprite.height = this.cellSize;
              } else {
                cellSprite = new PIXI.Graphics();
                cellSprite.rect(0, 0, this.cellSize, this.cellSize);
                cellSprite.fill(0xeeeeee);
              }
          }
          
          cellSprite.x = screenX;
          cellSprite.y = screenY;
          this.tilemap.addChild(cellSprite);
        }
      }
    }
    
    // 第二阶段：绘制所有墙壁（每个墙壁下面都先铺地砖）
    for (let y = 0; y < this.level.map.length; y++) {
      for (let x = 0; x < this.level.map[y].length; x++) {
        const cell = this.level.map[y][x];
        const screenX = x * this.cellSize;
        const screenY = y * this.cellSize;
        
        // 只绘制墙壁
        if (cell === '#') {
          // 先绘制地砖作为背景
          let groundSprite: PIXI.Sprite | PIXI.Graphics;
          if (this.textures.ground) {
            groundSprite = new PIXI.Sprite(this.textures.ground);
            groundSprite.width = this.cellSize;
            groundSprite.height = this.cellSize;
          } else {
            groundSprite = new PIXI.Graphics();
            groundSprite.rect(0, 0, this.cellSize, this.cellSize);
            groundSprite.fill(0xeeeeee);
          }
          groundSprite.x = screenX;
          groundSprite.y = screenY;
          this.tilemap.addChild(groundSprite);
          
          // 再绘制墙壁
          let wallSprite: PIXI.Sprite | PIXI.Graphics;
          if (this.textures.wall) {
            wallSprite = new PIXI.Sprite(this.textures.wall);
            wallSprite.width = this.cellSize;
            wallSprite.height = this.cellSize;
          } else {
            wallSprite = new PIXI.Graphics();
            wallSprite.rect(0, 0, this.cellSize, this.cellSize);
            wallSprite.fill(0x888888);
          }
          
          wallSprite.x = screenX;
          wallSprite.y = screenY;
          this.tilemap.addChild(wallSprite);
        }
      }
    }
  }
  
  // Draw goals
  private drawGoals(): void {
    for (const goal of this.level.goals) {
      let goalSprite: PIXI.Sprite | PIXI.Graphics;
      
      if (this.textures.exit) {
        goalSprite = new PIXI.Sprite(this.textures.exit);
        goalSprite.width = this.cellSize;
        goalSprite.height = this.cellSize;
      } else {
        goalSprite = new PIXI.Graphics();
        goalSprite.rect(10, 10, this.cellSize - 20, this.cellSize - 20);
        goalSprite.fill(0x34A853);
      }
      
      goalSprite.x = goal.x * this.cellSize;
      goalSprite.y = goal.y * this.cellSize;
      this.tilemap.addChild(goalSprite);
    }
  }
  
  // Draw the robot
  private drawRobot(): void {
    // Remove old robot sprite if it exists
    if (this.robotSprite && this.robotSprite.parent) {
      this.robotSprite.parent.removeChild(this.robotSprite);
    }
    
    if (this.textures.playerRobot) {
      // Use player robot texture
      this.robotSprite = new PIXI.Sprite(this.textures.playerRobot);
      const scale = this.spriteScales.playerRobot || 0.8;
      
      this.robotSprite.width = this.robotSprite.width * scale;
      this.robotSprite.height = this.robotSprite.height * scale;
      this.robotSprite.anchor.set(0.5, 0.5);
      
      // 添加亮度调整
      this.robotSprite.tint = 0xCCFFFF; // 稍微偏蓝色调来提亮
      this.robotSprite.alpha = 1.0;
      
      // Rotate sprite based on direction
      if (this.robot.direction.dx === -1) { // Facing left
        this.robotSprite.scale.x = -scale;
      } else if (this.robot.direction.dy === 1) { // Facing down
        this.robotSprite.rotation = Math.PI / 2;
      } else if (this.robot.direction.dy === -1) { // Facing up
        this.robotSprite.rotation = -Math.PI / 2;
      }
    } else {
      // Fallback to geometric shape
      this.robotSprite = new PIXI.Graphics();
      
      // Draw robot body
      this.robotSprite.rect(5, 5, this.cellSize - 10, this.cellSize - 10);
      this.robotSprite.fill(0x4285F4);
      
      // Draw robot direction indicator
      const centerX = this.cellSize / 2;
      const centerY = this.cellSize / 2;
      const indicatorSize = 8;
      
      // Calculate indicator position based on direction
      let indicatorX = centerX;
      let indicatorY = centerY;
      
      if (this.robot.direction.dx === 1) { // Facing right
        indicatorX += this.cellSize / 3;
      } else if (this.robot.direction.dx === -1) { // Facing left
        indicatorX -= this.cellSize / 3;
      } else if (this.robot.direction.dy === 1) { // Facing down
        indicatorY += this.cellSize / 3;
      } else if (this.robot.direction.dy === -1) { // Facing up
        indicatorY -= this.cellSize / 3;
      }
      
      this.robotSprite.circle(indicatorX, indicatorY, indicatorSize);
      this.robotSprite.fill(0xffffff);
    }
    
    // Draw health bar above robot
    const healthBarWidth = this.cellSize - 10;
    const healthBarHeight = 4;
    const healthBarX = this.robot.position.x * this.cellSize + 5;
    const healthBarY = this.robot.position.y * this.cellSize - 10;
    
    // Background (red)
    const bgBar = new PIXI.Graphics();
    bgBar.rect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    bgBar.fill(0xff0000);
    this.tilemap.addChild(bgBar);
    
    // Foreground (green) - shows remaining health
    const fgBar = new PIXI.Graphics();
    const healthPercent = (this.robot.health || 0) / 6; // Max health is 6
    fgBar.rect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
    fgBar.fill(0x00ff00);
    this.tilemap.addChild(fgBar);
    
    // Set robot position
    if (this.textures.playerRobot) {
      // 对于有纹理的玩家，使用锚点居中
      this.robotSprite.x = this.robot.position.x * this.cellSize + this.cellSize / 2;
      this.robotSprite.y = this.robot.position.y * this.cellSize + this.cellSize / 2;
    } else {
      // 对于几何图形的玩家，使用左上角
      this.robotSprite.x = this.robot.position.x * this.cellSize;
      this.robotSprite.y = this.robot.position.y * this.cellSize;
    }
  }
  
  // Draw enemies
  private drawEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) {
        continue; // Skip defeated enemies
      }
      
      let enemySprite: PIXI.Sprite | PIXI.Graphics;
      
      if (this.textures.enemyRobot) {
        enemySprite = new PIXI.Sprite(this.textures.enemyRobot);
        const scale = this.spriteScales.enemyRobot || 0.8;
        
        enemySprite.width = enemySprite.width * scale;
        enemySprite.height = enemySprite.height * scale;
        enemySprite.anchor.set(0.5, 0.5);
        
        // 添加亮度调整
        enemySprite.tint = 0xFFFFCC; // 稍微偏黄色调来提亮
        enemySprite.alpha = 1.0;
        
        // Rotate sprite based on direction
        if (enemy.direction.dx === -1) { // Facing left
          enemySprite.scale.x = -scale;
        } else if (enemy.direction.dy === 1) { // Facing down
          enemySprite.rotation = Math.PI / 2;
        } else if (enemy.direction.dy === -1) { // Facing up
          enemySprite.rotation = -Math.PI / 2;
        }
      } else {
        enemySprite = new PIXI.Graphics();
        
        // Draw enemy body
        enemySprite.circle(this.cellSize / 2, this.cellSize / 2, this.cellSize / 2 - 5);
        enemySprite.fill(0xEA4335);
        
        // Draw enemy direction indicator
        const centerX = this.cellSize / 2;
        const centerY = this.cellSize / 2;
        const indicatorSize = 5;
        
        // Calculate indicator position based on direction
        let indicatorX = centerX;
        let indicatorY = centerY;
        
        if (enemy.direction.dx === 1) { // Facing right
          indicatorX += this.cellSize / 4;
        } else if (enemy.direction.dx === -1) { // Facing left
          indicatorX -= this.cellSize / 4;
        } else if (enemy.direction.dy === 1) { // Facing down
          indicatorY += this.cellSize / 4;
        } else if (enemy.direction.dy === -1) { // Facing up
          indicatorY -= this.cellSize / 4;
        }
        
        enemySprite.circle(indicatorX, indicatorY, indicatorSize);
        enemySprite.fill(0xffffff);
      }
      
      // 计算敌人位置（考虑锚点）
      if (this.textures.enemyRobot) {
        // 对于有纹理的敌人，使用锚点居中
        enemySprite.x = enemy.position.x * this.cellSize + this.cellSize / 2;
        enemySprite.y = enemy.position.y * this.cellSize + this.cellSize / 2;
      } else {
        // 对于几何图形的敌人，使用左上角
        enemySprite.x = enemy.position.x * this.cellSize;
        enemySprite.y = enemy.position.y * this.cellSize;
      }
      this.tilemap.addChild(enemySprite);
    }
  }
  
  // Draw health bars for enemies (called after all other entities)
  private drawEnemyHealthBars(): void {
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) {
        continue; // Skip defeated enemies
      }
      
      // Draw health bar above enemy
      const healthBarWidth = this.cellSize - 10;
      const healthBarHeight = 4;
      const healthBarX = enemy.position.x * this.cellSize + 5;
      const healthBarY = enemy.position.y * this.cellSize - 10;
      
      // Background (red)
      const bgBar = new PIXI.Graphics();
      bgBar.rect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
      bgBar.fill(0xff0000);
      this.tilemap.addChild(bgBar);
      
      // Foreground (green) - shows remaining health
      const fgBar = new PIXI.Graphics();
      const healthPercent = enemy.health / 2; // Max health is 2
      fgBar.rect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
      fgBar.fill(0x00ff00);
      this.tilemap.addChild(fgBar);
    }
  }
  
  // Draw coins
  private drawCoins(): void {
    if (!this.level.coins) return;
    
    for (const coin of this.level.coins) {
      // Skip if coin is already collected
      const coinKey = `${coin.x},${coin.y}`;
      if (this.collectedCoins.has(coinKey)) continue;
      
      let coinSprite: PIXI.Sprite | PIXI.Graphics;
      
      if (this.textures.coin) {
        coinSprite = new PIXI.Sprite(this.textures.coin);
        const scale = this.spriteScales.coin || 0.8;
        
        coinSprite.width = coinSprite.width * scale;
        coinSprite.height = coinSprite.height * scale;
        coinSprite.anchor.set(0.5, 0.5);
        
        // 添加亮度调整
        coinSprite.tint = 0xFFFF99; // 偏金黄色调来提亮
        coinSprite.alpha = 1.0;
      } else {
        coinSprite = new PIXI.Graphics();
        coinSprite.circle(this.cellSize / 2, this.cellSize / 2, this.cellSize / 4);
        coinSprite.fill(0xFBBC05);
      }
      
      // 计算金币位置（考虑锚点）
      if (this.textures.coin) {
        // 对于有纹理的金币，使用锚点居中
        coinSprite.x = coin.x * this.cellSize + this.cellSize / 2;
        coinSprite.y = coin.y * this.cellSize + this.cellSize / 2;
      } else {
        // 对于几何图形的金币，使用左上角
        coinSprite.x = coin.x * this.cellSize;
        coinSprite.y = coin.y * this.cellSize;
      }
      this.tilemap.addChild(coinSprite);
    }
  }
  
  // Resize the application
  public resize(width: number, height: number): void {
    if (this.app && this.viewport) {
      this.app.renderer.resize(width, height);
      this.viewport.resize(width, height);
      // Refit the world to the new viewport size
      this.viewport.fitWorld();
    }
  }
  
  // Start the game execution
  public startGame(): void {
    // 如果正在预览，则先终止预览
    if (this.isPreviewing) {
      this.abortPreview();
    }
    
    // Only start if not already running
    if (!this.isGameRunning) {
      // Reset enemy engagement tracking when starting a new game session
      this.hasAnyEnemyEngaged = false;
      
      this.isGameRunning = true;
      
      // Clear any existing timeout to prevent conflicts
      if (this.enemyMoveTimeoutId !== null) {
        clearTimeout(this.enemyMoveTimeoutId);
        this.enemyMoveTimeoutId = null;
      }
      
      // If there are enemies, start their movement immediately
      if (this.enemies.length > 0) {
        this.moveEnemies();
      }
    }
  }
  
  // Check if the game is running
  public isGameRunningState(): boolean {
    return this.isGameRunning;
  }
  
  // Show a toast message at the top-left corner of the game view
  public showToast(message: string, duration: number = 3000): void {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('robot-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'robot-toast-container';
      toastContainer.style.position = 'absolute';
      toastContainer.style.top = '10px';
      toastContainer.style.left = '10px';
      toastContainer.style.zIndex = '1000';
      toastContainer.style.display = 'flex';
      toastContainer.style.flexDirection = 'column';
      toastContainer.style.gap = '5px';
      
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.appendChild(toastContainer);
      }
    }
    
    // Create toast element
    const toastId = 'robot-toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    toast.style.color = '#00eeff';
    toast.style.padding = '10px 15px';
    toast.style.borderRadius = '4px';
    toast.style.fontFamily = 'Roboto Mono, monospace';
    toast.style.fontSize = '14px';
    toast.style.boxShadow = '0 0 10px rgba(0, 238, 255, 0.5)';
    toast.style.border = '1px solid #00eeff';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    toast.style.display = 'flex';
    toast.style.justifyContent = 'space-between';
    toast.style.alignItems = 'center';
    
    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);
    
    // Create timer span
    const timerSpan = document.createElement('span');
    timerSpan.style.marginLeft = '10px';
    timerSpan.style.color = '#ff2a6d';
    timerSpan.textContent = `${Math.ceil(duration / 1000)}s`;
    toast.appendChild(timerSpan);
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // Update timer and remove after duration
    const interval = setInterval(() => {
      const remaining = parseInt(timerSpan.textContent || '0');
      if (remaining > 1) {
        timerSpan.textContent = (remaining - 1) + 's';
      }
    }, 1000);
    
    setTimeout(() => {
      clearInterval(interval);
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode === toastContainer) {
          toastContainer.removeChild(toast);
        }
        // Remove container if empty
        if (toastContainer.children.length === 0) {
          toastContainer.remove();
        }
      }, 300);
    }, duration);
  }

  //////////////////////////////////////////////////////////////////////////////////////
  // PATHFINDING SYSTEM
  //////////////////////////////////////////////////////////////////////////////////////
  
  /**
   * Move to the nearest enemy position
   */
  public async moveToNearestEnemy(): Promise<void> {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    // Check if game is running
    if (!this.isGameRunning) {
      console.warn('Game is not running');
      return;
    }

    // Get the nearest enemy position
    const nearestEnemyX = this.getEnemyX();
    const nearestEnemyY = this.getEnemyY();
    
    // Check if there is a nearest enemy
    if (nearestEnemyX === -1 || nearestEnemyY === -1) {
      console.warn('No nearest enemy found');
      return;
    }
    
    console.log(`=== MOVE TO NEAREST ENEMY ===`);
    console.log(`Nearest enemy position: (${nearestEnemyX}, ${nearestEnemyY})`);
    
    // Create a grid for pathfinding
    const grid: number[][] = [];
    for (let y = 0; y < this.level.map.length; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.level.map[y].length; x++) {
        // 0 represents walkable positions, 1 represents obstacles
        if (this.level.map[y][x] === '#') {
          row.push(1); // Obstacle
        } else {
          row.push(0); // Walkable
        }
      }
      grid.push(row);
    }
    
    // Create EasyStar instance
    const easystar = new easystarjs.js();
    easystar.setGrid(grid);
    easystar.setAcceptableTiles([0]); // 0 represents walkable tiles
    
    // Find path using EasyStar
    const pathPromise = new Promise<{x: number, y: number}[]>((resolve, reject) => {
      easystar.findPath(
        this.robot.position.x, 
        this.robot.position.y, 
        nearestEnemyX, 
        nearestEnemyY, 
        (path) => {
          if (path === null) {
            reject(new Error('No path found to nearest enemy'));
          } else {
            resolve(path);
          }
        }
      );
      easystar.calculate();
    });
    
    let path: {x: number, y: number}[];
    try {
      path = await pathPromise;
    } catch (error: any) {
      console.warn(error.message);
      return;
    }
    
    console.log(`Found path with ${path.length} steps:`, path);
    
    // Follow the path step by step
    for (const node of path) {
      // Check if game is still running
      if (!this.isGameRunning) {
        console.warn('Game is not running');
        return;
      }
      
      // Calculate direction to move
      const dx = node.x - this.robot.position.x;
      const dy = node.y - this.robot.position.y;
      
      // Turn to face the next step direction
      console.log(`Turning to face direction (${dx}, ${dy})`);
      await this.turnToDirection(dx, dy);
      
      // Move forward
      console.log(`Moving forward to (${this.robot.position.x + dx}, ${this.robot.position.y + dy})`);
      await this.moveForward();
      
      console.log(`Current position: (${this.robot.position.x}, ${this.robot.position.y})`);
      
      // Check if we are adjacent to an enemy after moving
      if (this.isEnemyAdjacent()) {
        console.log('Reached adjacent to enemy, stopping movement');
        return;
      }
    }
    
    console.log('Finished moving to nearest enemy position');
  }
  
  /**
   * Move to a specific position with pathfinding
   * @param x Target X position (relative to top-left walkable area)
   * @param y Target Y position (relative to top-left walkable area)
   */
  public async moveToPosition(x: number, y: number): Promise<void> {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return;
    }
    
    // Check if game is running
    if (!this.isGameRunning) {
      console.warn('Game is not running');
      return;
    }

    // Find the top-left walkable position in the map
    let minX = this.level.map[0].length;
    let minY = this.level.map.length;
    
    for (let y = 0; y < this.level.map.length; y++) {
      for (let x = 0; x < this.level.map[y].length; x++) {
        // Valid walkable positions are '.' or ' ' (empty space)
        if (this.level.map[y][x] === '.' || this.level.map[y][x] === ' ') {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
        }
      }
    }
    
    // Convert relative coordinates to absolute map coordinates
    const absoluteX = minX + x;
    const absoluteY = minY + y;

    console.log(`=== MOVE TO POSITION ===`);
    console.log(`Moving from (${this.robot.position.x}, ${this.robot.position.y}) to relative (${x}, ${y}) which is absolute (${absoluteX}, ${absoluteY})`);
    
    // Validate absolute target position
    if (absoluteY < 0 || absoluteY >= this.level.map.length || absoluteX < 0 || absoluteX >= this.level.map[0].length) {
      console.warn(`Target position (${x}, ${y}) is out of bounds in absolute coordinates (${absoluteX}, ${absoluteY})`);
      return;
    }
    
    console.log(`Target cell content: '${this.level.map[absoluteY][absoluteX]}'`);
    console.log(`Target position valid: ${this.isValidPosition(absoluteX, absoluteY)}`);

    // Check if target position is valid (not a wall)
    if (!this.isValidPosition(absoluteX, absoluteY)) {
      console.warn(`Target position (${x}, ${y}) is a wall or out of bounds in absolute coordinates (${absoluteX}, ${absoluteY}). Content: '${this.level.map[absoluteY][absoluteX]}'`);
      return;
    }

    // Use BFS to find the shortest path to the target
    console.log(`Calling findPathBFS from (${this.robot.position.x}, ${this.robot.position.y}) to absolute (${absoluteX}, ${absoluteY})`);
    const path = this.findPathBFS(
      this.robot.position.x, 
      this.robot.position.y, 
      absoluteX, 
      absoluteY
    );

    // If no path is found, warn and return
    if (!path) {
      console.warn('No path found to target position');
      return;
    }

    console.log(`Found path with ${path.length} steps:`, path);

    // Follow the path step by step
    for (const step of path) {
      // Check if game is still running
      if (!this.isGameRunning) {
        console.warn('Game is not running');
        return;
      }
      
      // Turn to face the next step direction
      console.log(`Turning to face direction (${step.dx}, ${step.dy})`);
      await this.turnToDirection(step.dx, step.dy);
      
      // Move forward
      console.log(`Moving forward to (${this.robot.position.x + step.dx}, ${this.robot.position.y + step.dy})`);
      await this.moveForward();
      
      console.log(`Current position: (${this.robot.position.x}, ${this.robot.position.y})`);
    }
    
    console.log('Finished moving to target position');
  }
  
  /**
   * Find path using Breadth-First Search algorithm
   * @param startX Start X position
   * @param startY Start Y position
   * @param targetX Target X position
   * @param targetY Target Y position
   * @returns Array of direction steps or null if no path found
   */
  private findPathBFS(startX: number, startY: number, targetX: number, targetY: number): {dx: number, dy: number}[] | null {
    console.log(`Finding path from (${startX}, ${startY}) to (${targetX}, ${targetY})`);
    
    // If already at target, return empty path
    if (startX === targetX && startY === targetY) {
      console.log('Already at target, returning empty path');
      return [];
    }

    // Queue for BFS
    const queue: {x: number, y: number, path: {dx: number, dy: number}[]}[] = [];
    
    // Visited positions
    const visited = new Set<string>();
    
    // Directions: up, right, down, left
    const directions = [
      {dx: 0, dy: -1},  // Up
      {dx: 1, dy: 0},   // Right
      {dx: 0, dy: 1},   // Down
      {dx: -1, dy: 0}   // Left
    ];
    
    // Add starting position to queue
    const startKey = `${startX},${startY}`;
    visited.add(startKey);
    queue.push({
      x: startX,
      y: startY,
      path: []
    });
    
    console.log(`Starting BFS with queue size: ${queue.length}`);
    
    // BFS loop
    while (queue.length > 0) {
      const current = queue.shift()!;
      console.log(`Processing node (${current.x}, ${current.y}) with path length: ${current.path.length}`);
      
      // Check if we reached the target
      if (current.x === targetX && current.y === targetY) {
        console.log(`Found path to target with ${current.path.length} steps`);
        return current.path;
      }
      
      // Explore neighbors
      for (const dir of directions) {
        const newX = current.x + dir.dx;
        const newY = current.y + dir.dy;
        const key = `${newX},${newY}`;
        
        // Debug information
        console.log(`  Checking neighbor (${newX}, ${newY})`);
        
        // Check if the new position is valid and not visited
        const isValid = this.isValidPosition(newX, newY);
        // Only check for enemy collision if it's not the target position
        const isTargetPosition = (newX === targetX && newY === targetY);
        const hasEnemy = !isTargetPosition && this.isEnemyAtPosition(newX, newY);
        const isVisited = visited.has(key);
        
        console.log(`    isValid: ${isValid}, hasEnemy: ${hasEnemy}, isVisited: ${isVisited}, isTarget: ${isTargetPosition}`);
        
        if (isValid && !hasEnemy && !isVisited) {
          // Check if we reached the target
          if (newX === targetX && newY === targetY) {
            console.log(`  Found path to target with ${current.path.length + 1} steps`);
            return [...current.path, {dx: dir.dx, dy: dir.dy}];
          }
          
          // Mark as visited
          visited.add(key);
          
          // Create new path to this neighbor
          const newPath = [...current.path, {dx: dir.dx, dy: dir.dy}];
          
          // Add to queue
          queue.push({
            x: newX,
            y: newY,
            path: newPath
          });
          
          console.log(`    Added (${newX}, ${newY}) to queue, queue size: ${queue.length}`);
        } else {
          if (!isValid) {
            console.log(`    Position (${newX}, ${newY}) is invalid`);
          }
          if (hasEnemy) {
            console.log(`    Position (${newX}, ${newY}) has enemy`);
          }
          if (isVisited) {
            console.log(`    Position (${newX}, ${newY}) already visited`);
          }
        }
      }
    }
    
    // No path found
    console.log('No path found to target position');
    return null;
  }
  

  
  /**
   * Helper method to turn the robot to face a specific direction
   * @param targetDx Target X direction (-1, 0, or 1)
   * @param targetDy Target Y direction (-1, 0, or 1)
   */
  private async turnToDirection(targetDx: number, targetDy: number): Promise<void> {
    // Normalize the target direction to ensure it's one of the valid directions
    // This helps prevent floating point errors or other issues
    if (targetDx !== 0) {
      targetDx = targetDx > 0 ? 1 : -1;
    }
    if (targetDy !== 0) {
      targetDy = targetDy > 0 ? 1 : -1;
    }
    
    // Check if already facing the correct direction
    if (this.robot.direction.dx === targetDx && this.robot.direction.dy === targetDy) {
      console.log(`Already facing direction (${targetDx}, ${targetDy})`);
      return;
    }

    // Calculate current direction as a vector
    const currentDir = { dx: this.robot.direction.dx, dy: this.robot.direction.dy };

    // Calculate target direction as a vector
    const targetDir = { dx: targetDx, dy: targetDy };

    console.log(`Current direction: (${currentDir.dx}, ${currentDir.dy}), Target direction: (${targetDir.dx}, ${targetDir.dy})`);

    // Check if we need to turn left (counter-clockwise)
    const leftTurnDir = { dx: currentDir.dy, dy: -currentDir.dx };
    if (leftTurnDir.dx === targetDir.dx && leftTurnDir.dy === targetDir.dy) {
      console.log('Turning left');
      await this.turnLeft();
      return;
    }

    // Check if we need to turn right (clockwise)
    const rightTurnDir = { dx: -currentDir.dy, dy: currentDir.dx };
    if (rightTurnDir.dx === targetDir.dx && rightTurnDir.dy === targetDir.dy) {
      console.log('Turning right');
      await this.turnRight();
      return;
    }

    // If we need to turn 180 degrees, choose the shortest path
    // Calculate the direction after turning left twice or right twice
    const oppositeDir = { dx: -currentDir.dx, dy: -currentDir.dy };
    if (oppositeDir.dx === targetDir.dx && oppositeDir.dy === targetDir.dy) {
      console.log('Turning 180 degrees');
      // For 180 degree turn, choose the direction that requires fewer steps based on current orientation
      // Prefer turning right if facing right or up, left if facing left or down
      if (currentDir.dx === 1 || currentDir.dy === -1) {
        await this.turnRight();
        await this.turnRight();
      } else {
        await this.turnLeft();
        await this.turnLeft();
      }
      return;
    }

    // This should never happen with valid direction vectors
    console.warn(`Failed to determine turn direction from (${currentDir.dx}, ${currentDir.dy}) to (${targetDir.dx}, ${targetDir.dy})`);
  }
  
  //////////////////////////////////////////////////////////////////////////////////////

  // Check if there's an enemy adjacent to the robot
  public isEnemyAdjacent(): boolean {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return false;
    }

    // Check positions adjacent to robot (up, right, down, left)
    const adjacentPositions = [
      { x: this.robot.position.x, y: this.robot.position.y - 1 }, // Up
      { x: this.robot.position.x + 1, y: this.robot.position.y },   // Right
      { x: this.robot.position.x, y: this.robot.position.y + 1 },   // Down
      { x: this.robot.position.x - 1, y: this.robot.position.y }    // Left
    ];

    // Check if any enemy is at an adjacent position
    for (const pos of adjacentPositions) {
      const enemyAtPosition = this.enemies.some(enemy => 
        enemy.position.x === pos.x && 
        enemy.position.y === pos.y && 
        enemy.health > 0
      );
      
      if (enemyAtPosition) {
        return true;
      }
    }

    return false;
  }

  // Get the X coordinate of the nearest enemy
  public getEnemyX(): number {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return -1;
    }

    // Find the nearest enemy
    let nearestEnemy: Enemy | null = null;
    let minDistance = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue; // Skip defeated enemies

      const dx = enemy.position.x - this.robot.position.x;
      const dy = enemy.position.y - this.robot.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy;
      }
    }

    // Return the X coordinate of the nearest enemy, or -1 if no enemy found
    return nearestEnemy ? nearestEnemy.position.x : -1;
  }

  // Get the Y coordinate of the nearest enemy
  public getEnemyY(): number {
    if (!this.initialized) {
      console.warn('Game not initialized yet');
      return -1;
    }

    // Find the nearest enemy
    let nearestEnemy: Enemy | null = null;
    let minDistance = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue; // Skip defeated enemies

      const dx = enemy.position.x - this.robot.position.x;
      const dy = enemy.position.y - this.robot.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy;
      }
    }

    // Return the Y coordinate of the nearest enemy, or -1 if no enemy found
    return nearestEnemy ? nearestEnemy.position.y : -1;
  }
  
  // Method to load a new level
  public loadLevel(level: Level): void {
    // Stop any running game
    this.stopGame();
    
    // Reset level completion flag
    this.levelCompleted = false;
    
    // Update level data
    this.level = level;
    
    // Reset game state
    this.collectedCoins.clear();
    this.defeatedEnemies = 0;
    this.robot = {
      position: { ...level.robotStart.position },
      direction: { ...level.robotStart.direction },
      health: 6
    };
    
    // Update enemies
    if (level.enemies) {
      this.enemies = level.enemies.map(enemy => ({
        ...enemy,
        health: 2
      }));
    } else {
      this.enemies = [];
    }
    
    // Reinitialize the game display
    this.initializeGameDisplay();
  }
  
  // Method to check if level is completed
  public isLevelCompleted(): boolean {
    return this.levelCompleted;
  }
  
  // Update the initializeGameDisplay method to be public
  public initializeGameDisplay(): void {
    // Clear existing display
    if (this.tilemap) {
      this.tilemap.destroy({ children: true });
    }
    
    // Create new tilemap container
    this.tilemap = new PIXI.Container();
    this.viewport.addChild(this.tilemap);
    
    // Initialize robot sprite
    this.robotSprite = new PIXI.Graphics();
    
    // Draw the map
    this.drawMap();
    
    // Draw coins
    this.drawCoins();
    
    // Draw enemies
    this.drawEnemies();
    
    // Draw robot
    this.drawRobot();
    
    // Update coin counter display
    this.updateCoinCounter();
  }

  // Draw the game without moving the viewport
  public drawWithoutViewportMove(): void {
    // Initialize if not already done
    if (!this.viewport) {
      console.warn('Viewport not initialized');
      return;
    }
    
    // Clear existing display
    if (this.tilemap) {
      this.tilemap.destroy({ children: true });
    }
    
    // Create new tilemap container
    this.tilemap = new PIXI.Container();
    this.viewport.addChild(this.tilemap);
    
    // Initialize robot sprite
    this.robotSprite = new PIXI.Graphics();
    
    // Draw the map
    this.drawMap();
    
    // Draw coins
    this.drawCoins();
    
    // Draw enemies
    this.drawEnemies();
    
    // Draw robot
    this.drawRobot();
    
    // Add robot sprite to tilemap
    this.tilemap.addChild(this.robotSprite);
    
    // Update coin counter display
    this.updateCoinCounter();
  }


  
  // Initialize audio system
  private initializeAudio(): void {
    try {
      this.attackSound = new Audio('./assets/attack.ogg');
      this.attackSound.preload = 'auto';
      this.attackSound.volume = 0.5;
      console.log('Audio initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
      this.soundEnabled = false;
    }
  }
  
  // Play attack sound
  private playAttackSound(): void {
    if (this.soundEnabled && this.attackSound) {
      try {
        // Reset audio to beginning and play
        this.attackSound.currentTime = 0;
        this.attackSound.play().catch(error => {
          console.warn('Failed to play attack sound:', error);
        });
      } catch (error) {
        console.warn('Error playing attack sound:', error);
      }
    }
  }
  
  // Toggle sound on/off
  public toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    console.log('Sound enabled:', this.soundEnabled);
  }
  
  // Get sound status
  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }
}