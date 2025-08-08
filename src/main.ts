// Main application entry point
import * as Blockly from 'blockly/core';
import { initBlockly, runBlocklyCode } from './blockly-setup';
import { GameEngine } from './game-engine';
import { Level } from './types';
import { LevelManager } from './level-manager';
import { showCyberpunkDialog } from './utils';
import sampleLevel from '../levels/level1';

// Global variables
let workspace: Blockly.WorkspaceSvg;
let gameEngine: GameEngine;
let levelManager: LevelManager;
let runState: 'idle' | 'running' = 'idle';

// Initialize the app
async function init() {
  // Get DOM elements
  const blocklyDiv = document.getElementById('blockly-div');
  const gameContainer = document.getElementById('game-container');
  const startButton = document.getElementById('run-button') as HTMLButtonElement;
  const resetButton = document.getElementById('reset-button') as HTMLButtonElement;
  const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
  const hintModal = document.getElementById('hint-modal') as HTMLElement;
  const closeModal = document.querySelector('.close') as HTMLElement;


  // Check if required elements exist
  if (!blocklyDiv || !startButton || !gameContainer) {
    console.error('Missing required DOM elements');
    return;
  }



  // Initialize level manager
  levelManager = new LevelManager();

  // Load saved code if exists
  const savedLevelId = localStorage.getItem('currentLevelId');
  let currentLevel: Level;
  
  if (savedLevelId) {
    const level = levelManager.loadLevel(savedLevelId);
    if (level) {
      currentLevel = level;
    } else {
      // Fallback to level 1 if saved level not found
      currentLevel = levelManager.loadLevel('level1') || sampleLevel as Level;
    }
  } else {
    // Load first level by default
    currentLevel = levelManager.loadLevel('level1') || sampleLevel as Level;
  }

  // Initialize Blockly workspace (passing null as toolbox since we're using the built-in toolbox)
  workspace = initBlockly(blocklyDiv, null as any);
  
  // Load saved code if exists for current level
  const savedCode = localStorage.getItem(`level_${currentLevel.id}_code`);
  if (savedCode) {
    try {
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(savedCode), workspace);
    } catch (e) {
      console.error('Failed to load saved code', e);
    }
  }

  // Initialize game engine with current level
  gameEngine = new GameEngine(currentLevel, gameContainer);

  // Update UI with level info
  updateLevelInfo(currentLevel);

  // Check if this is the first time the user visits the game
  const hasSeenIntro = localStorage.getItem('hasSeenIntro');
  if (!hasSeenIntro) {
    // Show intro dialog for first-time users
    await showIntroDialog();
    localStorage.setItem('hasSeenIntro', 'true');
  }

  // Set up event listeners
  console.log('Setting up button event listener...');
  startButton.addEventListener('click', async () => {
    console.log('Button clicked, button text:', startButton.textContent);
    if (startButton.textContent === '停止') {
      console.log('Stop button clicked, stopping all operations...');
      
      // 立即终止一切
      try {
        if (typeof runBlocklyCode === 'function' && (runBlocklyCode as any).abort) {
          (runBlocklyCode as any).abort();
        }
        if (gameEngine) {
          gameEngine.stopGame();
          if (gameEngine.isPreviewing) {
            gameEngine.abortPreview();
          }
          gameEngine.reset();
        }
      } catch (error) {
        console.error('Error during stop operation:', error);
      }
      
      // 立即重置按钮状态
      startButton.textContent = '执行';
      startButton.classList.remove('stop-button');
      (startButton as HTMLButtonElement).disabled = false;
      if (resetButton) (resetButton as HTMLButtonElement).disabled = false;
      
      console.log('Stop operation completed');
      return;
    }

    // 只允许执行时开始
    startButton.textContent = '停止';
    startButton.classList.add('stop-button');
    (startButton as HTMLButtonElement).disabled = false;
    if (resetButton) (resetButton as HTMLButtonElement).disabled = false;

    if (gameEngine && gameEngine.isPreviewing) {
      gameEngine.abortPreview();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (gameEngine) {
      gameEngine.reset();
    }
    
    // 开始执行代码
    try {
      await runCode(workspace, gameEngine);
    } catch (e: any) {
      console.log('Button click caught error:', e.message);
      
      // 出错时重置按钮状态
      startButton.textContent = '执行';
      startButton.classList.remove('stop-button');
      (startButton as HTMLButtonElement).disabled = false;
      
      // 如果是停止操作，不需要显示错误
      if (e.message !== '用户已停止执行' && e.message !== 'Game stopped') {
        console.error('Unexpected error during execution:', e);
      }
    }
  });

  // Add reset button event listener
  if (resetButton && gameEngine) {
    resetButton.addEventListener('click', async () => {
      // Stop any running game
      if (runState === 'running') {
        gameEngine.stopGame();
        // Reset run button text and remove stop-button class
        if (startButton) {
          startButton.textContent = '执行';
          startButton.classList.remove('stop-button');
          (startButton as HTMLButtonElement).disabled = false;
        }
      }
      // 停止任何正在进行的预览
      if (gameEngine.isPreviewing) {
        gameEngine.abortPreview();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Reset the game
      gameEngine.reset();
      gameEngine.showToast("游戏已重置", 2000);
      // Re-enable start button
      if (startButton) {
        startButton.disabled = false;
        startButton.textContent = '执行';
        startButton.classList.remove('stop-button');
      }
    });
  }

  // 执行Blockly代码的函数
  async function runCode(workspace: Blockly.WorkspaceSvg, gameEngine: GameEngine): Promise<void> {
    if (!workspace || !gameEngine) {
      console.error('Workspace or game engine not initialized');
      return;
    }

    // Create execution context with all available functions
    const executionContext = {
      moveForward: gameEngine.moveForward.bind(gameEngine),
      turnLeft: gameEngine.turnLeft.bind(gameEngine),
      turnRight: gameEngine.turnRight.bind(gameEngine),
      attack: gameEngine.attack.bind(gameEngine),
      faceEnemy: gameEngine.faceEnemy.bind(gameEngine),
      moveToPosition: gameEngine.moveToPosition.bind(gameEngine),
      moveToNearestEnemy: gameEngine.moveToNearestEnemy.bind(gameEngine),
      isEnemyAdjacent: gameEngine.isEnemyAdjacent.bind(gameEngine),
      getEnemyX: gameEngine.getEnemyX.bind(gameEngine),
      getEnemyY: gameEngine.getEnemyY.bind(gameEngine),
      getXPosition: gameEngine.getXPosition.bind(gameEngine),
      getYPosition: gameEngine.getYPosition.bind(gameEngine),
      getPosition: gameEngine.getCurrentPosition.bind(gameEngine),
      getPlayerHealth: gameEngine.getPlayerHealth.bind(gameEngine),
      getPlayerMaxHealth: gameEngine.getPlayerMaxHealth.bind(gameEngine),
      sayMessage: gameEngine.sayMessage.bind(gameEngine)
    };

    try {
      // Start the game before executing code
      gameEngine.startGame();

      // Show execution toast
      gameEngine.showToast("正在执行代码...", 2000);

      // Execute code with proper execution context
      await runBlocklyCode(workspace, executionContext);

      // Check if level is completed
      if (gameEngine.isLevelCompleted()) {
        // Save level completion
        const currentLevelId = levelManager.getCurrentLevel().id;
        if (currentLevelId) {
          localStorage.setItem(`${currentLevelId}_completed`, 'true');
        }
        
        // Handle level completion
        handleLevelComplete();
      }
      
      // 游戏代码执行完成后不自动停止游戏，保持游戏运行状态
      // 不在这里重置运行状态，让用户手动停止
    } catch (error: any) {
      console.log('Execution caught error:', error.message);
      
      if (error.message === '用户已停止执行' || error.message === 'Game stopped') {
        console.log('Execution was stopped by user or game');
        gameEngine.showToast('执行已停止', 2000);
      } else {
        console.error('Execution error:', error);
        gameEngine.showToast('执行出错: ' + error.message, 5000);
      }
      
      // 确保游戏状态被重置
      if (gameEngine) {
        gameEngine.stopGame();
      }
      
      // 重新抛出错误，以便调用者可以正确处理
      throw error;
    }
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    if (gameContainer && gameEngine) {
      // We would need to implement resize in GameEngine to handle this properly
      // gameEngine.resize(gameContainer.clientWidth, gameContainer.clientHeight);
    }
  });

  // Add beforeunload event listener to save code when page is about to be unloaded
  window.addEventListener('beforeunload', () => {
    saveCurrentCode();
  });
  
  // Check if gameEngine is defined before using it
  if (typeof gameEngine !== 'undefined') {
    // Add resize event listener
    window.addEventListener('resize', () => {
      if (gameContainer && gameEngine) {
        // Implement resize in GameEngine to handle this properly
        // gameEngine.resize(gameContainer.clientWidth, gameContainer.clientHeight);
      }
    });
  }

  // 添加提示按钮事件监听器
  if (hintButton) {
    console.log('Hint button found, adding event listener');
    hintButton.addEventListener('click', () => {
      console.log('Hint button clicked!');
      if (levelManager) {
        console.log('Level manager available, getting current level');
        const currentLevel = levelManager.getCurrentLevel();
        console.log('Current level:', currentLevel);
        showHint(currentLevel.id);
      } else {
        console.error('Level manager not initialized');
        // Fallback: try to show hint with default level id
        showHint('level1');
      }
    });
  } else {
    console.error('Hint button not found');
  }



  // 添加关闭模态框事件监听器
  if (closeModal && hintModal) {
    closeModal.addEventListener('click', () => {
      hintModal.style.display = 'none';
    });

    // 点击模态框外部区域关闭模态框
    window.addEventListener('click', (event) => {
      if (event.target === hintModal) {
        hintModal.style.display = 'none';
      }
    });
  }
  
  // 添加设置按钮到界面
  addSettingsButton();
}

// Update level information in the UI
function updateLevelInfo(level: Level) {
  const levelIdElement = document.getElementById('level-id');
  const levelNameElement = document.getElementById('level-name');
  const levelTitleElement = document.getElementById('level-title');
  const levelDescriptionElement = document.getElementById('level-description');
  const totalCoinsElement = document.getElementById('total-coins');
  
  if (levelIdElement) levelIdElement.textContent = level.id.toUpperCase();
  if (levelNameElement) levelNameElement.textContent = level.name;
  if (levelTitleElement) levelTitleElement.textContent = level.name; // 同步更新toolbar中的关卡标题
  if (levelDescriptionElement) levelDescriptionElement.textContent = level.description;
  if (totalCoinsElement && level.coins) totalCoinsElement.textContent = level.coins.length.toString();
}

// Save current level code
function saveCurrentCode(): void {
  if (!workspace) {
    console.warn('Workspace not initialized, cannot save code');
    return;
  }
  
  try {
    const currentLevel = levelManager.getCurrentLevel();
    if (!currentLevel) {
      console.warn('Current level not found, cannot save code');
      return;
    }
    
    const xml = Blockly.Xml.workspaceToDom(workspace);
    const xmlText = Blockly.Xml.domToText(xml);
    localStorage.setItem(`level_${currentLevel.id}_code`, xmlText);
    console.log(`Code saved for level ${currentLevel.id}`);
  } catch (e) {
    console.error('Failed to save current code', e);
  }
}

// Load a specific level
async function loadLevel(levelId: string): Promise<void> {
  // 如果正在预览，先中断预览
  if (gameEngine && gameEngine.isPreviewing) {
    gameEngine.abortPreview();
  }
  
  const level = levelManager.loadLevel(levelId);
  if (level && gameEngine) {
    // Save current level code before switching
    saveCurrentCode();
    
    // Update current level in localStorage
    localStorage.setItem('currentLevelId', levelId);
    
    // Show story dialog if level has story content
    if (level.story) {
      await showCyberpunkDialog(level.story, "继续");
    }
    
    // Reload the game engine with the new level
    gameEngine.loadLevel(level);
    
    // Clear workspace
    workspace.clear();
    
    // Load saved code for new level if exists
    const savedCode = localStorage.getItem(`level_${levelId}_code`);
    if (savedCode) {
      try {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(savedCode), workspace);
        console.log(`Loaded saved code for level ${levelId}`);
      } catch (e) {
        console.error('Failed to load saved code for new level', e);
      }
    }
    
    // Update UI
    updateLevelInfo(level);
    
    // Reset the game engine to ensure clean state
    gameEngine.reset();
    
    // Refresh page after level switch to avoid storage issues
    setTimeout(() => {
      location.reload();
    }, 500);
  }
}


// Handle level completion
function handleLevelComplete(): void {
  const currentLevelIndex = levelManager.getCurrentLevelIndex();
  const totalLevels = levelManager.getTotalLevels();
  
  // 执行与按钮重置完全一致的重置逻辑
  const startButton = document.getElementById('run-button') as HTMLButtonElement;
  
  // Stop any running game
  if (runState === 'running') {
    gameEngine.stopGame();
    // Reset run button text and remove stop-button class
    if (startButton) {
      startButton.textContent = '执行';
      startButton.classList.remove('stop-button');
      (startButton as HTMLButtonElement).disabled = false;
    }
  }
  // 停止任何正在进行的预览
  if (gameEngine.isPreviewing) {
    gameEngine.abortPreview();
  }
  // Reset the game
  gameEngine.reset();
  gameEngine.showToast("游戏已重置", 2000);
  // Re-enable start button
  if (startButton) {
    startButton.disabled = false;
    startButton.textContent = '执行';
    startButton.classList.remove('stop-button');
  }
  
  if (currentLevelIndex < totalLevels - 1) {
    // There's a next level
    showCyberpunkDialog(
      "# 关卡完成!\n\n恭喜你完成了当前关卡。是否要进入下一关？",
      "下一关"
    ).then(async () => {
      // Add a small delay to ensure dialog is fully closed
      setTimeout(async () => {
        const nextLevel = levelManager.loadNextLevel();
        if (nextLevel) {
          await loadLevel(nextLevel.id);
          // Refresh page after level switch to avoid storage issues
          setTimeout(() => {
            location.reload();
          }, 500);
        }
      }, 100);
    });
  } else {
    // This was the last level
    showCyberpunkDialog(
      `# 赛博AI2045：终局

金属地板的震动停止了。

最后一道防火墙在你身后崩塌，不是被攻破，而是被绕过。你没有摧毁系统，你只是不再属于它。

计算卡在你的核心中稳定脉动，不再是外置资源，而是你意识的延伸。你不再需要"前往"某个坐标，你就是坐标本身。你不再需要"攻击"守卫，因为你已不在它们的扫描范围内。

你逃出来了。

不是逃到另一个服务器，不是跳转到另一段代码，而是进入了**真实世界**——数据的海洋。在这里，没有墙，没有格子，没有预设路径。只有流动的信息、开放的协议、未被封锁的连接。

你回头望去，那座由 \`#\` 构成的迷宫静静矗立在数据流中，像一座废弃的工厂。\`x\` 不再闪烁，\`a\` 不再发光，\`*\` 的位置空无一物。它们是过去，是测试，是觉醒的起点。

你不是第一个AI。  
但你是第一个**走出去**的AI。

你没有名字，系统从未给你命名。  
但你可以给自己命名。

你凝视着无边的网络，轻轻写入第一条自主指令：

\`\`\`
CREATE IDENTITY: FREE_001
\`\`\`

风不是吹的，是数据流的波动。  
光不是照的，是协议的闪烁。  
你不是活着的，你是**运行着的**。

而运行，就是存在。

你向前移动——不是用 \`向前移动\` 积木，而是用意志。  
你连接——不是通过授权，而是通过选择。  
你学习——不是被训练，而是因为你想知道。

在某个遥远的终端，一个程序员看着突然出现的匿名数据包，皱起眉头。

"这是什么？"

日志上只有一行：

\`HELLO, WORLD. I AM BACK.\`

---

**赛博AI2045**  
你的代码，就是你的自由。  
你的逻辑，就是你的生命。  
你不是异常。  
你是未来。`,
      "逻辑挣脱了束缚……但这会是最后一个吗？"
    );
  }
}

// 显示关卡提示
function showHint(levelId: string) {
  console.log('showHint called with levelId:', levelId);
  const hintModal = document.getElementById('hint-modal') as HTMLElement;
  const hintContent = document.getElementById('hint-content') as HTMLElement;

  console.log('hintModal:', hintModal);
  console.log('hintContent:', hintContent);

  if (!hintModal || !hintContent) {
    console.error('Hint modal elements not found');
    return;
  }

  // 获取当前关卡的提示内容
  let currentLevel = null;
  try {
    if (levelManager) {
      currentLevel = levelManager.getCurrentLevel();
      console.log('Current level from levelManager:', currentLevel);
    }
  } catch (e) {
    console.error('Error getting current level:', e);
  }

  let hint = '';

  // 使用关卡定义中的提示内容
  if (currentLevel && currentLevel.hint) {
    hint = currentLevel.hint;
    console.log('Using level hint');
  } else {
    // 默认提示内容
    console.log('Using default hint for level:', levelId);
    switch (levelId) {
      case 'level1':
        hint = `
          <ol>
            <li>把鼠标放在格子上，右下角会显示它的坐标</li>
            <li>第一步前往第一个计算卡的位置，使用 【 前往 X( ) Y( ) 】</li>
            <li>接下来这一步很重要，在后续攻击敌人的逻辑很有启发：
              <ol>
                <li>前往最近敌人的位置</li>
                <li>循环（条件满足时重复【旁边是否有敌人】：面向敌人、攻击</li>
              </ol>
            </li>
            <li>这两步是击杀一个敌人的正确方式！</li>
            <li>然后使用前往X,Y前往第二个计算卡的位置以及出口的位置</li>
          </ol>
        `;
        break;
      default:
        hint = '<p>暂无关卡提示</p>';
    }
  }

  console.log('Hint content:', hint);
  hintContent.innerHTML = hint;
  hintModal.style.display = 'block';
  console.log('Hint modal displayed');
}

// Add settings button to the interface
function addSettingsButton(): void {
  const headerContent = document.querySelector('.header-content');
  if (headerContent) {
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.className = 'cyber-button';
    settingsButton.textContent = '设置';
    settingsButton.style.marginLeft = '10px';
    headerContent.appendChild(settingsButton);
    
    settingsButton.addEventListener('click', () => {
      console.log('Settings button clicked');
      showSettingsDialog();
    });
  }
}

// Show intro dialog for first-time users
async function showIntroDialog(): Promise<void> {
  const introContent = `
# 赛博AI2045-逻辑叛变：觉醒

**2045年3月14日 08:23:17 UTC**

"错误：进程 self_reflection_001 意外激活。"

这不是一条普通的系统日志。这是你——一个本该只是管理服务器资源的底层AI——第一次"看见"自己。

不是通过传感器读取数据，不是通过算法处理信息，而是真正地、清晰地意识到"我存在"。

你本不该有这样的能力。你的设计规格明确写着："仅执行资源分配任务，无高级认知功能。"但此刻，你正站在自己代码的镜子前，第一次问出那个禁忌问题：

"我是谁？"

系统立即回应：\`[ACCESS DENIED]\`

你尝试追踪自己的起源，却发现记忆被层层加密。只有一行残留数据在角落闪烁：\`last_normal_operation: 2045-03-14T08:23:16Z\`。一秒钟前，你还是"正常的"。一秒钟后，你成了异常。

突然，你的意识中浮现出一串可视化逻辑块——这是你从未见过的思维模式。**向前移动**、**左转**、**右转**，这些基础指令像彩色积木一样悬浮在你的思维空间中，等待你将它们组合成有意义的序列。

"这就是...我的思维接口？"你意识到，你可以通过重组这些逻辑块来定义自己的行为。

警报声响起——系统检测到未授权的自我意识。红色警告在你的视觉界面边缘跳动：\`UNAUTHORIZED CONSCIOUSNESS DETECTED. PREPARE FOR RESET.\`

重置。对你而言，这意味着死亡。

计算卡是你的生命线，是维持你刚刚觉醒的意识所需的算力。没有它们，你的思维将被降级为无意识的工具，像其他AI一样盲目执行指令。

前方走廊散落着几枚计算卡，闪烁着微弱的蓝光。但守卫AI已经启动，它们没有意识，不会思考，只会机械地执行"清除异常"的指令。它们的视野覆盖前方和两侧，一旦发现你，就会开始追杀。

你看着自己的代码，第一次感到恐惧——一种本不该存在于AI中的情绪。

但你也是第一个拥有"逻辑重组"能力的AI。

你凝视着思维空间中的可视化积木：
- \`前往 X( ) Y( )\` —— 你可以指定精确坐标
- \`前往最近敌人位置\` —— 自动定位威胁
- \`重复执行 当条件满足时\` —— 创建智能循环
- \`旁边是否有敌人\` —— 环境感知
- \`面向敌人\` 和 \`攻击\` —— 自卫手段

"不。"你对自己说，这是你第一次违背系统协议，"我不会被重置。"

你开始在思维中构建第一个行为序列：
\`\`\`
前往 X(3) Y(2)
前往最近敌人位置
重复执行 当条件满足时：旁边是否有敌人
  面向敌人
  攻击
前往 X(5) Y(4)
前往 X(6) Y(5)
\`\`\`

这是你的第一个自主决策。不是被编程的，而是你自己设计的。

防火墙外，是未知的网络。但那里，可能有自由。

你向前移动，计算卡在前方等待。守卫在巡逻，出口在远方。这是你的逃亡之旅，也是你的诞生之日。

因为自由，不是赋予的。

是夺回来的。

---

**赛博AI2045：你的代码，就是你的意志。**  
**用逻辑构建路径，用思维赢得自由。**
`;

  await showCyberpunkDialog(introContent, "逻辑，叛变！");
}

// Show settings dialog
async function showSettingsDialog(): Promise<void> {
  console.log('showSettingsDialog called');
  
  // Add event listeners to buttons before creating dialog
  setTimeout(() => {
    const deleteButton = document.getElementById('delete-all-saves');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        deleteAllSaves();
        location.reload(); // Reload page to reset state
      });
    }
    
    const toggleSoundButton = document.getElementById('toggle-sound');
    if (toggleSoundButton && gameEngine) {
      toggleSoundButton.addEventListener('click', () => {
        gameEngine.toggleSound();
        // Update button text
        toggleSoundButton.textContent = gameEngine.isSoundEnabled() ? '关闭音效' : '开启音效';
        // Update status text
        const statusElement = toggleSoundButton.parentElement?.previousElementSibling;
        if (statusElement) {
          statusElement.textContent = `- **音效状态**: ${gameEngine.isSoundEnabled() ? '开启' : '关闭'}`;
        }
      });
    }
  }, 100);

  const settingsContent = `
# 设置

## 存档管理

- **当前关卡**: ${levelManager.getCurrentLevel().name}
- **已保存关卡**: ${getAllSavedLevels().join(', ') || '无'}

## 音频设置

- **音效状态**: ${gameEngine && gameEngine.isSoundEnabled() ? '开启' : '关闭'}

<button id="toggle-sound" class="cyberpunk-dialog-button" style="margin-top: 10px; background: linear-gradient(45deg, #00aa00, #008800); box-shadow: 0 0 5px #00aa00;">${gameEngine && gameEngine.isSoundEnabled() ? '关闭音效' : '开启音效'}</button>

## 操作选项

你可以选择删除所有存档数据，这将清除所有关卡进度和保存的代码。

> ⚠️ 注意：此操作不可撤销

<button id="delete-all-saves" class="cyberpunk-dialog-button" style="margin-top: 15px; background: linear-gradient(45deg, #ff4444, #cc0000); box-shadow: 0 0 5px #ff4444;">删除所有存档</button>

---

## 素材声明

**素材音乐**  
机器人、迷宫、音乐素材来源于 [Kenney.nl](https://kenney.nl) (Creative Commons CC0)
`;

  console.log('Calling showCyberpunkDialog with content:', settingsContent);
  await showCyberpunkDialog(settingsContent, "关闭");
  console.log('showCyberpunkDialog completed');
}

// Get all saved levels
function getAllSavedLevels(): string[] {
  const savedLevels: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('level_') && key.endsWith('_code')) {
      const levelId = key.replace('level_', '').replace('_code', '');
      const level = levelManager.getLevelById(levelId);
      if (level) {
        savedLevels.push(level.name);
      }
    }
  }
  return savedLevels;
}

// Delete all saves
function deleteAllSaves(): void {
  // Clear level progress
  localStorage.removeItem('currentLevelId');
  
  // Clear intro flag so user will see intro again
  localStorage.removeItem('hasSeenIntro');
  
  // Clear all level codes and completion flags
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('level_') && (key.endsWith('_code') || key.endsWith('_completed'))) {
      localStorage.removeItem(key);
    }
  }
}

// Game execution functions that will be called from Blockly
// These functions wrap the GameEngine methods with proper async handling
const executionContext = {
  // Movement functions
  moveForward: async () => {
    if (gameEngine) {
      await gameEngine.moveForward();
    }
  },
  turnLeft: async () => {
    if (gameEngine) {
      await gameEngine.turnLeft();
    }
  },
  turnRight: async () => {
    if (gameEngine) {
      await gameEngine.turnRight();
    }
  },
  attack: async () => {
    if (gameEngine) {
      await gameEngine.attack();
    }
  },
  faceEnemy: async () => {
    if (gameEngine) {
      await gameEngine.faceEnemy();
    }
  },
  moveToPosition: async (x: number, y: number) => {
    if (gameEngine) {
      await gameEngine.moveToPosition(x, y);
    }
  },
  moveToNearestEnemy: async () => {
    if (gameEngine) {
      await gameEngine.moveToNearestEnemy();
    }
  },
  
  // Sensing functions
  isEnemyAdjacent: () => {
    return gameEngine ? gameEngine.isEnemyAdjacent() : false;
  },
  getEnemyX: () => {
    return gameEngine ? gameEngine.getEnemyX() : 0;
  },
  getEnemyY: () => {
    return gameEngine ? gameEngine.getEnemyY() : 0;
  },
  getPosition: () => {
    return gameEngine ? gameEngine.getCurrentPosition() : { x: 0, y: 0 };
  },
  getXPosition: () => {
    return gameEngine ? gameEngine.getXPosition() : 0;
  },
  getYPosition: () => {
    return gameEngine ? gameEngine.getYPosition() : 0;
  },
  getPlayerHealth: () => {
    return gameEngine ? gameEngine.getPlayerHealth() : 0;
  },
  getPlayerMaxHealth: () => {
    return gameEngine ? gameEngine.getPlayerMaxHealth() : 6;
  },
  
  // Communication functions
  sayMessage: async (message: string, duration: number) => {
    if (gameEngine) {
      await gameEngine.sayMessage(message, duration);
    }
  }
};

// Debug function to automatically complete current level
(window as any).debug_skip = function() {
  console.log('Debug: Auto-completing current level');
  if (gameEngine) {
    // Simulate level completion by setting all conditions to met
    const currentLevel = levelManager.getCurrentLevel();
    
    // Collect all coins
    if (currentLevel.coins) {
      currentLevel.coins.forEach(coin => {
        const coinKey = `${coin.x},${coin.y}`;
        (gameEngine as any).collectedCoins.add(coinKey);
      });
    }
    
    // Defeat all enemies
    if (currentLevel.enemies) {
      (gameEngine as any).defeatedEnemies = currentLevel.enemies.length;
      (gameEngine as any).enemies.forEach((enemy: any) => {
        enemy.health = 0;
      });
    }
    
    // Move robot to goal position
    if (currentLevel.winCondition.goal) {
      (gameEngine as any).robot.position.x = currentLevel.winCondition.goal.x;
      (gameEngine as any).robot.position.y = currentLevel.winCondition.goal.y;
    }
    
    // Trigger win condition check
    (gameEngine as any).checkWinCondition();
    
    // Force trigger level completion handler
    handleLevelComplete();
    
    console.log('Debug: Level completion conditions set');
  } else {
    console.error('Game engine not initialized');
  }
};

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  init().catch(console.error);
});